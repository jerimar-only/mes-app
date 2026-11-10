"use client";

import { useCallback, useEffect, useState } from "react";

type Settings = {
  parentFolderId: string | null;
  googleConfigured: boolean;
  googleConnected: boolean;
};

type Msg = { kind: "ok" | "bad"; text: string };

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  if (res.status === 401) {
    window.location.href = "/login";
    throw new Error("Please sign in");
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`
    );
  }
  return data as T;
}

const errorText: Record<string, string> = {
  "google-not-configured":
    "Google keys are missing. Set GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env, then restart.",
  "google-denied": "Google sign-in was cancelled.",
  "google-failed": "Google sign-in failed. Please try again.",
  "admin-only": "Only the Super Admin can connect or change Google Drive.",
};

export default function GoogleDriveSettings({
  isSuperAdmin,
}: {
  isSuperAdmin: boolean;
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [parentInput, setParentInput] = useState("");
  const [msg, setMsg] = useState<Msg | null>(null);
  const [saving, setSaving] = useState(false);

  const load = useCallback(async () => {
    try {
      const s = await api<Settings>("/api/settings");
      setSettings(s);
      setParentInput((cur) => cur || s.parentFolderId || "");
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
  }, []);

  useEffect(() => {
    load();
    const p = new URLSearchParams(window.location.search);
    if (p.get("google") === "connected") {
      setMsg({ kind: "ok", text: "Google Drive connected." });
    }
    const err = p.get("error");
    if (err) {
      setMsg({ kind: "bad", text: errorText[err] ?? "Something went wrong." });
    }
  }, [load]);

  async function saveParent() {
    setSaving(true);
    try {
      await api("/api/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ parentFolder: parentInput }),
      });
      setMsg({ kind: "ok", text: "Parent folder saved." });
      await load();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    } finally {
      setSaving(false);
    }
  }

  async function disconnect() {
    if (
      !confirm(
        "Disconnect Google Drive? Nobody can upload case documents until it is connected again."
      )
    ) {
      return;
    }
    try {
      await api("/api/settings", { method: "DELETE" });
      setMsg({ kind: "ok", text: "Google Drive disconnected." });
      await load();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
  }

  const ready = Boolean(settings?.googleConnected && settings.parentFolderId);

  return (
    <div className="space-y-4">
      {msg && (
        <div
          className={`rounded-lg border px-3.5 py-2.5 text-[14px] ${
            msg.kind === "ok"
              ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
              : "border-red-500/30 bg-red-500/10 text-red-700 dark:text-red-300"
          }`}
        >
          {msg.text}
        </div>
      )}

      <section className="rounded-xl border border-[var(--border-strong)] bg-[var(--card)] p-5 shadow-[var(--shadow)]">
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-[16px] font-semibold text-[var(--foreground)]">
            Google Drive
          </h2>
          {settings && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-[12px] font-medium ${
                ready
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-amber-500/15 text-amber-800 dark:text-amber-200"
              }`}
            >
              {ready ? "Ready" : "Not set up"}
            </span>
          )}
        </div>

        {!isSuperAdmin ? (
          <p className="m-0 text-[14px] text-[var(--muted)]">
            {ready ? (
              <span className="text-emerald-700 dark:text-emerald-300">
                Connected to Google Drive. You can upload case documents from a
                record.
              </span>
            ) : (
              <span>
                Google Drive is not set up yet. Ask the Super Admin to connect
                it.
              </span>
            )}
          </p>
        ) : (
          <>
            {settings && !settings.googleConfigured && (
              <p className="mb-3 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13.5px] text-amber-900 dark:text-amber-100">
                Google keys are missing. Set{" "}
                <code className="rounded bg-black/5 px-1">GOOGLE_CLIENT_ID</code>{" "}
                and{" "}
                <code className="rounded bg-black/5 px-1">
                  GOOGLE_CLIENT_SECRET
                </code>{" "}
                in <code className="rounded bg-black/5 px-1">.env</code>, then
                restart the app.
              </p>
            )}

            <div className="mb-4 flex flex-wrap items-center gap-3">
              {settings?.googleConnected ? (
                <>
                  <span className="text-[14px] text-emerald-700 dark:text-emerald-300">
                    ● Connected
                  </span>
                  <button
                    type="button"
                    onClick={disconnect}
                    className="rounded-lg border border-[var(--border-strong)] px-3 py-1.5 text-[13.5px] font-medium text-[var(--foreground)] hover:bg-[var(--border)]"
                  >
                    Disconnect
                  </button>
                </>
              ) : (
                <a
                  href={
                    settings?.googleConfigured
                      ? "/api/google/connect"
                      : undefined
                  }
                  className={`inline-flex items-center rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13.5px] font-semibold text-white ${
                    settings?.googleConfigured
                      ? "hover:opacity-90"
                      : "pointer-events-none opacity-50"
                  }`}
                >
                  Connect Google
                </a>
              )}
            </div>

            <label className="block text-[13.5px] font-medium text-[var(--foreground)]">
              General folder
              <span className="mt-0.5 block text-[12.5px] font-normal text-[var(--muted)]">
                General fallback folder (link or ID). Used when a report type has no
                folder of its own — set those per report in Admin Portal →
                Folder settings.
              </span>
              <div className="mt-2 flex flex-wrap gap-2">
                <input
                  type="text"
                  className="min-w-[220px] flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
                  placeholder="https://drive.google.com/drive/folders/..."
                  value={parentInput}
                  onChange={(e) => setParentInput(e.target.value)}
                />
                <button
                  type="button"
                  onClick={saveParent}
                  disabled={saving || !parentInput.trim()}
                  className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
                >
                  {saving ? "Saving…" : "Save folder"}
                </button>
              </div>
              {settings?.parentFolderId && (
                <p className="mt-1.5 text-[12.5px] text-[var(--muted)]">
                  Saved folder ID:{" "}
                  <code className="rounded bg-black/5 px-1">
                    {settings.parentFolderId}
                  </code>
                </p>
              )}
            </label>
          </>
        )}
      </section>

      <section className="rounded-xl border border-[var(--border)] bg-[var(--card)]/60 p-4 text-[13.5px] text-[var(--muted)]">
        <p className="m-0 font-medium text-[var(--foreground)]">How it works</p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li>
            Super Admin connects one Google account and sets a parent folder
            (Restricted sharing recommended).
          </li>
          <li>
            Staff upload case scans from a record; MES sends the file to that
            Drive folder and stores the link on the record.
          </li>
          <li>
            Only people who have access in Drive can open the file. MES only
            stores and shows the link to authorized roles.
          </li>
        </ul>
      </section>
    </div>
  );
}
