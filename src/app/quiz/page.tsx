"use client";
import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

type Question = {
  id: string;
  category: string;
  question: string;
  options: string[];
  correct_option: number;
  level: string;
  score: number;
  recommendation: string;
  image_url?: string;
  question_time_limit?: number | null; // для таймера на вопрос
};

export default function QuizPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [questions, setQuestions] = useState<Question[]>([]);
  const [loading, setLoading] = useState(true);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<number[]>([]);
  const [showResult, setShowResult] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Таймеры
  const [quizTimeLimit, setQuizTimeLimit] = useState<number | null>(null);
  const [quizSecondsLeft, setQuizSecondsLeft] = useState<number | null>(null);

  const [questionSecondsLeft, setQuestionSecondsLeft] = useState<number | null>(null);
  const questionTimerRef = useRef<NodeJS.Timeout | null>(null);

  // --- Получаем настройки времени на квиз
  useEffect(() => {
    if (authLoading || !user) return;
    async function fetchQuizSettings() {
      const { data } = await supabase.from("quiz_settings").select("quiz_time_limit").single();
      if (data && data.quiz_time_limit) {
        setQuizTimeLimit(data.quiz_time_limit);
        setQuizSecondsLeft(data.quiz_time_limit);
      }
    }
    fetchQuizSettings();
  }, [authLoading, user]);

  // --- Получаем вопросы
  useEffect(() => {
    if (authLoading || !user) return;
    async function loadQuestions() {
      setLoading(true);
      const { data } = await supabase
        .from("questions")
        .select("*")
        .order("created_at", { ascending: true });
      if (data) {
        setQuestions(
          data.map((q) => ({
            ...q,
            options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
          }))
        );
        setAnswers(Array(data.length).fill(-1));
      }
      setLoading(false);
    }
    loadQuestions();
  }, [authLoading, user]);

  // Таймер на весь квиз
  useEffect(() => {
    if (quizSecondsLeft == null || showResult) return;
    if (quizSecondsLeft <= 0) {
      setShowResult(true);
      return;
    }
    const interval = setInterval(() => setQuizSecondsLeft((s) => (s ? s - 1 : 0)), 1000);
    return () => clearInterval(interval);
  }, [quizSecondsLeft, showResult]);

  // Таймер на вопрос
  useEffect(() => {
    if (!questions.length || showResult) return;

    const limit = questions[step]?.question_time_limit;
    setQuestionSecondsLeft(limit ?? null);

    // Сбросим предыдущий таймер
    if (questionTimerRef.current) clearInterval(questionTimerRef.current);

    if (limit && limit > 0) {
      questionTimerRef.current = setInterval(() => {
        setQuestionSecondsLeft((s) => {
          if (s === null) return null;
          if (s <= 1) {
            clearInterval(questionTimerRef.current!);
            handleAutoNext();
            return 0;
          }
          return s - 1;
        });
      }, 1000);
    }

    return () => {
      if (questionTimerRef.current) clearInterval(questionTimerRef.current);
    };
    // eslint-disable-next-line
  }, [step, questions, showResult]);

  // Если изменился вопрос вручную — ставим его лимит
  function handleAutoNext() {
    if (step < questions.length - 1) setStep(step + 1);
    else setShowResult(true);
  }

  if (authLoading || loading || !user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <motion.div
          className="w-full max-w-xl bg-gray-200 rounded-2xl h-8 mb-8 animate-pulse"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        />
        <div className="w-full max-w-xl space-y-4">
          {[1, 2, 3].map((i) => (
            <motion.div
              key={i}
              className="h-12 bg-gray-100 rounded-xl animate-pulse"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.08 * i }}
            />
          ))}
        </div>
      </div>
    );
  }

  if (!questions.length)
    return <div className="text-center py-20">No questions found.</div>;

  const current = questions[step];

  const handleSelect = (idx: number) => {
    const updated = [...answers];
    updated[step] = idx;
    setAnswers(updated);
  };

  const handleNext = () => {
    if (step < questions.length - 1) setStep(step + 1);
    else setShowResult(true);
  };

  const handleBack = () => setStep((s) => Math.max(0, s - 1));

  const score = questions.reduce(
    (acc, q, i) => (answers[i] === q.correct_option ? acc + q.score : acc),
    0
  );

  const details = questions.map((q, i) => ({
    question: q.question,
    options: q.options,
    userAnswer: answers[i],
    correct: q.correct_option,
    isCorrect: answers[i] === q.correct_option,
    recommendation: q.recommendation,
  }));

  // Сохранение результатов
  const handleSubmitResult = async () => {
    if (!user) return;
    setSubmitting(true);
    const { error } = await supabase.from("results").insert([
      {
        user_id: user.id,
        score,
        answers: details,
      },
    ]);
    setSubmitting(false);

    if (error) {
      alert("Ошибка сохранения результата: " + error.message);
    }
  };

  // Stepper - кружочки прогресса
  function Stepper() {
    return (
      <div className="flex justify-center gap-3 mb-7 mt-1">
        {questions.map((_, i) => (
          <button
            key={i}
            type="button"
            aria-label={`Step ${i + 1}`}
            className={
              "w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs border-2 focus:outline-none transition-all duration-150 " +
              (i === step
                ? "bg-blue-700 border-blue-700 text-white scale-110 shadow-md"
                : answers[i] !== -1
                ? "bg-blue-100 border-blue-400 text-blue-700"
                : "bg-gray-200 border-gray-300 text-gray-400")
            }
            style={{ cursor: i <= step ? "pointer" : "not-allowed" }}
            onClick={() => i <= step && setStep(i)}
            tabIndex={0}
          >
            {i + 1}
          </button>
        ))}
      </div>
    );
  }

  // Таймеры UI
  function TimerBlock() {
    // Если оба таймера есть — показывать оба
    return (
      <div className="flex gap-4 mb-2 items-center justify-center">
        {quizSecondsLeft != null && (
          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-blue-50 text-blue-700 font-bold text-sm">
            ⏰ Квиз: {Math.floor(quizSecondsLeft / 60)
              .toString()
              .padStart(2, "0")}
            :{(quizSecondsLeft % 60).toString().padStart(2, "0")}
          </span>
        )}
        {current.question_time_limit != null && (
          <span className="inline-flex items-center px-3 py-1 rounded-xl bg-green-50 text-green-800 font-bold text-sm">
            🕑 Вопрос: {questionSecondsLeft !== null
              ? `${questionSecondsLeft} сек`
              : "—"}
          </span>
        )}
      </div>
    );
  }

  if (showResult) {
    return (
      <motion.div
        className="max-w-2xl mx-auto p-6 mt-8"
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <div className="flex flex-col items-center">
          <motion.h1
            className="text-3xl font-bold mb-6 text-blue-700"
            initial={{ scale: 0.9 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.2 }}
          >
            Test Completed!
          </motion.h1>
          <motion.div
            className="mb-8 text-xl font-bold"
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            Your score: <span className="text-blue-700">{score}</span> /{" "}
            {questions.reduce((a, q) => a + q.score, 0)}
          </motion.div>
          <motion.div
            className="w-full mb-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.45 }}
          >
            <div className="font-bold mb-2">Recommendations:</div>
            <ul className="space-y-2">
              {questions.map((q, i) =>
                answers[i] !== q.correct_option ? (
                  <li
                    key={q.id}
                    className="bg-red-50 border-l-4 border-red-400 p-3 rounded"
                  >
                    <div className="font-semibold text-red-800">
                      {q.question}
                    </div>
                    <div>
                      Your answer:{" "}
                      <span className="text-red-700">
                        {q.options[answers[i]] ?? "No answer"}
                      </span>
                    </div>
                    <div>
                      Correct:{" "}
                      <span className="text-green-700">
                        {q.options[q.correct_option]}
                      </span>
                    </div>
                    <div className="text-gray-600 text-sm">
                      {q.recommendation}
                    </div>
                  </li>
                ) : null
              )}
            </ul>
          </motion.div>
          {user && (
            <button
              className="px-8 py-2 bg-blue-700 text-white font-bold rounded-xl shadow transition hover:bg-blue-800"
              onClick={handleSubmitResult}
              disabled={submitting}
            >
              {submitting ? "Saving..." : "Save result to profile"}
            </button>
          )}
          <button
            className="mt-4 px-8 py-2 bg-gray-200 rounded-xl shadow"
            onClick={() => {
              setShowResult(false);
              setStep(0);
              setAnswers(Array(questions.length).fill(-1));
              setQuizSecondsLeft(quizTimeLimit);
            }}
          >
            Retake Quiz
          </button>
        </div>
      </motion.div>
    );
  }

  // Прогресс-бар
  const progress = Math.round(((step + 1) / questions.length) * 100);

  return (
    <motion.div
      className="max-w-2xl mx-auto p-6"
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
    >
      <Stepper />
      {/* Таймеры */}
      <TimerBlock />
      {/* Progress Bar */}
      <div className="mb-6">
        <div className="mb-2 flex justify-between items-center">
          <span className="font-semibold text-gray-600">
            Question {step + 1} / {questions.length}
          </span>
          <span className="text-sm text-gray-500">
            Category: {current.category} | Level: {current.level}
          </span>
        </div>
        <div className="w-full h-3 bg-gray-200 rounded-xl overflow-hidden">
          <motion.div
            className="h-3 bg-blue-700"
            initial={{ width: 0 }}
            animate={{ width: `${progress}%` }}
            transition={{ duration: 0.3 }}
          />
        </div>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={step}
          initial={{ x: 70, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: -70, opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Картинка вопроса, если есть */}
          {current.image_url && (
            <div className="flex justify-center mb-5">
              <img
                src={current.image_url}
                alt="question"
                className="max-h-56 rounded-lg shadow"
                style={{ maxWidth: "100%", objectFit: "contain" }}
              />
            </div>
          )}
          <h1 className="text-2xl font-bold mb-5">{current.question}</h1>
          <ul>
            {current.options.map((opt, idx) => (
              <li key={idx} className="mb-3">
                <button
                  className={`w-full text-left p-4 rounded-xl border transition font-semibold
                  ${
                    answers[step] === idx
                      ? "bg-blue-100 border-blue-600"
                      : "hover:bg-gray-100 border-gray-300"
                  }`}
                  onClick={() => handleSelect(idx)}
                >
                  {opt}
                </button>
              </li>
            ))}
          </ul>
        </motion.div>
      </AnimatePresence>
      <div className="mt-10 flex justify-between">
        <button
          className="px-4 py-2 border rounded disabled:opacity-40"
          onClick={handleBack}
          disabled={step === 0}
        >
          Back
        </button>
        <button
          className="px-6 py-2 bg-blue-700 text-white rounded-xl font-bold disabled:opacity-40"
          onClick={handleNext}
          disabled={answers[step] === -1}
        >
          {step === questions.length - 1 ? "Finish" : "Next"}
        </button>
      </div>
    </motion.div>
  );
}
