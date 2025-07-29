"use client";
import { useEffect, useState } from "react";
import { supabase } from "../../../utils/supabaseClient";
import Link from "next/link";
import { useAuth } from "../../AuthProvider";

type Quiz = {
  id: string;
  name: string;
  description: string | null;
  quiz_time_limit: number | null;
  created_at: string;
  question_count?: number;
};

export default function QuizzesPage() {
  const { user, loading } = useAuth();
  const [quizzes, setQuizzes] = useState<Quiz[]>([]);
  const [loadingQuizzes, setLoadingQuizzes] = useState(true);
  const [msg, setMsg] = useState("");

  useEffect(() => {
    if (!user || user.role !== "admin") return;

    async function fetchQuizzes() {
      setLoadingQuizzes(true);

      // Получаем все квизы
      const { data: quizzesData } = await supabase
        .from("quizzes")
        .select("*")
        .order("created_at", { ascending: false });

      // Получаем все quiz_questions (только quiz_id)
      const { data: quizQuestions } = await supabase
        .from("quiz_questions")
        .select("quiz_id");

      // Считаем количество вопросов в каждом квизе
      const quizQuestionCount: Record<string, number> = {};
      quizQuestions?.forEach((qq) => {
        quizQuestionCount[qq.quiz_id] = (quizQuestionCount[qq.quiz_id] || 0) + 1;
      });

      // Собираем массив с количеством
      const withCount = quizzesData?.map((quiz: any) => ({
        ...quiz,
        question_count: quizQuestionCount[quiz.id] || 0,
      })) || [];

      setQuizzes(withCount);
      setLoadingQuizzes(false);
    }

    fetchQuizzes();
  }, [user]);

  // Удалить квиз
  async function handleDelete(id: string) {
    if (!window.confirm("Удалить этот квиз?")) return;
    const { error } = await supabase.from("quizzes").delete().eq("id", id);
    if (!error) {
      setMsg("Квиз удалён");
      setQuizzes((prev) => prev.filter((q) => q.id !== id));
    } else {
      setMsg("Ошибка при удалении: " + error.message);
    }
  }

  // Создать новый квиз (минимально)
  async function handleCreate() {
    const name = prompt("Введите название квиза:");
    if (!name) return;
    const { data, error } = await supabase
      .from("quizzes")
      .insert([{ name }])
      .select()
      .single();
    if (!error && data) {
      setQuizzes((prev) => [data, ...prev]);
      setMsg("Квиз создан");
    } else {
      setMsg("Ошибка при создании: " + error?.message);
    }
  }

  if (loading || user?.role !== "admin") {
    return <div className="text-center py-10">Loading...</div>;
  }

  return (
    <div className="max-w-2xl mx-auto py-10">
      <div className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold text-blue-700">Квизы</h1>
        <button
          onClick={handleCreate}
          className="bg-blue-700 text-white px-4 py-2 rounded shadow hover:bg-blue-800 transition"
        >
          + Новый квиз
        </button>
      </div>
      {msg && <div className="mb-4 text-green-700">{msg}</div>}
      {loadingQuizzes ? (
        <div>Загрузка...</div>
      ) : (
        <ul className="space-y-4">
          {quizzes.map((quiz) => (
            <li
              key={quiz.id}
              className="bg-white rounded-xl shadow border px-6 py-4 flex justify-between items-center"
            >
              <div>
                <div className="text-xl font-bold">{quiz.name}</div>
                <div className="text-gray-600">{quiz.description || "—"}</div>
                <div className="text-sm text-gray-500">
                  Вопросов: {quiz.question_count}{" "}
                  {quiz.quiz_time_limit
                    ? `| Время: ${quiz.quiz_time_limit} сек`
                    : ""}
                </div>
              </div>
              <div className="flex gap-3">
                <Link
                  href={`/admin/quizzes/${quiz.id}`}
                  className="bg-blue-100 px-3 py-1 rounded text-blue-700 font-bold hover:bg-blue-200"
                >
                  Редактировать
                </Link>
                <button
                  onClick={() => handleDelete(quiz.id)}
                  className="bg-red-100 px-3 py-1 rounded text-red-700 font-bold hover:bg-red-200"
                >
                  Удалить
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}
      {quizzes.length === 0 && !loadingQuizzes && (
        <div className="mt-6 text-gray-500">Нет ни одного квиза.</div>
      )}
    </div>
  );
}
