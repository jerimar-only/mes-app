"use client";

import { useState, useTransition } from "react";
import { toggleUserActive, deleteUser, resetPassword } from "./actions";

type User = {
  id: number;
  fullName: string;
  isActive: boolean;
};

export default function UserActions({
  user,
  isSelf,
}: {
  user: User;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [toast, setToast] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [confirm, setConfirm] = useState<"delete" | "deactivate" | "reset" | null>(null);
  const [newPassword, setNewPassword] = useState("");

  function showToast(type: "success" | "error", message: string) {
    setToast({ type, message });
    setTimeout(() => setToast(null), 3500);
  }

  function handleToggle() {
    if (user.isActive) {
      setConfirm("deactivate");
      return;
    }
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        await toggleUserActive(fd);
        showToast("success", `${user.fullName} activated`);
      } catch (e: any) {
        showToast("error", e.message || "Failed to update status");
      }
    });
  }

  function handleConfirmToggle() {
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        await toggleUserActive(fd);
        showToast("success", `${user.fullName} deactivated`);
      } catch (e: any) {
        showToast("error", e.message || "Failed to update status");
      }
    });
  }

  function handleDelete() {
    setConfirm("delete");
  }

  function handleConfirmDelete() {
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        await deleteUser(fd);
        showToast("success", `${user.fullName} deleted`);
      } catch (e: any) {
        showToast("error", e.message || "Failed to delete user");
      }
    });
  }

  function handleResetOpen() {
    setNewPassword("");
    setConfirm("reset");
  }

  function handleConfirmReset() {
    if (newPassword.length < 6) {
      showToast("error", "Password must be at least 6 characters");
      return;
    }
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        fd.set("newPassword", newPassword);
        await resetPassword(fd);
        showToast("success", `Password reset for ${user.fullName}`);
        setNewPassword("");
      } catch (e: any) {
        showToast("error", e.message || "Failed to reset password");
      }
    });
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        <button
          type="button"
          onClick={handleResetOpen}
          disabled={pending}
          className="rounded-md border border-[var(--border-strong)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-50"
        >
          Reset password
        </button>

        {!isSelf && (
          <button
            type="button"
            onClick={handleToggle}
            disabled={pending}
            className="rounded-md border border-[var(--border-strong)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-50"
          >
            {user.isActive ? "Deactivate" : "Activate"}
          </button>
        )}

        {!isSelf && (
          <button
            type="button"
            onClick={handleDelete}
            disabled={pending}
            className="rounded-md border border-red-200 px-2.5 py-1.5 text-[12px] font-medium text-red-600 transition hover:bg-red-50 disabled:opacity-50 dark:border-red-900/50 dark:text-red-400 dark:hover:bg-red-950/40"
          >
            Delete
          </button>
        )}
      </div>

      {/* Confirmation Modal */}
      {confirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 shadow-xl">
            {confirm === "delete" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Delete account?
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  This will permanently delete <strong>{user.fullName}</strong>. This action cannot be undone.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmDelete}
                    className="rounded-lg bg-red-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-red-700"
                  >
                    Delete
                  </button>
                </div>
              </>
            )}

            {confirm === "deactivate" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Deactivate account?
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  <strong>{user.fullName}</strong> will no longer be able to log in until reactivated.
                </p>
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmToggle}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-amber-700"
                  >
                    Deactivate
                  </button>
                </div>
              </>
            )}

            {confirm === "reset" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Reset password
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  Enter a new password for <strong>{user.fullName}</strong>.
                </p>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  minLength={6}
                  placeholder="New password (min 6 characters)"
                  className="mt-4 w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  autoFocus
                />
                <div className="mt-6 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setConfirm(null)}
                    className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[14px] font-medium text-[var(--foreground)] hover:bg-[var(--background)]"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleConfirmReset}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white hover:opacity-90"
                  >
                    Reset password
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Toast notification */}
      {toast && (
        <div
          className={`fixed bottom-6 right-6 z-50 max-w-sm rounded-xl border px-4 py-3 shadow-lg ${
            toast.type === "success"
              ? "border-green-200 bg-green-50 text-green-800 dark:border-green-800 dark:bg-green-950 dark:text-green-200"
              : "border-red-200 bg-red-50 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200"
          }`}
        >
          <p className="text-[14px] font-medium">{toast.message}</p>
        </div>
      )}
    </>
  );
}