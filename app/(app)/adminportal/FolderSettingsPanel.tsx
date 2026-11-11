"use client";

import { useCallback, useEffect, useState } from "react";

type OfficeOpt = { id: number; name: string; penroOfficeId?: number | null };

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

type DocTypeInfo = { key: string; label: string; description: string };

type Settings = {
  parentFolderId: string | null;
  folders: Record<string, string | null>;
  googleConnected: boolean;
};

const emptyForm = {
  id: null as number | null,
  name: "",
  driveId: "",
  type: "CENRO" as MappedFolder["type"],
  penroOfficeId: "",
  cenroOfficeId: "",
};

const field =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20";

/**
 * Super Admin: map PENRO/CENRO offices to Google Drive folders (primary),
 * plus optional global fallback folders per document type (legacy).
 */
export default function FolderSettingsPanel({
  penroOffices,
  cenroOffices,
  docTypes = [],
}: {
  penroOffices: OfficeOpt[];
  cenroOffices: OfficeOpt[];
  docTypes?: DocTypeInfo[];
}) {
  const [folders, setFolders] = useState<MappedFolder[]>([]);
  const [form, setForm] = useState(emptyForm);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ kind: "ok" | "bad"; text: string } | null>(
    null,
  );

  // Legacy doc-type fallbacks (optional)
  const [settings, setSettings] = useState<Settings | null>(null);
  const [legacyInputs, setLegacyInputs] = useState<Record<string, string>>({});
  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showLegacy, setShowLegacy] = useState(false);

  const loadMappings = useCallback(async () => {
    setLoading(true);
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

  const loadLegacy = useCallback(async () => {
    if (!docTypes.length) return;
    try {
      const res = await fetch("/api/settings");
      const s = await res.json();
      if (!res.ok) return;
      setSettings(s);
      setLegacyInputs((cur) => {
        const next = { ...cur };
        for (const d of docTypes) {
          if (next[d.key] === undefined) next[d.key] = s.folders?.[d.key] ?? "";
        }
        next.__parent = cur.__parent ?? s.parentFolderId ?? "";
        return next;
      });
    } catch {
      /* optional section */
    }
  }, [docTypes]);

  useEffect(() => {
    loadMappings();
    loadLegacy();
  }, [loadMappings, loadLegacy]);

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
        text: form.id ? "Office folder mapping updated." : "Office folder mapping saved.",
      });
      resetForm();
      await loadMappings();
    } catch (err: any) {
      setMsg({ kind: "bad", text: err.message || "Save failed" });
    } finally {
      setSaving(false);
    }
  }

  async function onDeactivate(id: number) {
    if (
      !confirm(
        "Deactivate this mapping? New uploads will no longer use this folder.",
      )
    ) {
      return;
    }
    setMsg(null);
    try {
      const res = await fetch(`/api/drive/folders?id=${id}`, {
        method: "DELETE",
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Failed to deactivate");
      setMsg({ kind: "ok", text: "Mapping deactivated." });
      if (form.id === id) resetForm();
      await loadMappings();
    } catch (err: any) {
      setMsg({ kind: "bad", text: err.message || "Failed to deactivate" });
    }
  }

  async function saveLegacy(key: string, label: string) {
    setBusyKey(key);
    setMsg(null);
    try {
      const value = (legacyInputs[key] ?? "").trim();
      const isParent = key === "__parent";
      const res = await fetch("/api/settings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          isParent
            ? { parentFolderId: value || null }
            : { folderKey: key, folderId: value || null },
        ),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Save failed");
      setMsg({
        kind: "ok",
        text: value
          ? `${label} folder saved.`
          : `${label} folder cleared.`,
      });
      await loadLegacy();
    } catch (e: any) {
      setMsg({ kind: "bad", text: e.message || "Save failed" });
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="dash-panel space-y-5 p-4 sm:p-6">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Folder settings — office mappings
        </h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Map each <strong>PENRO</strong> or <strong>CENRO</strong> to a Google
          Drive folder. Uploads for a record use:{" "}
          <strong>CENRO folder → parent PENRO → ROOT</strong>. Paste a folder
          ID or full Drive URL.
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

      {/* ── Primary: office → Drive folder ── */}
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
            <option value="ROOT">ROOT (global fallback)</option>
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
            Google Drive folder ID or URL
          </label>
          <input
            className={field}
            value={form.driveId}
            onChange={(e) => setForm({ ...form, driveId: e.target.value })}
            placeholder="Folder ID or https://drive.google.com/drive/folders/…"
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
            className="rounded-lg bg-[var(--accent)] px-4 py-2 text-[13.5px] font-semibold text-white hover:opacity-90 disabled:opacity-60"
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
        <h3 className="mb-2 text-[13px] font-semibold text-[var(--foreground)]">
          Current office mappings
        </h3>
        {loading ? (
          <p className="text-[13px] text-[var(--muted)]">Loading…</p>
        ) : folders.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">
            No office mappings yet. Create one above.
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

      {/* ── Optional: legacy doc-type folders ── */}
      {docTypes.length > 0 && (
        <div className="border-t border-[var(--border)] pt-4">
          <button
            type="button"
            onClick={() => setShowLegacy((v) => !v)}
            className="text-[13px] font-medium text-[var(--accent)] hover:underline"
          >
            {showLegacy ? "Hide" : "Show"} optional document-type folders
            (legacy fallback)
          </button>
          {showLegacy && (
            <div className="mt-3 space-y-3">
              <p className="text-[12px] text-[var(--muted)]">
                Used only when no PENRO/CENRO/ROOT office folder is mapped.
                Prefer office mappings above.
              </p>
              {docTypes.map((d) => {
                const value = legacyInputs[d.key] ?? "";
                const saved = settings?.folders?.[d.key] ?? null;
                const busy = busyKey === d.key;
                return (
                  <div
                    key={d.key}
                    className="rounded-lg border border-[var(--border)] p-3"
                  >
                    <p className="text-[13px] font-medium">{d.label}</p>
                    <p className="text-[11px] text-[var(--muted)]">
                      {d.description}
                      {saved ? (
                        <>
                          {" · "}
                          <a
                            href={`https://drive.google.com/drive/folders/${saved}`}
                            target="_blank"
                            rel="noreferrer"
                            className="text-[var(--accent)] hover:underline"
                          >
                            Open saved folder
                          </a>
                        </>
                      ) : null}
                    </p>
                    <div className="mt-2 flex flex-wrap gap-2">
                      <input
                        className={field + " min-w-[200px] flex-1"}
                        value={value}
                        onChange={(e) =>
                          setLegacyInputs((s) => ({
                            ...s,
                            [d.key]: e.target.value,
                          }))
                        }
                        placeholder="Folder ID or URL"
                      />
                      <button
                        type="button"
                        disabled={busy}
                        onClick={() => saveLegacy(d.key, d.label)}
                        className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                      >
                        {busy ? "Saving…" : "Save"}
                      </button>
                    </div>
                  </div>
                );
              })}
              <div className="rounded-lg border border-[var(--border)] p-3">
                <p className="text-[13px] font-medium">
                  General folder (legacy parent)
                </p>
                <div className="mt-2 flex flex-wrap gap-2">
                  <input
                    className={field + " min-w-[200px] flex-1"}
                    value={legacyInputs.__parent ?? ""}
                    onChange={(e) =>
                      setLegacyInputs((s) => ({
                        ...s,
                        __parent: e.target.value,
                      }))
                    }
                    placeholder="Folder ID or URL"
                  />
                  <button
                    type="button"
                    disabled={busyKey === "__parent"}
                    onClick={() =>
                      saveLegacy("__parent", "General folder")
                    }
                    className="rounded-lg bg-[var(--accent)] px-3 py-2 text-[13px] font-semibold text-white disabled:opacity-50"
                  >
                    {busyKey === "__parent" ? "Saving…" : "Save"}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
