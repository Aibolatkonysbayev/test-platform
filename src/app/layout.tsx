import { AuthProvider } from "./AuthProvider";
import Navbar from "./components/Navbar";
import "./globals.css";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 min-h-screen">
        <AuthProvider>
          <Navbar />
          <main className="max-w-4xl mx-auto py-8 px-2">{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
}
