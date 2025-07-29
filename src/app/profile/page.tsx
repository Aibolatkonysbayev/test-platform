"use client";
import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "../../utils/supabaseClient";
import { useAuth } from "../AuthProvider";
import { motion, AnimatePresence } from "framer-motion";

type Result = {
  id: string;
  score: number;
  total: number;
  created_at: string;
  answers: any[];
};

export default function ProfilePage() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [results, setResults] = useState<Result[]>([]);

  // Защита: если не залогинен — редирект на /login
  useEffect(() => {
    if (!loading && !user) {
      router.replace("/login");
    }
  }, [user, loading, router]);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("results")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .then(({ data }) => setResults(data || []));
  }, [user]);

  if (loading || !user) {
    return (
      <div className="flex justify-center items-center h-64">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-2xl text-blue-700 font-bold"
        >
          Loading...
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-3xl mx-auto px-4 py-10">
      <motion.h1
        className="text-3xl font-bold mb-10 text-center text-blue-700"
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4 }}
      >
        Your Test Results
      </motion.h1>
      {results.length === 0 && (
        <motion.div
          className="text-center text-gray-500 text-xl"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          No test results yet.<br />
          <span className="text-base">Take a quiz to see your progress!</span>
        </motion.div>
      )}
      <div className="space-y-8">
        <AnimatePresence>
          {results.map((r, idx) => (
            <motion.div
              key={r.id}
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 40 }}
              transition={{ duration: 0.5, delay: idx * 0.06 }}
              className="bg-white border border-gray-100 rounded-2xl shadow p-6"
            >
              <div className="flex justify-between items-center mb-2">
                <div className="text-lg font-semibold">
                  {new Date(r.created_at).toLocaleString()}
                </div>
                <div className="text-lg font-bold text-blue-700">
                  {r.score} / {r.total}
                </div>
              </div>
              <details className="mt-2">
                <summary className="cursor-pointer text-blue-700 select-none mb-2 font-medium">
                  Show details
                </summary>
                <ul className="ml-4 mt-2 list-disc space-y-4">
                  {(r.answers || []).map((d, idx2) => (
                    <li key={idx2}>
                      <div className="font-semibold">{d.question}</div>
                      <div>
                        Your answer:{" "}
                        <span className={d.isCorrect ? "text-green-700" : "text-red-700"}>
                          {d.options?.[d.userAnswer] ?? "No answer"}
                        </span>
                        {" | "}
                        Correct:{" "}
                        <span className="text-green-700">{d.options?.[d.correct]}</span>
                      </div>
                      {!d.isCorrect && d.recommendation && (
                        <div className="text-gray-600 text-xs mt-1">{d.recommendation}</div>
                      )}
                    </li>
                  ))}
                </ul>
              </details>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  );
}
