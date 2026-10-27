import { getSession } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { createUser } from "@/app/(app)/users/actions";
import { getLockedUntil } from "@/app/(auth)/login/actions";
import UserActions from "@/app/(app)/users/UserActions";
import Link from "next/link";

export const dynamic = "force-dynamic";

export default async function AdminPortalPage() {
  const session = await getSession();
  if (!session || session.role !== "SUPERADMIN") {
    redirect("/dashboard");
  }

  const users = await prisma.user.findMany({
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      fullName: true,
      email: true,
      role: true,
      isActive: true,
      createdAt: true,
    },
  });

  // Account-level login locks (5+ failed attempts in 15 min for that username)
  const lockEntries = await Promise.all(
    users.map(async (u) => {
      const lockedUntil = await getLockedUntil({ email: u.email });
      return [u.id, lockedUntil] as const;
    })
  );
  const lockedUntilById = new Map(lockEntries);
  const lockedUsers = users.filter((u) => lockedUntilById.get(u.id) != null);

  const totalUsers = users.length;
  const activeUsers = users.filter((u) => u.isActive).length;
  const superAdmins = users.filter((u) => u.role === "SUPERADMIN").length;
  const admins = users.filter((u) => u.role === "ADMINISTRATOR").length;
  const encoders = users.filter((u) => u.role === "ENCODER").length;

  return (
    <div className="mx-auto max-w-5xl space-y-8 px-1 sm:space-y-10">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-end">
        <Link
          href="/dashboard"
          className="inline-flex w-full shrink-0 items-center justify-center rounded-md border border-gray-200 bg-white px-4 py-2 text-[14px] font-medium text-gray-700 shadow-sm transition hover:bg-gray-50 dark:border-white/10 dark:bg-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-700 sm:w-auto"
        >
          ← Back to Dashboard
        </Link>
      </div>

      {/* Quick stats — 2 cols on mobile, 3 on tablet, 5 on desktop */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-5">
        <StatCard label="Total users" value={String(totalUsers)} />
        <StatCard label="Active" value={String(activeUsers)} />
        <StatCard label="Super Admin" value={String(superAdmins)} />
        <StatCard label="Administrator" value={String(admins)} />
        <StatCard label="Encoder" value={String(encoders)} />
      </div>

      {lockedUsers.length > 0 && (
        <div
          role="alert"
          className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 text-[14px] text-amber-950 dark:border-amber-700/60 dark:bg-amber-950/40 dark:text-amber-100"
        >
          <p className="font-semibold">
            {lockedUsers.length === 1
              ? "1 account is temporarily locked"
              : `${lockedUsers.length} accounts are temporarily locked`}
          </p>
          <p className="mt-1 text-[13px] opacity-90">
            Too many failed login attempts (5 within 15 minutes). Locked accounts
            cannot sign in until the lock window ends. Rows marked{" "}
            <span className="font-medium">Locked</span> below show when they unlock.
          </p>
          <ul className="mt-2 list-inside list-disc space-y-0.5 text-[13px]">
            {lockedUsers.map((u) => {
              const until = lockedUntilById.get(u.id)!;
              return (
                <li key={u.id}>
                  <span className="font-medium">{u.fullName}</span>
                  <span className="opacity-80"> ({u.email})</span>
                  {" — unlocks "}
                  {formatUnlock(until)}
                </li>
              );
            })}
          </ul>
        </div>
      )}

      {/* Create user */}
      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 shadow-sm sm:p-6">
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)] sm:mb-5">
          Create new account
        </h2>

        <form action={createUser} className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
              Full name
            </label>
            <input
              type="text"
              name="fullName"
              required
              placeholder="Juan Dela Cruz"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
              Username (login)
            </label>
            <input
              type="text"
              name="email"
              required
              placeholder="juan.delacruz"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
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
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            />
          </div>

          <div>
            <label className="mb-1.5 block text-[13px] font-medium text-[var(--muted)]">
              Role
            </label>
            <select
              name="role"
              required
              defaultValue="ENCODER"
              className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
            >
              <option value="ENCODER">Encoder</option>
              <option value="ADMINISTRATOR">Administrator</option>
              <option value="SUPERADMIN">Super Admin</option>
            </select>
          </div>

          <div className="sm:col-span-2 flex justify-stretch sm:justify-end pt-2">
            <button
              type="submit"
              className="w-full rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[14px] font-medium text-white transition hover:opacity-90 sm:w-auto"
            >
              Create account
            </button>
          </div>
        </form>
      </section>

      {/* User list */}
      <section>
        <h2 className="mb-4 text-[15px] font-semibold text-[var(--foreground)]">
          All accounts ({users.length})
        </h2>

        {/* Horizontal scroll on small screens */}
        <div className="overflow-x-auto rounded-xl border border-[var(--border)] bg-[var(--card)] shadow-sm">
          <table className="w-full min-w-[720px] text-left text-[14px]">
            <thead className="border-b border-[var(--border)] bg-[var(--accent)] text-[12px] font-semibold uppercase tracking-wide text-white">
              <tr>
                <th className="px-3 py-3 font-medium sm:px-4">Name</th>
                <th className="px-3 py-3 font-medium sm:px-4">Username</th>
                <th className="px-3 py-3 font-medium sm:px-4">Role</th>
                <th className="px-3 py-3 font-medium sm:px-4">Status</th>
                <th className="hidden px-3 py-3 font-medium sm:table-cell sm:px-4">
                  Created
                </th>
                <th className="px-3 py-3 font-medium text-right sm:px-4">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => {
                const isSelf = user.id === session.userId;
                const lockedUntil = lockedUntilById.get(user.id) ?? null;
                const isLocked = lockedUntil != null;
                return (
                  <tr
                    key={user.id}
                    className={`border-b border-[var(--border)] last:border-0 ${
                      isLocked
                        ? "bg-amber-50/80 dark:bg-amber-950/25"
                        : ""
                    }`}
                  >
                    <td className="px-3 py-3 font-medium text-[var(--foreground)] sm:px-4">
                      <div className="flex flex-col gap-0.5">
                        <span>{user.fullName}</span>
                        <div className="flex flex-wrap gap-1">
                          {isSelf && (
                            <span className="w-fit rounded-full bg-[var(--accent)]/15 px-2 py-0.5 text-[11px] font-medium text-[var(--accent)]">
                              You
                            </span>
                          )}
                          {isLocked && (
                            <span
                              className="w-fit rounded-full bg-amber-200 px-2 py-0.5 text-[11px] font-semibold text-amber-950 dark:bg-amber-800/60 dark:text-amber-100"
                              title={`Unlocks ${formatUnlock(lockedUntil)}`}
                            >
                              Locked
                            </span>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-[var(--muted)] sm:px-4">
                      {user.email}
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <span
                        className={`inline-block rounded-full px-2.5 py-1 text-[11px] font-medium sm:text-[12px] ${
                          user.role === "SUPERADMIN"
                            ? "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-300"
                            : user.role === "ADMINISTRATOR"
                            ? "bg-purple-100 text-purple-800 dark:bg-purple-900/40 dark:text-purple-300"
                            : "bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300"
                        }`}
                      >
                        {user.role === "SUPERADMIN"
                          ? "Super Admin"
                          : user.role === "ADMINISTRATOR"
                          ? "Administrator"
                          : "Encoder"}
                      </span>
                    </td>
                    <td className="px-3 py-3 sm:px-4">
                      <div className="flex flex-col gap-1">
                        {user.isActive ? (
                          <span className="w-fit rounded-full bg-green-100 px-2.5 py-1 text-[11px] font-medium text-green-800 dark:bg-green-900/40 dark:text-green-300 sm:text-[12px]">
                            Active
                          </span>
                        ) : (
                          <span className="w-fit rounded-full bg-red-100 px-2.5 py-1 text-[11px] font-medium text-red-800 dark:bg-red-900/40 dark:text-red-300 sm:text-[12px]">
                            Inactive
                          </span>
                        )}
                        {isLocked && (
                          <span className="text-[11px] font-medium text-amber-800 dark:text-amber-300">
                            Login locked until {formatUnlock(lockedUntil)}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="hidden px-3 py-3 text-[var(--muted)] sm:table-cell sm:px-4">
                      {user.createdAt.toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })}
                    </td>
                    <td className="px-3 py-3 text-right sm:px-4">
                      <UserActions
                        user={{
                          id: user.id,
                          fullName: user.fullName,
                          isActive: user.isActive,
                          role: user.role,
                        }}
                        isSelf={isSelf}
                      />
                    </td>
                  </tr>
                );
              })}

              {users.length === 0 && (
                <tr>
                  <td
                    colSpan={6}
                    className="px-4 py-12 text-center text-[var(--muted)]"
                  >
                    No user accounts yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function formatUnlock(untilMs: number) {
  return new Date(untilMs).toLocaleString("en-PH", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-sm sm:p-4">
      <p className="text-[11px] font-medium text-[var(--muted)] sm:text-[12px]">
        {label}
      </p>
      <p className="mt-1 text-lg font-semibold tracking-tight text-[var(--foreground)] sm:text-xl">
        {value}
      </p>
    </div>
  );
}