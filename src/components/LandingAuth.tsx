"use client";

import { useState } from "react";

type Role = "patient" | "provider";

export function LandingAuth() {
  const [role, setRole] = useState<Role>("patient");

  const loginHref = role === "patient" ? "/login/patient" : "/login/provider";
  const signupHref = role === "patient" ? "/auth/login?screen_hint=signup" : "/auth/login?returnTo=/api/auth/complete-provider-signup&screen_hint=signup";

  return (
    <div className="mt-12 space-y-6">
      <div className="flex flex-wrap items-baseline gap-1.5">
        <span className="text-stone-600 text-lg">I am a</span>
        <label className="relative inline-flex items-baseline">
          <select
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            className="text-lg font-bold text-emerald-800 bg-transparent border-0 border-b border-emerald-800/40 py-0.5 pr-6 pl-0 cursor-pointer focus:outline-none focus:ring-0 focus:border-emerald-800 appearance-none [&>option]:bg-white [&>option]:text-stone-900"
            style={{
              backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='none' viewBox='0 0 24 24' stroke='%23065f46'%3E%3Cpath stroke-linecap='round' stroke-linejoin='round' stroke-width='2' d='M19 9l-7 7-7-7'%3E%3C/path%3E%3C/svg%3E")`,
              backgroundSize: "14px",
              backgroundPosition: "right 0 center",
              backgroundRepeat: "no-repeat",
            }}
            aria-label="I am a"
          >
            <option value="patient">Patient</option>
            <option value="provider">Provider</option>
          </select>
        </label>
      </div>
      <div className="flex flex-col sm:flex-row gap-4">
        <a
          href={loginHref}
          className="inline-flex items-center justify-center px-8 py-3.5 text-center font-medium bg-stone-900 text-stone-50 rounded-lg hover:bg-stone-800 active:bg-stone-700 transition-colors"
        >
          Log in
        </a>
        <a
          href={signupHref}
          className="inline-flex items-center justify-center px-8 py-3.5 text-center font-medium bg-white text-stone-800 border border-stone-300 rounded-lg hover:bg-stone-50 hover:border-stone-400 transition-colors"
        >
          Sign up
        </a>
      </div>
    </div>
  );
}
