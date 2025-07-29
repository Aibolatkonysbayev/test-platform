"use client";
import { useState, useEffect, ChangeEvent } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";
import Papa from "papaparse";

// Тип вопроса
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
  question_time_limit?: number | null;
};

const emptyQuestion: Omit<Question, "id"> = {
  category: "",
  question: "",
  options: ["", "", "", ""],
  correct_option: 0,
  level: "",
  score: 1,
  recommendation: "",
  image_url: "",
  question_time_limit: null,
};

export default function AdminPage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  const [questions, setQuestions] = useState<Question[]>([]);
  const [form, setForm] = useState(emptyQuestion);
  const [editId, setEditId] = useState<string | null>(null);
  const [refresh, setRefresh] = useState(false);
  const [msg, setMsg] = useState("");
  const [imgUploading, setImgUploading] = useState(false);

  const [quizLimit, setQuizLimit] = useState<number | null>(null);
  const [quizLimitSaving, setQuizLimitSaving] = useState(false);

  // Auth guard
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Quiz time limit
  useEffect(() => {
    supabase
      .from("quiz_settings")
      .select("quiz_time_limit")
      .single()
      .then(({ data }) => {
        if (data) {
          setQuizLimit(data.quiz_time_limit);
        }
      });
  }, []);

  const handleQuizLimitSave = async () => {
    setQuizLimitSaving(true);
    await supabase
      .from("quiz_settings")
      .upsert({ id: 1, quiz_time_limit: quizLimit }, { onConflict: "id" });
    setQuizLimitSaving(false);
    setMsg("Общее время сохранено!");
  };

  // Load questions
  useEffect(() => {
    if (!user || user.role !== "admin") return;
    supabase
      .from("questions")
      .select("*")
      .order("created_at", { ascending: true })
      .then(({ data }) => {
        if (data)
          setQuestions(
            data.map((q: any) => ({
              ...q,
              options: Array.isArray(q.options) ? q.options : JSON.parse(q.options),
            }))
          );
      });
  }, [user, refresh]);

  // Input handling
  const handleChange = (field: string, value: any) => {
    setForm((f) => ({
      ...f,
      [field]: value,
    }));
  };

  const handleOptionChange = (idx: number, value: string) => {
    const opts = [...form.options];
    opts[idx] = value;
    setForm((f) => ({ ...f, options: opts }));
  };

  // Upload image (Supabase Storage)
  const handleImageUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.[0]) return;
    const file = e.target.files[0];
    const filename = `${Date.now()}_${file.name.replace(/\s+/g, "_")}`;
    setImgUploading(true);

    const { error } = await supabase.storage
      .from("question-images")
      .upload(filename, file);

    if (error) {
      setMsg("Image upload error");
      setImgUploading(false);
      return;
    }
    const url = supabase.storage
      .from("question-images")
      .getPublicUrl(filename).data.publicUrl;
    setForm((f) => ({ ...f, image_url: url }));
    setImgUploading(false);
    setMsg("Image uploaded!");
  };

  // CSV шаблон скачивание
  const handleDownloadTemplate = () => {
    const csvTemplate =
      "category,question,option1,option2,option3,option4,correct_option,level,score,recommendation,question_time_limit\n" +
      "HSSE,What is PPE?,Gloves,Helmet,Glasses,All of these,3,Easy,1,\"Use PPE for safety\",30\n";
    const blob = new Blob([csvTemplate], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "example_questions.csv";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // CSV импорт
  const handleCsvImport = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: async (results: Papa.ParseResult<any>) => {
        const rows = results.data as any[];
        if (!Array.isArray(rows) || !rows.length) {
          setMsg("Файл пустой или некорректный.");
          return;
        }
        const formatted = rows.map((row) => ({
          category: row.category || "",
          question: row.question || "",
          options: JSON.stringify([
            row.option1 || "",
            row.option2 || "",
            row.option3 || "",
            row.option4 || "",
          ]),
          correct_option: Number(row.correct_option) || 0,
          level: row.level || "",
          score: Number(row.score) || 1,
          recommendation: row.recommendation || "",
          question_time_limit: row.question_time_limit
            ? Number(row.question_time_limit)
            : null,
        }));
        const { error } = await supabase.from("questions").insert(formatted);
        if (!error) {
          setMsg(`Импортировано: ${formatted.length}`);
          setRefresh((r) => !r);
        } else {
          setMsg("Ошибка при импорте: " + error.message);
        }
      },
      error: (err) => setMsg("Ошибка чтения файла: " + err.message),
    });
  };

  // Form submit
  const handleSubmit = async (e: any) => {
    e.preventDefault();
    if (form.options.some((o) => !o.trim()))
      return setMsg("All options required");
    setMsg("");
    const questionData = {
      ...form,
      options: JSON.stringify(form.options),
      question_time_limit:
        form.question_time_limit != null ? Number(form.question_time_limit) : null,
    };
    if (editId) {
      const { error } = await supabase
        .from("questions")
        .update(questionData)
        .eq("id", editId);
      if (!error) {
        setMsg("Updated!");
        setEditId(null);
        setForm(emptyQuestion);
        setRefresh((r) => !r);
      }
    } else {
      const { error } = await supabase
        .from("questions")
        .insert([questionData]);
      if (!error) {
        setMsg("Added!");
        setForm(emptyQuestion);
        setRefresh((r) => !r);
      }
    }
  };

  const handleDelete = async (id: string) => {
    if (window.confirm("Delete this question?")) {
      await supabase.from("questions").delete().eq("id", id);
      setRefresh((r) => !r);
    }
  };

  const handleEdit = (q: Question) => {
    setEditId(q.id);
    setForm({
      ...q,
      question_time_limit:
        q.question_time_limit != null ? Number(q.question_time_limit) : null,
    });
  };

  const handleCancel = () => {
    setEditId(null);
    setForm(emptyQuestion);
    setMsg("");
  };

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex justify-center items-center h-64 text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto py-10">
      {/* Кнопки для импорта */}
      <div className="flex gap-4 mb-4">
        <button
          className="bg-green-700 text-white px-4 py-2 rounded shadow"
          onClick={handleDownloadTemplate}
        >
          Скачать шаблон для импорта CSV
        </button>
        <label className="bg-blue-700 text-white px-4 py-2 rounded shadow cursor-pointer">
          Импортировать вопросы (CSV)
          <input
            type="file"
            accept=".csv,text/csv"
            onChange={handleCsvImport}
            className="hidden"
          />
        </label>
      </div>

      {/* Настройки времени квиза */}
      <div className="bg-white border rounded-xl p-4 mb-8 shadow flex items-center gap-6 flex-wrap">
        <label className="font-bold">
          Общее время на квиз (сек):
          <input
            type="number"
            min={0}
            className="ml-2 border rounded p-2 w-32"
            value={quizLimit ?? ""}
            onChange={e => setQuizLimit(Number(e.target.value))}
          />
        </label>
        <button
          className="bg-blue-700 text-white px-4 py-2 rounded shadow"
          onClick={handleQuizLimitSave}
          disabled={quizLimitSaving}
        >
          {quizLimitSaving ? "Saving..." : "Сохранить"}
        </button>
      </div>

      <div className="mb-6 text-green-700">{msg}</div>

      {/* --- Форма вопроса --- */}
      <motion.div
        className="bg-white rounded-2xl shadow-lg border border-gray-200 p-8 mb-10"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        <h1 className="text-2xl font-bold mb-6 text-blue-700">
          Admin Panel — Manage Questions
        </h1>
        <form onSubmit={handleSubmit} className="space-y-4" autoComplete="off">
          <div className="flex gap-4 flex-wrap">
            <input
              className="border border-gray-300 rounded-xl p-3 w-full md:w-1/3 focus:ring-2 focus:ring-blue-300 outline-none transition"
              placeholder="Category"
              value={form.category}
              onChange={(e) => handleChange("category", e.target.value)}
              required
            />
            <input
              className="border border-gray-300 rounded-xl p-3 w-full md:w-1/3 focus:ring-2 focus:ring-blue-300 outline-none transition"
              placeholder="Level"
              value={form.level}
              onChange={(e) => handleChange("level", e.target.value)}
            />
            <input
              className="border border-gray-300 rounded-xl p-3 w-full md:w-1/6 focus:ring-2 focus:ring-blue-300 outline-none transition"
              type="number"
              placeholder="Score"
              value={form.score}
              min={1}
              onChange={(e) => handleChange("score", Number(e.target.value))}
            />
            <input
              className="border border-gray-300 rounded-xl p-3 w-full md:w-1/6 focus:ring-2 focus:ring-blue-300 outline-none transition"
              type="number"
              placeholder="Время на вопрос (сек)"
              value={form.question_time_limit ?? ""}
              min={0}
              onChange={(e) =>
                handleChange(
                  "question_time_limit",
                  e.target.value ? Number(e.target.value) : null
                )
              }
            />
          </div>
          <textarea
            className="border border-gray-300 rounded-xl p-3 w-full focus:ring-2 focus:ring-blue-300 outline-none transition"
            placeholder="Question text"
            value={form.question}
            onChange={(e) => handleChange("question", e.target.value)}
            required
            rows={2}
          />
          {/* Upload image */}
          <div className="flex items-center gap-4">
            <input
              type="file"
              accept="image/*"
              className="block"
              onChange={handleImageUpload}
              disabled={imgUploading}
            />
            {form.image_url && (
              <img
                src={form.image_url}
                alt="Question"
                className="w-24 h-16 object-contain rounded shadow"
              />
            )}
            {imgUploading && <span>Uploading...</span>}
          </div>
          <div className="flex gap-2 flex-wrap">
            {form.options.map((opt, idx) => (
              <input
                key={idx}
                className="border border-gray-300 rounded-xl p-3 w-full md:w-1/4 focus:ring-2 focus:ring-blue-300 outline-none transition"
                placeholder={`Option ${idx + 1}`}
                value={opt}
                onChange={(e) => handleOptionChange(idx, e.target.value)}
                required
              />
            ))}
          </div>
          <div className="flex gap-4 items-center flex-wrap">
            <label className="flex items-center">
              Correct option:
              <select
                className="ml-2 border border-gray-300 p-2 rounded-xl focus:ring-2 focus:ring-blue-300 outline-none transition"
                value={form.correct_option}
                onChange={(e) =>
                  handleChange("correct_option", Number(e.target.value))
                }
              >
                {form.options.map((_, i) => (
                  <option key={i} value={i}>
                    {i + 1}
                  </option>
                ))}
              </select>
            </label>
            <input
              className="border border-gray-300 rounded-xl p-3 flex-1 focus:ring-2 focus:ring-blue-300 outline-none transition"
              placeholder="Recommendation"
              value={form.recommendation}
              onChange={(e) => handleChange("recommendation", e.target.value)}
            />
          </div>
          <div className="flex gap-2 mt-2 items-center">
            <button
              className="bg-blue-700 hover:bg-blue-800 text-white px-8 py-2 rounded-xl font-bold shadow transition"
              type="submit"
            >
              {editId ? "Save" : "Add"}
            </button>
            {editId && (
              <button
                className="bg-gray-500 hover:bg-gray-600 text-white px-8 py-2 rounded-xl font-bold shadow transition"
                type="button"
                onClick={handleCancel}
              >
                Cancel
              </button>
            )}
            {msg && <span className="text-green-700 ml-4">{msg}</span>}
          </div>
        </form>
      </motion.div>

      {/* --- Отображение всех вопросов --- */}
      <h2 className="text-lg font-bold mb-4">
        Всего вопросов: {questions.length}
      </h2>
      <ul className="space-y-4">
        <AnimatePresence>
          {questions.map((q, idx) => (
            <motion.li
              key={q.id}
              className="bg-white p-5 rounded-2xl shadow border border-gray-200"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
            >
              <div className="flex justify-between items-center">
                <b>
                  {idx + 1}. {q.question}
                </b>
                <div className="flex gap-2">
                  <button
                    className="text-blue-700 hover:text-blue-900 underline font-medium"
                    onClick={() => handleEdit(q)}
                  >
                    Edit
                  </button>
                  <button
                    className="text-red-700 hover:text-red-900 underline font-medium"
                    onClick={() => handleDelete(q.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
              {/* Image preview */}
              {q.image_url && (
                <div className="my-3">
                  <img
                    src={q.image_url}
                    alt="Question"
                    className="w-44 h-32 object-contain rounded shadow"
                  />
                </div>
              )}
              <div className="ml-4 mt-2">
                {q.options.map((opt, i) => (
                  <div
                    key={i}
                    className={
                      i === q.correct_option
                        ? "text-green-700 font-bold"
                        : "text-gray-700"
                    }
                  >
                    {i + 1}. {opt}
                  </div>
                ))}
                <div className="text-gray-500 text-sm mt-1">
                  Category: {q.category} | Level: {q.level} | Score: {q.score}
                  {q.question_time_limit
                    ? ` | Time: ${q.question_time_limit}s`
                    : ""}
                </div>
                <div className="text-gray-400 text-xs">
                  Recommendation: {q.recommendation}
                </div>
              </div>
            </motion.li>
          ))}
        </AnimatePresence>
      </ul>
    </div>
  );
}
