"use client";

import { useTransition } from "react";
import { createUser } from "@/app/(app)/users/actions";
import { useToast } from "@/components/ui/Toast";

export default function CreateUserForm() {
  const [pending, startTransition] = useTransition();
  const { success, error, flash } = useToast();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    startTransition(async () => {
      try {
        flash("success", "User account was created.", "Saved");
        await createUser(formData);
        // If createUser does not redirect, still show toast and reset
        success("User account was created.", "Saved");
        form.reset();
      } catch (err) {
        if (
          typeof err === "object" &&
          err !== null &&
          "digest" in err &&
          String((err as { digest?: string }).digest || "").startsWith("NEXT_REDIRECT")
        ) {
          return;
        }
        error(err instanceof Error ? err.message : "Could not create user.");
      }
    });
  }

  const field =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

  return (
    <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          Full name
        </label>
        <input type="text" name="fullName" required placeholder="Jerimar R. Macatuggal" className={field} />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          Username (login)
        </label>
        <input type="text" name="email" required placeholder="jerimar.macatuggal" className={field} />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          Password
        </label>
        <input
          type="password"
          name="password"
          required
          minLength={6}
          placeholder="At least 6 characters"
          className={field}
        />
      </div>
      <div>
        <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
          Role
        </label>
        <select name="role" required defaultValue="ENCODER" className={field}>
          <option value="ENCODER">Encoder</option>
          <option value="ADMINISTRATOR">Administrator</option>
          <option value="SUPERADMIN">Super Admin</option>
        </select>
      </div>
      <div className="flex justify-stretch pt-2 sm:col-span-2 sm:justify-end">
        <button
          type="submit"
          disabled={pending}
          className="w-full rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90 disabled:opacity-60 sm:w-auto"
        >
          {pending ? "Creating…" : "Create account"}
        </button>
      </div>
    </form>
  );
}
