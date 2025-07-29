"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "../AuthProvider";

export default function LoginPage() {
  const router = useRouter();
  const { signIn, signUp, user } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (user) {
    router.replace("/"); // редирект если уже авторизован
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const action = isLogin ? signIn : signUp;
    const { error } = await action(email, password);
    if (error) setError(error.message);
    setLoading(false);
  };

  return (
    <div className="flex flex-col items-center justify-center h-[80vh]">
      <form
        className="bg-white p-8 rounded-lg shadow max-w-xs w-full flex flex-col gap-4"
        onSubmit={handleSubmit}
      >
        <h2 className="text-2xl font-bold text-center">{isLogin ? "Sign In" : "Sign Up"}</h2>
        <input
          type="email"
          placeholder="Email"
          required
          className="border px-4 py-2 rounded"
          value={email}
          onChange={e => setEmail(e.target.value)}
        />
        <input
          type="password"
          placeholder="Password"
          required
          minLength={6}
          className="border px-4 py-2 rounded"
          value={password}
          onChange={e => setPassword(e.target.value)}
        />
        {error && <div className="text-red-600 text-sm">{error}</div>}
        <button
          type="submit"
          disabled={loading}
          className="bg-blue-700 text-white rounded py-2 font-bold"
        >
          {loading ? "..." : isLogin ? "Sign In" : "Sign Up"}
        </button>
        <button
          type="button"
          className="text-blue-700 text-sm mt-2"
          onClick={() => setIsLogin(v => !v)}
        >
          {isLogin
            ? "Don't have an account? Sign Up"
            : "Already have an account? Sign In"}
        </button>
      </form>
    </div>
  );
}
