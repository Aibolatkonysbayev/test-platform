"use client";
import { useAuth } from "./AuthProvider";
import Link from "next/link";
import Image from "next/image";
import { motion } from "framer-motion";

export default function HomePage() {
  const { user } = useAuth();

  return (
    <main className="flex flex-col items-center min-h-[75vh] justify-center">
      <motion.div
        className="bg-white/80 rounded-2xl shadow-xl border border-gray-200 p-10 flex flex-col items-center max-w-2xl"
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Image
          src="/logo_black_5@2x.png"
          width={120}
          height={50}
          alt="Advanced People"
          className="mb-4"
          priority
        />
        <h1 className="text-3xl font-bold mb-3 text-blue-800 text-center">
          Advanced People <br />
          <span className="text-2xl text-blue-600">Online Assessment Platform</span>
        </h1>
        <p className="text-gray-700 text-lg mb-8 text-center">
          <b>Advanced People</b> — это онлайн-школа для инженеров.<br />
          Пройди авторский онлайн-тест и получи <b>персональные рекомендации</b> для успешного прохождения собеседования и реального роста в инженерной сфере.<br /><br />
          <span className="text-gray-500 text-base">
            После теста ты увидишь свой уровень, ошибки и рекомендации для улучшения.<br />
            Все результаты доступны в личном кабинете.
          </span>
        </p>

        {user ? (
          <Link href="/quiz">
            <button className="bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow hover:bg-blue-800 transition">
              Пройти тест
            </button>
          </Link>
        ) : (
          <Link href="/login">
            <button className="bg-blue-700 text-white px-8 py-3 rounded-xl font-bold text-lg shadow hover:bg-blue-800 transition">
              Войти, чтобы пройти тест
            </button>
          </Link>
        )}
      </motion.div>

      <motion.div
        className="mt-10 text-gray-500 text-center text-sm max-w-xl"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.7 }}
      >
        <p>
          Платформа создана для инженерных специалистов и студентов.<br />
          Бесплатно для всех пользователей.
        </p>
      </motion.div>
    </main>
  );
}
