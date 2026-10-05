"use client";

import { useActionState, useEffect } from "react";
import { login } from "./actions";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  useEffect(() => {
    if (state.error === "" && state !== initialState) {
      // Fast login – redirect immediately
      window.location.href = "/dashboard";
    }
  }, [state]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden">
      {/* Background image – dramatic mountains */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop')",
        }}
      />
      {/* Dark overlay for better contrast */}
      <div className="absolute inset-0 bg-black/40" />

      {/* Glassmorphism card */}
      <div className="relative z-10 w-full max-w-[400px] px-4">
        <div className="rounded-2xl border border-white/20 bg-white/10 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          {/* Title */}
          <h1 className="mb-10 text-center text-3xl font-semibold tracking-wide text-white">
            Login
          </h1>

          <form action={formAction} className="space-y-8">
            {/* Username */}
            <div>
              <input
                id="email"
                type="text"
                name="email"
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full border-0 border-b-2 border-white/40 bg-transparent py-2.5 text-[15px] text-white outline-none transition placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-0 focus:ring-offset-0 autofill:bg-transparent"
              />
            </div>

            {/* Password */}
            <div>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full border-0 border-b-2 border-white/40 bg-transparent py-2.5 text-[15px] text-white outline-none transition placeholder:text-white/60 focus:border-white focus:outline-none focus:ring-0 focus:ring-offset-0 autofill:bg-transparent"
              />
            </div>

            {/* Error message */}
            {state.error && (
              <div className="rounded-lg bg-red-500/20 px-4 py-3 text-sm text-red-100 backdrop-blur-sm">
                {state.error}
              </div>
            )}

            {/* Submit button */}
            <button
              type="submit"
              disabled={isPending}
              className="mt-4 w-full rounded-md bg-white py-3 text-[15px] font-medium text-gray-900 transition hover:bg-white/90 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Logging in..." : "Log In"}
            </button>
          </form>

          {/* Footer text */}
          <p className="mt-8 text-center text-sm text-white/70">
            EMS Apprehension Tracker · Province of Cagayan
          </p>
          <p className="mt-1 text-center text-xs text-white/50">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}