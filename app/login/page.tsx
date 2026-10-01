"use client";

import { useActionState } from "react";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { login } from "./actions";

const initialState = { error: "" };

export default function LoginPage() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const router = useRouter();

  useEffect(() => {
    if (state.error === "" && state !== initialState) {
      router.push("/dashboard");
    }
  }, [state, router]);

  return (
    <div className="flex h-screen items-center justify-center overflow-hidden bg-[var(--background)] px-4">
      <div className="w-full max-w-sm sm:max-w-md">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-sm sm:p-8">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[var(--accent-soft)]">
              <svg
                className="h-7 w-7 text-[var(--accent)]"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                strokeWidth={1.8}
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                />
              </svg>
            </div>
            <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
              EMS Apprehension Tracker
            </h1>
            <p className="mt-1 text-[14px] text-[var(--muted)]">
              Province of Cagayan
            </p>
          </div>

          <form action={formAction} className="space-y-5">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]"
              >
                Username
              </label>
              <input
                id="email"
                type="text"
                name="email"
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]"
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[15px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
              />
            </div>

            {state.error && (
              <div className="rounded-lg bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:bg-red-950/40 dark:text-red-300">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="w-full rounded-lg bg-[var(--accent)] px-4 py-3 text-[15px] font-medium text-white transition-colors hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isPending ? "Logging in..." : "Log in"}
            </button>
          </form>
        </div>

        <p className="mt-6 text-center text-[13px] text-[var(--muted)]">
          Authorized personnel only
        </p>
      </div>
    </div>
  );
}