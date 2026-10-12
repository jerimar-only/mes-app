"use client";

import { useActionState, useEffect } from "react";
import { login } from "./actions";
import Image from "next/image";

const initialState = { error: "" };

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);

  useEffect(() => {
    if (state.error === "" && state !== initialState) {
      window.location.href = "/dashboard";
    }
  }, [state]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-4">
      {/* Forest gradient background */}
      <div
        className="absolute inset-0"
        style={{
          background:
            "linear-gradient(165deg, #1e4a32 0%, #2d6b4a 28%, #4a8f6a 50%, #6b9a78 68%, #3d5c42 100%)",
        }}
      />
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat opacity-35"
        style={{
          backgroundImage:
            "url('https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?q=80&w=2070&auto=format&fit=crop')",
        }}
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/50 via-transparent to-black/20" />

      {/* Glass card */}
      <div className="relative z-10 w-full max-w-[400px]">
        <div className="rounded-[24px] border border-white/30 bg-white/15 p-8 shadow-2xl backdrop-blur-xl sm:p-10">
          <div className="mb-8 flex flex-col items-center gap-3">
            <Image
              src="/seal.png"
              alt="Monitoring and Enforcement Seal"
              width={112}
              height={112}
              priority
              className="h-28 w-28 object-contain drop-shadow-lg"
            />
          </div>

          <form action={formAction} className="space-y-7">
            <div>
              <input
                id="email"
                type="text"
                name="email"
                placeholder="Enter your username"
                required
                autoComplete="username"
                className="w-full border-0 border-b-2 border-white/50 bg-transparent py-3 text-[15px] text-white outline-none transition placeholder:text-white/65 focus:border-white focus:outline-none focus:ring-0 autofill:bg-transparent"
              />
            </div>

            <div>
              <input
                id="password"
                type="password"
                name="password"
                placeholder="Enter your password"
                required
                autoComplete="current-password"
                className="w-full border-0 border-b-2 border-white/50 bg-transparent py-3 text-[15px] text-white outline-none transition placeholder:text-white/65 focus:border-white focus:outline-none focus:ring-0 autofill:bg-transparent"
              />
            </div>

            {state.error && (
              <div className="rounded-xl bg-red-500/25 px-4 py-3 text-sm text-red-50 backdrop-blur-sm">
                {state.error}
              </div>
            )}

            <button
              type="submit"
              disabled={isPending}
              className="mt-2 w-full rounded-[10px] bg-white/95 py-3.5 text-[15px] font-semibold text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-70"
            >
              {isPending ? "Logging in..." : "Log In"}
            </button>
          </form>

          <p className="mt-8 text-center text-sm text-white/80">
            EMS Apprehension Tracker · Province of Cagayan
          </p>
          <p className="mt-1 text-center text-xs text-white/55">
            Authorized personnel only
          </p>
        </div>
      </div>
    </div>
  );
}
