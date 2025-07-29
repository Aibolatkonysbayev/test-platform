"use client";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "../../../../utils/supabaseClient";
import { useAuth } from "../../../AuthProvider";

type Quiz = {
  id: string;
  name: string;
  description: string | null;
  quiz_time_limit: number | null;
};

type Question = {
  id: string;
  question: string;
  category: string;
  level: string;
};

type QuizQuestion = {
  quiz_id: string;
  question_id: string;
  order: number | null;
};

export default function QuizEditPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { user, loading } = useAuth();

  const [quiz, setQuiz] = useState<Quiz | null>(null);
  const [allQuestions, setAllQuestions] = useState<Question[]>([]);
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [msg, setMsg] = useState("");
  const [quizName, setQuizName] = useState("");
  const [quizDescription, setQuizDescription] = useState("");
  const [quizTime, setQuizTime] = useState<number | null>(null);

  // Загрузка квиза и его вопросов
  useEffect(() => {
    if (!id || !user || user.role !== "admin") return;

    async function loadQuiz() {
      // Квиз
      const { data: quizData } = await supabase
        .from("quizzes")
        .select("*")
        .eq("id", id)
        .single();
      if (quizData) {
        setQuiz(quizData);
        setQuizName(quizData.name);
        setQuizDescription(quizData.description || "");
        setQuizTime(quizData.quiz_time_limit || null);
      }

      // Все вопросы
      const { data: allQs } = await supabase
        .from("questions")
        .select("id,question,category,level")
        .order("created_at", { ascending: true });

      setAllQuestions(allQs || []);

      // Вопросы этого квиза
      const { data: quizQs } = await supabase
        .from("quiz_questions")
        .select("quiz_id, question_id, order")
        .eq("quiz_id", id)
        .order("order", { ascending: true });

      setQuizQuestions(quizQs || []);
      setSelectedIds((quizQs || []).map((q) => q.question_id));
    }

    loadQuiz();
  }, [id, user]);

  // Сохраняем общие данные квиза
  async function handleSaveQuizInfo() {
    const { error } = await supabase
      .from("quizzes")
      .update({
        name: quizName,
        description: quizDescription,
        quiz_time_limit: quizTime,
      })
      .eq("id", id);
    if (!error) {
      setMsg("Квиз обновлён!");
    } else {
      setMsg("Ошибка обновления: " + error.message);
    }
  }

  // Добавить или убрать вопрос
  async function handleToggleQuestion(qid: string) {
    let newSelected: string[];
    if (selectedIds.includes(qid)) {
      // Удалить из квиза
      await supabase
        .from("quiz_questions")
        .delete()
        .eq("quiz_id", id)
        .eq("question_id", qid);
      newSelected = selectedIds.filter((x) => x !== qid);
    } else {
      // Добавить
      await supabase
        .from("quiz_questions")
        .insert([
          { quiz_id: id, question_id: qid, order: quizQuestions.length + 1 },
        ]);
      newSelected = [...selectedIds, qid];
    }
    setSelectedIds(newSelected);
    // Обновим quizQuestions для порядка
    const { data: quizQs } = await supabase
      .from("quiz_questions")
      .select("quiz_id, question_id, order")
      .eq("quiz_id", id)
      .order("order", { ascending: true });
    setQuizQuestions(quizQs || []);
  }

  // Сортировка (move up)
  async function moveUp(qid: string) {
    const idx = quizQuestions.findIndex((q) => q.question_id === qid);
    if (idx <= 0) return;
    const upper = quizQuestions[idx - 1];
    const current = quizQuestions[idx];
    // Меняем местами order
    await supabase.from("quiz_questions").update({ order: upper.order })
      .eq("quiz_id", id).eq("question_id", current.question_id);
    await supabase.from("quiz_questions").update({ order: current.order })
      .eq("quiz_id", id).eq("question_id", upper.question_id);
    // Перезагрузим
    const { data: quizQs } = await supabase
      .from("quiz_questions")
      .select("quiz_id, question_id, order")
      .eq("quiz_id", id)
      .order("order", { ascending: true });
    setQuizQuestions(quizQs || []);
    setMsg("Порядок обновлён");
  }

  if (loading || user?.role !== "admin") return <div>Loading...</div>;

  if (!quiz) return <div>Квиз не найден</div>;

  return (
    <div className="max-w-3xl mx-auto py-10">
      <h1 className="text-2xl font-bold text-blue-700 mb-4">
        Редактирование квиза
      </h1>
      {msg && <div className="mb-4 text-green-700">{msg}</div>}

      {/* Форма данных квиза */}
      <div className="bg-white rounded-xl p-6 shadow mb-8">
        <label className="block font-bold mb-2">Название:</label>
        <input
          className="border p-2 rounded w-full mb-4"
          value={quizName}
          onChange={(e) => setQuizName(e.target.value)}
        />
        <label className="block font-bold mb-2">Описание:</label>
        <textarea
          className="border p-2 rounded w-full mb-4"
          value={quizDescription}
          onChange={(e) => setQuizDescription(e.target.value)}
          rows={2}
        />
        <label className="block font-bold mb-2">Лимит времени (сек):</label>
        <input
          type="number"
          className="border p-2 rounded w-40 mb-4"
          value={quizTime ?? ""}
          onChange={(e) =>
            setQuizTime(e.target.value ? Number(e.target.value) : null)
          }
        />
        <button
          onClick={handleSaveQuizInfo}
          className="bg-blue-700 text-white px-6 py-2 rounded shadow hover:bg-blue-800"
        >
          Сохранить
        </button>
      </div>

      {/* Список вопросов */}
      <div className="bg-white rounded-xl p-6 shadow">
        <h2 className="text-xl font-bold mb-4">Вопросы в этом квизе</h2>
        {quizQuestions.length === 0 && (
          <div className="mb-3 text-gray-500">Пока не добавлено ни одного вопроса.</div>
        )}
        <ol className="mb-6 space-y-2">
          {quizQuestions.map((q, idx) => {
            const question = allQuestions.find((qq) => qq.id === q.question_id);
            return (
              <li
                key={q.question_id}
                className="flex items-center gap-2 border rounded p-2 bg-blue-50"
              >
                <span className="font-bold">{idx + 1}.</span>
                <span>{question?.question}</span>
                <button
                  onClick={() => moveUp(q.question_id)}
                  className="ml-auto px-2 py-1 rounded text-sm bg-gray-200 hover:bg-gray-300"
                  disabled={idx === 0}
                  title="Переместить вверх"
                >
                  ↑
                </button>
                <button
                  onClick={() => handleToggleQuestion(q.question_id)}
                  className="px-2 py-1 rounded text-sm bg-red-200 text-red-800 hover:bg-red-300"
                >
                  Удалить
                </button>
              </li>
            );
          })}
        </ol>

        <h3 className="font-bold mb-2">Добавить вопросы в квиз:</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          {allQuestions.map((q) => (
            <div
              key={q.id}
              className={`border rounded p-2 flex items-center gap-2 ${
                selectedIds.includes(q.id) ? "bg-green-50" : ""
              }`}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(q.id)}
                onChange={() => handleToggleQuestion(q.id)}
                id={`addq_${q.id}`}
              />
              <label htmlFor={`addq_${q.id}`}>
                <span className="font-semibold">{q.question}</span>
                <span className="ml-2 text-xs text-gray-500">
                  ({q.category}, {q.level})
                </span>
              </label>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
