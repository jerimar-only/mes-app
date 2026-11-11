"use client";

import { useCallback, useEffect, useState } from "react";

type OfficeOpt = { id: number; name: string };

type MappedFolder = {
  id: number;
  name: string;
  driveId: string;
  type: "ROOT" | "PENRO" | "CENRO" | "OTHER";
  isActive: boolean;
  penroOfficeId: number | null;
  cenroOfficeId: number | null;
  penroOffice?: { id: number; name: string } | null;
  cenroOffice?: { id: number; name: string } | null;
};

const emptyForm = {
  id: null as number | null,
  name: "",
  driveId: "",
  type: "CENRO" as MappedFolder["type"],
  penroOfficeId: "",
  cenroOfficeId: "",
};

export default function OfficeDriveFolderPanel({
  penroOffices,
  cenroOffices,
}: {
  penroOffices: OfficeOpt[];
  cenroOffices: (OfficeOpt & { penroOfficeId?: number | null })[];
}) {
  const [folders, setFolders] = useState<MappedFolder[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(
    null,
  );

  const load = useCallback(async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/drive/folders");
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to load mappings");
      setFolders(Array.isArray(data) ? data : []);
    } catch (e: any) {
      setMsg({ kind: "bad", text: e.message || "Failed to load mappings" });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  function startEdit(f: MappedFolder) {
    setForm({
      id: f.id,
      name: f.name,
      driveId: f.driveId,
      type: f.type,
      penroOfficeId: f.penroOfficeId != null ? String(f.penroOfficeId) : "",
      cenroOfficeId: f.cenroOfficeId != null ? String(f.cenroOfficeId) : "",
    });
    setMsg(null);
  }

  function resetForm() {
    setForm(emptyForm);
    setMsg(null);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setMsg(null);
    try {
      if (!form.name.trim() || !form.driveId.trim()) {
        throw new Error("Name and Drive folder ID are required.");
      }
      if (form.type === "PENRO" && !form.penroOfficeId) {
        throw new Error("Select a PENRO office for this mapping.");
      }
      if (form.type === "CENRO" && !form.cenroOfficeId) {
        throw new Error("Select a CENRO office for this mapping.");
      }

      const body: Record<string, unknown> = {
        name: form.name.trim(),
        driveId: form.driveId.trim(),
        type: form.type,
        isActive: true,
      };
      if (form.id) body.id = form.id;
      if (form.penroOfficeId) body.penroOfficeId = Number(form.penroOfficeId);
      else body.penroOfficeId = null;
      if (form.cenroOfficeId) body.cenroOfficeId = Number(form.cenroOfficeId);
      else body.cenroOfficeId = null;

      // For CENRO, also store parent PENRO if the office has one
      if (form.type === "CENRO" && form.cenroOfficeId) {
        const office = cenroOffices.find(
          (o) => o.id === Number(form.cenroOfficeId),
        );
        if (office?.penroOfficeId) {
          body.penroOfficeId = office.penroOfficeId;
        }
      }

      const res = await fetch("/api/drive/folders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");

      setMsg({
        kind: "ok",
        text: form.id ? "Mapping updated." : "Mapping created.",
      });
      resetForm();
      await load();
    } catch (err: any) {
      setMsg({ kind: "bad", text: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(id: number) {
    if (!confirm("Deactivate this folder mapping? New uploads will stop using it.")) {
      return;
    }
    setMsg(null);
    try {
      const res = await fetch(`/api/drive/folders?id=${id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate");
      setMsg({ kind: "ok", text: "Mapping deactivated." });
      if (form.id === id) resetForm();
      await load();
    } catch (err: any) {
      setMsg({ kind: "bad", text: err.message || "Failed to deactivate" });
    }
  }

  const field =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[14px] text-[var(--foreground)]";

  return (
    <div className="space-y-5 rounded-xl border border-[var(--border)] bg-[var(--card)] p-4 sm:p-5">
      <div>
        <h3 className="text-[15px] font-semibold text-[var(--foreground)]">
          Map offices to Drive folders
        </h3>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Super Admin only. Link each PENRO or CENRO to a Google Drive folder.
          Uploads for a record go to its CENRO folder, then parent PENRO, then
          ROOT.
        </p>
        <p className="mt-1 text-[12px] text-[var(--muted)]">
          Tip: open the folder in Google Drive and copy the ID from the URL{" "}
          <code className="text-[11px]">
            drive.google.com/drive/folders/FOLDER_ID
          </code>
        </p>
      </div>

      {msg && (
        <p
          className={
            msg.kind === "ok"
              ? "rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-[13px] text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950 dark:text-emerald-300"
              : "rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-[13px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300"
          }
        >
          {msg.text}
        </p>
      )}

      <form onSubmit={onSubmit} className="grid gap-3 sm:grid-cols-2">
        <div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
            Type
          </label>
          <select
            className={field}
            value={form.type}
            onChange={(e) =>
              setForm({
                ...form,
                type: e.target.value as MappedFolder["type"],
              })
            }
          >
            <option value="CENRO">CENRO</option>
            <option value="PENRO">PENRO</option>
            <option value="ROOT">ROOT (fallback)</option>
          </select>
        </div>

        <div>
          <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
            Display name
          </label>
          <input
            className={field}
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="e.g. CENRO Tuguegarao case files"
            required
          />
        </div>

        <div className="sm:col-span-2">
          <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
            Google Drive folder ID
          </label>
          <input
            className={field}
            value={form.driveId}
            onChange={(e) => setForm({ ...form, driveId: e.target.value })}
            placeholder="Paste folder ID or full Drive folder URL"
            required
          />
        </div>

        {form.type === "PENRO" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
              PENRO office
            </label>
            <select
              className={field}
              value={form.penroOfficeId}
              onChange={(e) =>
                setForm({ ...form, penroOfficeId: e.target.value })
              }
              required
            >
              <option value="">— Select PENRO —</option>
              {penroOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        {form.type === "CENRO" && (
          <div className="sm:col-span-2">
            <label className="mb-1 block text-[12px] font-medium text-[var(--muted)]">
              CENRO office
            </label>
            <select
              className={field}
              value={form.cenroOfficeId}
              onChange={(e) =>
                setForm({ ...form, cenroOfficeId: e.target.value })
              }
              required
            >
              <option value="">— Select CENRO —</option>
              {cenroOffices.map((o) => (
                <option key={o.id} value={o.id}>
                  {o.name}
                </option>
              ))}
            </select>
          </div>
        )}

        <div className="flex flex-wrap gap-2 sm:col-span-2">
          <button
            type="submit"
            disabled={saving}
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:opacity-90 disabled:opacity-60"
          >
            {saving
              ? "Saving…"
              : form.id
                ? "Update mapping"
                : "Save mapping"}
          </button>
          {form.id != null && (
            <button
              type="button"
              onClick={resetForm}
              className="rounded-lg border border-[var(--border-strong)] px-4 py-2 text-[13px] font-medium"
            >
              Cancel edit
            </button>
          )}
        </div>
      </form>

      <div>
        <h4 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
          Current mappings
        </h4>
        {loading ? (
          <p className="text-[13px] text-[var(--muted)]">Loading…</p>
        ) : folders.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">
            No mappings yet. Create one above.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)] rounded-lg border border-[var(--border)]">
            {folders.map((f) => (
              <li
                key={f.id}
                className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-[13px]"
              >
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    <span className="mr-1.5 rounded bg-[var(--shell)] px-1.5 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-[var(--muted)]">
                      {f.type}
                    </span>
                    {f.name}
                    {!f.isActive && (
                      <span className="ml-2 text-[11px] text-red-600">
                        (inactive)
                      </span>
                    )}
                  </p>
                  <p className="truncate text-[11px] text-[var(--muted)]">
                    {f.cenroOffice?.name || f.penroOffice?.name || "—"}
                    {" · "}
                    <code>{f.driveId}</code>
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    type="button"
                    onClick={() => startEdit(f)}
                    className="rounded-md border border-[var(--border-strong)] px-2.5 py-1 text-[12px] font-medium"
                  >
                    Edit
                  </button>
                  {f.isActive && (
                    <button
                      type="button"
                      onClick={() => onDeactivate(f.id)}
                      className="rounded-md border border-red-300 px-2.5 py-1 text-[12px] font-medium text-red-700 dark:border-red-800 dark:text-red-400"
                    >
                      Deactivate
                    </button>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
