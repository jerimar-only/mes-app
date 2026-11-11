"use client";

import { useCallback, useEffect, useState } from "react";

type MappedFolder = {
  id: number;
  name: string;
  driveId: string;
  type: string;
  isActive: boolean;
  penroOffice?: { name: string } | null;
  cenroOffice?: { name: string } | null;
};

type DriveFile = {
  id: string;
  name: string;
  mimeType: string;
  modifiedTime?: string;
  webViewLink?: string;
  size?: string;
};

export default function FolderBrowserPanel() {
  const [folders, setFolders] = useState<MappedFolder[]>([]);
  const [selectedId, setSelectedId] = useState<number | "">("");
  const [files, setFiles] = useState<DriveFile[]>([]);
  const [loadingFolders, setLoadingFolders] = useState(true);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const loadFolders = useCallback(async () => {
    setLoadingFolders(true);
    setError(null);
    try {
      const res = await fetch("/api/drive/folders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load folders");
      setFolders(Array.isArray(data) ? data.filter((f: MappedFolder) => f.isActive) : []);
    } catch (e: any) {
      setError(e.message || "Failed to load folders");
    } finally {
      setLoadingFolders(false);
    }
  }, []);

  useEffect(() => {
    loadFolders();
  }, [loadFolders]);

  async function loadFiles(driveId: string) {
    setLoadingFiles(true);
    setError(null);
    setFiles([]);
    try {
      const res = await fetch(
        `/api/drive/files?folderId=${encodeURIComponent(driveId)}`,
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to list files");
      setFiles(data.files ?? []);
    } catch (e: any) {
      setError(e.message || "Failed to list files");
    } finally {
      setLoadingFiles(false);
    }
  }

  function onSelectFolder(id: string) {
    const num = id ? Number(id) : "";
    setSelectedId(num === "" || Number.isNaN(num) ? "" : num);
    if (num === "" || Number.isNaN(num)) {
      setFiles([]);
      return;
    }
    const folder = folders.find((f) => f.id === num);
    if (folder) loadFiles(folder.driveId);
  }

  async function onDeleteFile(file: DriveFile) {
    if (
      !confirm(
        `Delete "${file.name}" from Google Drive?\n\nThis cannot be undone.`,
      )
    ) {
      return;
    }
    setBusyId(file.id);
    setError(null);
    try {
      const res = await fetch(
        `/api/drive/files?fileId=${encodeURIComponent(file.id)}`,
        { method: "DELETE" },
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Delete failed");
      setFiles((prev) => prev.filter((f) => f.id !== file.id));
    } catch (e: any) {
      setError(e.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  }

  const selected = folders.find((f) => f.id === selectedId);

  return (
    <div className="space-y-4 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
          Browse Drive folders
        </h3>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Super Admin only. List files in a mapped folder and delete them in
          Google Drive from this app.
        </p>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      <div className="grid gap-3 sm:grid-cols-[1fr_auto]">
        <select
          value={selectedId === "" ? "" : String(selectedId)}
          onChange={(e) => onSelectFolder(e.target.value)}
          disabled={loadingFolders}
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]"
        >
          <option value="">
            {loadingFolders ? "Loading folders…" : "— Select a mapped folder —"}
          </option>
          {folders.map((f) => (
            <option key={f.id} value={f.id}>
              [{f.type}] {f.name}
              {f.cenroOffice?.name ? ` · ${f.cenroOffice.name}` : ""}
              {f.penroOffice?.name ? ` · ${f.penroOffice.name}` : ""}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={() => selected && loadFiles(selected.driveId)}
          disabled={!selected || loadingFiles}
          className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[13px] font-medium disabled:opacity-40"
        >
          Refresh
        </button>
      </div>

      {selected && (
        <p className="text-[12px] text-[var(--muted)]">
          Drive ID: <code className="text-[11px]">{selected.driveId}</code>
        </p>
      )}

      {loadingFiles ? (
        <p className="text-[13px] text-[var(--muted)]">Loading files…</p>
      ) : selectedId === "" ? (
        <p className="text-[13px] text-[var(--muted)]">
          Choose a folder to see its files.
        </p>
      ) : files.length === 0 ? (
        <p className="text-[13px] text-[var(--muted)]">No files in this folder.</p>
      ) : (
        <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
          {files.map((f) => (
            <li
              key={f.id}
              className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
            >
              <div className="min-w-0">
                {f.webViewLink ? (
                  <a
                    href={f.webViewLink}
                    target="_blank"
                    rel="noreferrer"
                    className="font-medium text-[var(--accent)] hover:underline"
                  >
                    {f.name}
                  </a>
                ) : (
                  <span className="font-medium">{f.name}</span>
                )}
                <p className="text-[11px] text-[var(--muted)]">
                  {f.mimeType}
                  {f.modifiedTime
                    ? ` · ${new Date(f.modifiedTime).toLocaleString()}`
                    : ""}
                </p>
              </div>
              <button
                type="button"
                disabled={busyId === f.id}
                onClick={() => onDeleteFile(f)}
                className="shrink-0 rounded-md border border-red-300 px-3 py-1 text-[12px] font-medium text-red-700 hover:bg-red-50 disabled:opacity-50 dark:border-red-800 dark:text-red-400 dark:hover:bg-red-950"
              >
                {busyId === f.id ? "Deleting…" : "Delete"}
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
