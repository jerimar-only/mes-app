"use client";

import { useState, useTransition } from "react";
import {
  toggleUserActive,
  deleteUser,
  resetPassword,
  resetLoginAttempts,
  changeUserRole,
} from "./actions";
import { useToast } from "@/components/ui/Toast";

type UserRole = "ENCODER" | "ADMINISTRATOR" | "SUPERADMIN";

type User = {
  id: number;
  fullName: string;
  isActive: boolean;
  role: UserRole | string;
};

const ROLE_LABEL: Record<string, string> = {
  ENCODER: "Encoder",
  ADMINISTRATOR: "Administrator",
  SUPERADMIN: "Super Admin",
};

const NEXT_ROLE: Record<string, string> = {
  ENCODER: "Administrator",
  ADMINISTRATOR: "Super Admin",
};

const PREV_ROLE: Record<string, string> = {
  ADMINISTRATOR: "Encoder",
  SUPERADMIN: "Administrator",
};

export default function UserActions({
  user,
  isSelf,
}: {
  user: User;
  isSelf: boolean;
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<
    "delete" | "deactivate" | "reset" | "unlock" | "promote" | "demote" | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const { success, error } = useToast();

  const canPromote = !isSelf && user.role !== "SUPERADMIN";
  const canDemote = !isSelf && user.role !== "ENCODER";

  function showToast(type: "success" | "error", message: string) {
    if (type === "success") success(message);
    else error(message);
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

  function handleUnlockOpen() {
    setConfirm("unlock");
  }

  function handleConfirmUnlock() {
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        const res = await resetLoginAttempts(fd);
        showToast(
          "success",
          `Login lockout cleared for ${user.fullName}${
            res?.deleted != null ? ` (${res.deleted} failed attempt${res.deleted === 1 ? "" : "s"} removed)` : ""
          }`,
        );
      } catch (e: any) {
        showToast("error", e.message || "Failed to clear login attempts");
      }
    });
  }

  function handlePromoteOpen() {
    setConfirm("promote");
  }

  function handleDemoteOpen() {
    setConfirm("demote");
  }

  function handleConfirmRoleChange(direction: "promote" | "demote") {
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        fd.set("direction", direction);
        const res = await changeUserRole(fd);
        showToast(
          "success",
          `${user.fullName}: ${res.from} → ${res.to}`,
        );
      } catch (e: any) {
        showToast("error", e.message || "Failed to change role");
      }
    });
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canPromote && (
          <button
            type="button"
            onClick={handlePromoteOpen}
            disabled={pending}
            className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50"
            title={`Promote to ${NEXT_ROLE[user.role] ?? "next role"}`}
          >
            Promote
          </button>
        )}

        {canDemote && (
          <button
            type="button"
            onClick={handleDemoteOpen}
            disabled={pending}
            className="rounded-md border border-[var(--border-strong)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-50"
            title={`Demote to ${PREV_ROLE[user.role] ?? "previous role"}`}
          >
            Demote
          </button>
        )}

        <button
          type="button"
          onClick={handleUnlockOpen}
          disabled={pending}
          className="rounded-md border border-[var(--border-strong)] px-2.5 py-1.5 text-[12px] font-medium text-[var(--foreground)] transition hover:bg-[var(--background)] disabled:opacity-50"
          title="Clear failed login attempts so this user can sign in again"
        >
          Clear lockout
        </button>

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

            {confirm === "promote" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Promote account?
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  Promote <strong>{user.fullName}</strong> from{" "}
                  <strong>{ROLE_LABEL[user.role] ?? user.role}</strong> to{" "}
                  <strong>{NEXT_ROLE[user.role]}</strong>?
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
                    onClick={() => handleConfirmRoleChange("promote")}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Promote
                  </button>
                </div>
              </>
            )}

            {confirm === "demote" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Demote account?
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  Demote <strong>{user.fullName}</strong> from{" "}
                  <strong>{ROLE_LABEL[user.role] ?? user.role}</strong> to{" "}
                  <strong>{PREV_ROLE[user.role]}</strong>?
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
                    onClick={() => handleConfirmRoleChange("demote")}
                    className="rounded-lg bg-amber-600 px-4 py-2 text-[14px] font-medium text-white hover:bg-amber-700"
                  >
                    Demote
                  </button>
                </div>
              </>
            )}

            {confirm === "unlock" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Clear login lockout?
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  This removes failed login attempts for{" "}
                  <strong>{user.fullName}</strong> so they can sign in again
                  without waiting 15 minutes.
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
                    onClick={handleConfirmUnlock}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Clear lockout
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
    </>
  );
}