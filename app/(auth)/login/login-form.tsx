"use client";

import { useActionState, useEffect, useMemo, useState } from "react";
import { login, type LoginState } from "./actions";
import Image from "next/image";
import { Input } from "@/components/ui/Input";

const initialState: LoginState = { error: "" };

function formatRemaining(ms: number): string {
  if (ms <= 0) return "0:00";
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${s.toString().padStart(2, "0")}`;
}

function UserIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15.75 6a3.75 3.75 0 1 1-7.5 0 3.75 3.75 0 0 1 7.5 0ZM4.501 20.118a7.5 7.5 0 0 1 14.998 0A17.933 17.933 0 0 1 12 21.75c-2.676 0-5.216-.584-7.499-1.632Z"
      />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M16.5 10.5V6.75a4.5 4.5 0 1 0-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 0 0 2.25-2.25v-6.75a2.25 2.25 0 0 0-2.25-2.25H6.75a2.25 2.25 0 0 0-2.25 2.25v6.75a2.25 2.25 0 0 0 2.25 2.25Z"
      />
    </svg>
  );
}

function EyeIcon({ open }: { open: boolean }) {
  if (open) {
    return (
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M3.98 8.223A10.477 10.477 0 0 0 1.934 12C3.226 16.338 7.244 19.5 12 19.5c.993 0 1.953-.138 2.863-.395M6.228 6.228A10.451 10.451 0 0 1 12 4.5c4.756 0 8.773 3.162 10.065 7.498a10.522 10.522 0 0 1-4.293 5.774M6.228 6.228 3 3m3.228 3.228 3.65 3.65m7.894 7.894L21 21m-3.228-3.228-3.65-3.65m0 0a3 3 0 1 0-4.243-4.243m4.242 4.242L9.88 9.88"
        />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.036 12.322a1.012 1.012 0 0 1 0-.639C3.423 7.51 7.36 4.5 12 4.5c4.638 0 8.573 3.007 9.963 7.178.07.207.07.431 0 .639C20.577 16.49 16.64 19.5 12 19.5c-4.638 0-8.573-3.007-9.963-7.178Z"
      />
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M15 12a3 3 0 1 1-6 0 3 3 0 0 1 6 0Z"
      />
    </svg>
  );
}

const glassField =
  "!border-white/35 bg-white/10 backdrop-blur-sm hover:!border-white/50 data-[state=focused]:!border-white/70 data-[state=focused]:!ring-2 data-[state=focused]:!ring-white/25 data-[state=error]:!border-red-400/80 data-[state=error]:!ring-red-400/30";
const glassInput =
  "!text-white !caret-white placeholder:!text-white/55";
const glassIcon = "!text-white/70";

export default function LoginForm() {
  const [state, formAction, isPending] = useActionState(login, initialState);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  // Drop stale/deactivated session cookies via Route Handler
  useEffect(() => {
    fetch("/api/session", { cache: "no-store" }).catch(() => {});
  }, []);

  // Tick every second while locked
  useEffect(() => {
    if (!state.lockedUntil || state.lockedUntil <= Date.now()) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [state.lockedUntil]);

  const remainingMs = useMemo(() => {
    if (!state.lockedUntil) return 0;
    return Math.max(0, state.lockedUntil - now);
  }, [state.lockedUntil, now]);

  const isLocked = remainingMs > 0;
  const formError = Boolean(state.error) && !isLocked;
  const locked = isLocked;

  return (
    <div className="login-page relative flex min-h-screen items-center justify-center overflow-hidden px-4">
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

          <form action={formAction} className="space-y-5">
            <Input
              id="email"
              name="email"
              type="text"
              label="Username"
              placeholder="Enter your username"
              required
              autoComplete="username"
              value={email}
              onChange={setEmail}
              error={formError || undefined}
              disabled={locked || isPending}
              leftIcon={<UserIcon />}
              classNames={{
                label: "text-white/90",
                field: glassField,
                input: glassInput,
                leftIcon: glassIcon,
              }}
            />

            <Input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              label="Password"
              placeholder="Enter your password"
              required
              autoComplete="current-password"
              value={password}
              onChange={setPassword}
              error={formError || undefined}
              disabled={locked || isPending}
              leftIcon={<LockIcon />}
              rightIcon={
                <button
                  type="button"
                  tabIndex={-1}
                  disabled={locked}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  onClick={() => setShowPassword((v) => !v)}
                  className="text-white/70 transition hover:text-white disabled:opacity-40"
                >
                  <EyeIcon open={showPassword} />
                </button>
              }
              classNames={{
                label: "text-white/90",
                field: glassField,
                input: glassInput,
                leftIcon: glassIcon,
                rightIcon: "!text-white/70",
              }}
            />

            {locked ? (
              <div
                className="rounded-xl border border-amber-400/40 bg-amber-500/20 px-4 py-4 text-center backdrop-blur-sm"
                role="alert"
              >
                <p className="text-sm font-medium text-amber-50">
                  Login locked — too many failed attempts
                </p>
                <p className="mt-2 font-mono text-3xl font-semibold tracking-tight text-white tabular-nums">
                  {formatRemaining(remainingMs)}
                </p>
                <p className="mt-1 text-xs text-amber-100/80">
                  Time remaining until you can try again
                </p>
              </div>
            ) : state.error ? (
              <div className="rounded-xl bg-red-500/25 px-4 py-3 text-sm text-red-50 backdrop-blur-sm">
                {state.error}
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isPending || locked}
              className="mt-1 w-full rounded-full bg-white/95 py-3.5 text-[15px] font-semibold text-gray-900 transition hover:bg-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              {locked
                ? `Locked · ${formatRemaining(remainingMs)}`
                : isPending
                  ? "Logging in..."
                  : "Log In"}
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
