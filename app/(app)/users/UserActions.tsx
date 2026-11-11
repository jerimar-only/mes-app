"use client";

import { useState, useTransition } from "react";
import {
  toggleUserActive,
  deleteUser,
  resetPassword,
  resetLoginAttempts,
  setUserRole,
} from "./actions";
import { useToast } from "@/components/ui/Toast";

type User = {
  id: number;
  fullName: string;
  isActive: boolean;
  role: string;
  penroOfficeId?: number | null;
  cenroOfficeId?: number | null;
};

type PenroOption = { id: number; name: string };
type CenroOption = { id: number; name: string; penroName?: string | null };

const ROLE_LABEL: Record<string, string> = {
  ENCODER: "Encoder",
  CENRO: "CENRO (office portal)",
  CENRO_ADMIN: "CENRO Admin",
  PENRO_ADMIN: "PENRO Admin",
  ADMINISTRATOR: "Administrator",
  REGIONAL: "Regional (view + comment)",
  SUPERADMIN: "Super Admin",
};

const ROLE_OPTIONS = [
  "ENCODER",
  "CENRO",
  "CENRO_ADMIN",
  "PENRO_ADMIN",
  "ADMINISTRATOR",
  "REGIONAL",
  "SUPERADMIN",
] as const;

export default function UserActions({
  user,
  isSelf,
  penroOffices = [],
  cenroOffices = [],
}: {
  user: User;
  isSelf: boolean;
  penroOffices?: PenroOption[];
  cenroOffices?: CenroOption[];
}) {
  const [pending, startTransition] = useTransition();
  const [confirm, setConfirm] = useState<
    "delete" | "deactivate" | "reset" | "unlock" | "role" | null
  >(null);
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<string>(user.role);
  const [penroId, setPenroId] = useState<string>(
    user.penroOfficeId ? String(user.penroOfficeId) : "",
  );
  const [cenroId, setCenroId] = useState<string>(
    user.cenroOfficeId ? String(user.cenroOfficeId) : "",
  );
  const { success, error } = useToast();

  const canChangeRole = !isSelf;
  const needsPenro = newRole === "PENRO_ADMIN";
  const needsCenro = newRole === "CENRO" || newRole === "CENRO_ADMIN";

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

  function handleRoleOpen() {
    setNewRole(user.role);
    setPenroId(user.penroOfficeId ? String(user.penroOfficeId) : "");
    setCenroId(user.cenroOfficeId ? String(user.cenroOfficeId) : "");
    setConfirm("role");
  }

  function handleConfirmRoleChange() {
    if (newRole === user.role && !needsPenro && !needsCenro) {
      showToast("error", "Choose a different role first");
      return;
    }
    if (needsPenro && !penroId) {
      showToast("error", "Select a PENRO office for a PENRO Admin");
      return;
    }
    if (needsCenro && !cenroId) {
      showToast("error", "Select a CENRO office for this role");
      return;
    }
    setConfirm(null);
    startTransition(async () => {
      try {
        const fd = new FormData();
        fd.set("userId", String(user.id));
        fd.set("role", newRole);
        if (needsPenro) fd.set("penroOfficeId", penroId);
        if (needsCenro) fd.set("cenroOfficeId", cenroId);
        const res = await setUserRole(fd);
        showToast("success", `${user.fullName}: ${res.from} → ${res.to}`);
      } catch (e: any) {
        showToast("error", e.message || "Failed to change role");
      }
    });
  }

  return (
    <>
      {/* Action buttons */}
      <div className="flex flex-wrap items-center justify-end gap-2">
        {canChangeRole && (
          <button
            type="button"
            onClick={handleRoleOpen}
            disabled={pending}
            className="rounded-md border border-[var(--accent)]/40 bg-[var(--accent)]/10 px-2.5 py-1.5 text-[12px] font-medium text-[var(--accent)] transition hover:bg-[var(--accent)]/20 disabled:opacity-50"
            title="Change this account's role"
          >
            Change role
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

            {confirm === "role" && (
              <>
                <h3 className="text-lg font-semibold text-[var(--foreground)]">
                  Change role
                </h3>
                <p className="mt-2 text-[14px] text-[var(--muted)]">
                  <strong>{user.fullName}</strong> is currently{" "}
                  <strong>{ROLE_LABEL[user.role] ?? user.role}</strong>.
                </p>

                <label className="mt-4 mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
                  New role
                </label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value)}
                  className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                >
                  {ROLE_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {ROLE_LABEL[r]}
                    </option>
                  ))}
                </select>

                {needsPenro && (
                  <>
                    <label className="mt-4 mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
                      PENRO office <span className="font-normal">(required)</span>
                    </label>
                    <select
                      value={penroId}
                      onChange={(e) => setPenroId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    >
                      <option value="">— Select PENRO office —</option>
                      {penroOffices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                        </option>
                      ))}
                    </select>
                    {penroOffices.length === 0 && (
                      <p className="mt-1.5 text-[12px] text-amber-700 dark:text-amber-300">
                        No PENRO offices yet. Add one in the Super Admin portal first.
                      </p>
                    )}
                  </>
                )}

                {needsCenro && (
                  <>
                    <label className="mt-4 mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
                      CENRO office <span className="font-normal">(required)</span>
                    </label>
                    <select
                      value={cenroId}
                      onChange={(e) => setCenroId(e.target.value)}
                      className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                    >
                      <option value="">— Select CENRO office —</option>
                      {cenroOffices.map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.name}
                          {o.penroName ? ` (${o.penroName})` : ""}
                        </option>
                      ))}
                    </select>
                  </>
                )}

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
                    onClick={handleConfirmRoleChange}
                    className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)]"
                  >
                    Save role
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