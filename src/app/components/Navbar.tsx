"use client";
import Link from "next/link";
import { useAuth } from "../AuthProvider";

export default function Navbar() {
  const { user, signOut } = useAuth();

  return (
    <nav className="flex justify-between items-center py-3 px-6 border-b bg-white">
      <div className="flex items-center gap-6">
        <Link href="/" className="font-extrabold text-blue-700 text-xl">TestPro</Link>
        {user && (
          <>
            <Link href="/quiz">Quiz</Link>
            {user.role === "admin" && (
              <>
                <Link href="/admin">Admin Panel</Link>
                <Link href="/admin/results">Results</Link>
              </>
            )}
            <Link href="/profile">Profile</Link>
          </>
        )}
      </div>
      <div>
        {user ? (
          <div className="flex items-center gap-3">
            <span className="text-sm text-gray-700">{user.email} {user.role === "admin" && <span className="text-xs text-gray-400">(admin)</span>}</span>
            <button
              onClick={signOut}
              className="border border-blue-400 text-blue-600 rounded px-4 py-1 ml-2 hover:bg-blue-50"
            >Sign Out</button>
          </div>
        ) : (
          <Link
            href="/login"
            className="border border-blue-400 text-blue-600 rounded px-4 py-1 hover:bg-blue-50"
          >
            Sign In
          </Link>
        )}
      </div>
    </nav>
  );
}
