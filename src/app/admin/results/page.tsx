"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../../utils/supabaseClient";
import { useAuth } from "../../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

export default function AdminResultsPage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<any[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  // Защита — только для админа
  useEffect(() => {
    if (!loading && (!user || user.role !== "admin")) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  // Загрузка всех результатов + профилей (email)
  useEffect(() => {
    if (!user || user.role !== "admin") return;

    async function fetchResultsAndProfiles() {
      const { data: results } = await supabase
        .from("results")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: profiles } = await supabase
        .from("profiles")
        .select("id, email");

      // Совмещаем email в результаты
      const mapped = (results || []).map((r) => ({
        ...r,
        email: (profiles || []).find((p) => p.id === r.user_id)?.email || r.user_id,
      }));

      setResults(mapped);
    }

    fetchResultsAndProfiles();
  }, [user]);

  if (loading || !user || user.role !== "admin") {
    return (
      <div className="flex justify-center items-center h-60 text-xl">
        Loading...
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto py-8">
      <motion.h1
        className="text-2xl font-bold mb-8 text-blue-700"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        All Test Results
      </motion.h1>
      <div className="overflow-x-auto rounded-2xl shadow-md border border-gray-200 bg-white">
        <table className="min-w-full text-base">
          <thead>
            <tr className="bg-gray-50 border-b">
              <th className="px-4 py-3 text-left font-bold text-gray-700">Date</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">User Email</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700">Score</th>
              <th className="px-4 py-3 text-left font-bold text-gray-700"></th>
            </tr>
          </thead>
          <tbody>
            <AnimatePresence>
              {results.map((r) => (
                <motion.tr
                  key={r.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  transition={{ duration: 0.25 }}
                  className="border-b hover:bg-blue-50 transition"
                >
                  <td className="px-4 py-3">{new Date(r.created_at).toLocaleString()}</td>
                  <td className="px-4 py-3">{r.email}</td>
                  <td className="px-4 py-3 font-bold text-blue-700">
                    {r.score}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => setExpanded(expanded === r.id ? null : r.id)}
                      className="bg-blue-700 hover:bg-blue-800 text-white px-5 py-2 rounded font-bold shadow transition"
                    >
                      {expanded === r.id ? "Hide" : "Details"}
                    </button>
                  </td>
                </motion.tr>
              ))}
            </AnimatePresence>
          </tbody>
        </table>
      </div>

      {/* Детали по каждому результату */}
      <AnimatePresence>
        {results.map(
          (r) =>
            expanded === r.id && (
              <motion.div
                key={r.id}
                className="bg-white rounded-2xl shadow-md border border-gray-200 mt-7 mb-5 p-8"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.5 }}
              >
                <h2 className="text-xl font-bold mb-4 text-blue-700">
                  Result details for: {r.email}
                </h2>
                <div className="mb-2 text-sm text-gray-600">
                  Date: {new Date(r.created_at).toLocaleString()} | Score: {r.score}
                </div>
                <ul className="ml-1 md:ml-5 list-disc space-y-3">
                  {(r.answers || []).map((d: any, idx: number) => (
                    <li
                      key={idx}
                      className={`rounded-xl p-3 ${
                        d.isCorrect
                          ? "bg-green-50 text-green-800"
                          : "bg-red-50 text-red-800"
                      }`}
                    >
                      <b>{d.question}</b>
                      <br />
                      User answer:{" "}
                      <span className={d.isCorrect ? "text-green-700" : "text-red-700"}>
                        {d.options?.[d.userAnswer] ?? "No answer"}
                      </span>
                      <br />
                      Correct:{" "}
                      <span className="text-green-600">
                        {d.options?.[d.correct]}
                      </span>
                      {!d.isCorrect && (
                        <div>
                          <i className="text-gray-500">{d.recommendation}</i>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              </motion.div>
            )
        )}
      </AnimatePresence>
    </div>
  );
}
