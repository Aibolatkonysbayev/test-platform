"use client";
import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "../utils/supabaseClient";

type UserType = {
  id: string;
  email: string;
  role: string;
};

const AuthContext = createContext<{
  user: UserType | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<any>;
  signUp: (email: string, password: string) => Promise<any>;
  signOut: () => Promise<void>;
}>({
  user: null,
  loading: true,
  signIn: async () => {},
  signUp: async () => {},
  signOut: async () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserType | null>(null);
  const [loading, setLoading] = useState(true);

  // --- Получение роли из profiles (или создание записи для новых пользователей)
  async function fetchRoleOrCreate(userId: string, email: string) {
    // 1. Пробуем получить профиль
    let { data: profile, error } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .single();

    // 2. Если нет профиля — создаём
    if (!profile && email) {
      // Для первого админа — ручное добавление
      let role = "user";
      if (email === "aibolat.konysbayev@email.com") role = "admin";
      await supabase.from("profiles").insert([
        { id: userId, email, role }
      ]);
      return role;
    }
    return profile?.role || "user";
  }

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session?.user) {
        const role = await fetchRoleOrCreate(session.user.id, session.user.email || "");
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    };
    getUser();

    const { data: listener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        const role = await fetchRoleOrCreate(session.user.id, session.user.email || "");
        setUser({
          id: session.user.id,
          email: session.user.email || "",
          role,
        });
      } else {
        setUser(null);
      }
      setLoading(false);
    });
    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function signIn(email: string, password: string) {
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  }

  async function signUp(email: string, password: string) {
    setLoading(true);
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
    });
    setLoading(false);
    return { data, error };
  }

  async function signOut() {
    setLoading(true);
    await supabase.auth.signOut();
    setUser(null);
    setLoading(false);
  }

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
