"use client";

import { useCallback, useEffect, useState } from "react";

type DocTypeInfo = { key: string; label: string; description: string };

type Settings = {
  parentFolderId: string | null;
  folders: Record<string, string | null>;
  googleConnected: boolean;
};

type Msg = { kind: "ok" | "bad"; text: string };

const inputCls =
  "min-w-[220px] flex-1 rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

const folderUrl = (id: string) => `https://drive.google.com/drive/folders/${id}`;

async function api<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await fetch(url, init);
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(
      (data as { error?: string }).error || `Request failed (${res.status})`
    );
  }
  return data as T;
}

/**
 * Super Admin: choose which Google Drive folder each report type is uploaded
 * into. Staff can only upload PDFs; the destination is picked on the server.
 */
export default function FolderSettingsPanel({
  docTypes,
}: {
  docTypes: DocTypeInfo[];
}) {
  const [settings, setSettings] = useState<Settings | null>(null);
  const [inputs, setInputs] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [msg, setMsg] = useState<Msg | null>(null);

  const load = useCallback(async () => {
    try {
      const s = await api<Settings>("/api/settings");
      setSettings(s);
      setInputs((cur) => {
        const next = { ...cur };
        for (const d of docTypes) {
          if (next[d.key] === undefined) next[d.key] = s.folders[d.key] ?? "";
        }
        next.__parent = cur.__parent ?? s.parentFolderId ?? "";
        return next;
      });
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    }
  }, [docTypes]);

  useEffect(() => {
    load();
  }, [load]);

  async function save(key: string, label: string) {
    setBusyKey(key);
    setMsg(null);
    try {
      const value = (inputs[key] ?? "").trim();
      const isParent = key === "__parent";
      const res = await api<{ folderId?: string | null; parentFolderId?: string }>(
        "/api/settings",
        {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(
            isParent
              ? { parentFolder: value }
              : { docType: key, folder: value }
          ),
        }
      );
      // Show the cleaned-up folder ID instead of the pasted link
      const savedId = isParent ? res.parentFolderId : res.folderId;
      setInputs((cur) => ({ ...cur, [key]: savedId ?? "" }));
      setMsg({
        kind: "ok",
        text: savedId
          ? `${label} folder saved.`
          : `${label} folder cleared — it will use the general folder.`,
      });
      await load();
    } catch (e) {
      setMsg({ kind: "bad", text: (e as Error).message });
    } finally {
      setBusyKey(null);
    }
  }

  function row(opts: {
    key: string;
    label: string;
    description: string;
    savedId: string | null;
    allowClear: boolean;
  }) {
    const { key, label, description, savedId, allowClear } = opts;
    const value = inputs[key] ?? "";
    const dirty = value.trim() !== (savedId ?? "");
    const busy = busyKey === key;
    return (
      <div key={key} className="rounded-lg border border-[var(--border)] p-3 sm:p-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-[14px] font-medium text-[var(--foreground)]">
              {label}
            </p>
            <p className="text-[12.5px] text-[var(--muted)]">{description}</p>
          </div>
          {savedId ? (
            <a
              href={folderUrl(savedId)}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] font-medium text-[var(--accent)] hover:underline"
            >
              Open folder ↗
            </a>
          ) : (
            <span className="text-[12px] text-amber-700 dark:text-amber-300">
              {allowClear ? "Using general folder" : "Not set"}
            </span>
          )}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            type="text"
            className={inputCls}
            placeholder="https://drive.google.com/drive/folders/..."
            value={value}
            onChange={(e) =>
              setInputs((cur) => ({ ...cur, [key]: e.target.value }))
            }
          />
          <button
            type="button"
            onClick={() => save(key, label)}
            disabled={busy || !dirty || (!allowClear && !value.trim())}
            className="rounded-lg bg-[var(--accent)] px-3.5 py-2 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-50"
          >
            {busy ? "Saving…" : allowClear && !value.trim() ? "Clear" : "Save"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="dash-panel space-y-4 p-4 sm:p-6">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Folder settings
        </h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Choose the Google Drive folder where each report is stored. Staff can
          upload <strong>PDF files only</strong>; the link is saved on the
          record. Paste a Drive folder link or ID.
        </p>
        {settings && !settings.googleConnected && (
          <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-[13px] text-amber-900 dark:text-amber-100">
            Google Drive is not connected yet. Connect it in{" "}
            <a href="/settings" className="font-medium underline">
              Settings
            </a>{" "}
            first.
          </p>
        )}
      </div>

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

      <div className="space-y-3">
        {docTypes.map((d) =>
          row({
            key: d.key,
            label: d.label,
            description: d.description,
            savedId: settings?.folders[d.key] ?? null,
            allowClear: true,
          })
        )}
      </div>

      <div className="border-t border-[var(--border)] pt-4">
        {row({
          key: "__parent",
          label: "General folder (fallback)",
          description:
            "Used for any report type above that has no folder of its own. Uploads here go into a subfolder per case.",
          savedId: settings?.parentFolderId ?? null,
          allowClear: false,
        })}
      </div>
    </div>
  );
}
