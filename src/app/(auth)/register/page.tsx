"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import Link from "next/link";

export default function RegisterPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [role, setRole] = useState<"patient" | "doctor">("patient");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined, role }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Registration failed");
        setLoading(false);
        return;
      }
      await signIn("credentials", { email, password, redirect: false });
      router.push(role === "doctor" ? "/doctor" : "/patient");
      router.refresh();
    } catch {
      setError("Something went wrong");
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <form onSubmit={handleSubmit} className="w-full max-w-sm flex flex-col gap-4">
        <h1 className="text-2xl font-bold">Create account</h1>
        {error && <p className="text-red-600 text-sm">{error}</p>}
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
          required
        />
        <input
          type="text"
          placeholder="Name (optional)"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
        />
        <input
          type="password"
          placeholder="Password (min 8 characters)"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="border rounded-lg px-3 py-2 dark:bg-neutral-900 dark:border-neutral-700"
          required
          minLength={8}
        />
        <div className="flex gap-4">
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === "patient"}
              onChange={() => setRole("patient")}
            />
            Patient
          </label>
          <label className="flex items-center gap-2">
            <input
              type="radio"
              name="role"
              checked={role === "doctor"}
              onChange={() => setRole("doctor")}
            />
            Doctor
          </label>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="bg-neutral-800 text-white rounded-lg py-2 hover:bg-neutral-700 disabled:opacity-50"
        >
          {loading ? "Creating account…" : "Register"}
        </button>
        <Link href="/login" className="text-sm text-neutral-600 dark:text-neutral-400 hover:underline">
          Already have an account? Log in
        </Link>
      </form>
    </div>
  );
}
