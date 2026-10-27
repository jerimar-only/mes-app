"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import ConfirmModal from "@/components/ui/ConfirmModal";
import { useToast } from "@/components/ui/Toast";
import {
  searchRecordsForDelete,
  bulkDeleteRecords,
  getBulkDeleteFilters,
  type BulkDeleteRow,
} from "./actions";

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

const inputClass =
  "w-full rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-3 py-2 text-[13px] text-[var(--foreground)]";

export default function BulkDeleteClient() {
  const [rows, setRows] = useState<BulkDeleteRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [offices, setOffices] = useState<{ id: number; name: string }[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [year, setYear] = useState("");
  const [office, setOffice] = useState("");
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const { success, error } = useToast();

  useEffect(() => {
    getBulkDeleteFilters().then((f) => {
      setOffices(f.offices);
      setYears(f.years);
    });
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    setSelected(new Set());
    try {
      const res = await searchRecordsForDelete({ year, office, status, q });
      if (res.error) {
        error(res.error);
        setRows([]);
      } else {
        setRows(res.rows);
      }
    } catch (err) {
      error(err instanceof Error ? err.message : "Failed to load records.");
      setRows([]);
    } finally {
      setLoading(false);
    }
  }, [year, office, status, q, error]);

  useEffect(() => {
    load();
  }, [load]);

  const allIds = useMemo(() => rows.map((r) => r.id), [rows]);
  const allSelected = allIds.length > 0 && allIds.every((id) => selected.has(id));

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(allIds) : new Set());
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleDelete() {
    const ids = [...selected];
    if (!ids.length) {
      error("Select at least one record to delete.");
      setConfirmOpen(false);
      return;
    }

    setDeleting(true);
    try {
      const res = await bulkDeleteRecords(ids);
      if (res.deleted > 0) {
        success(
          `${res.deleted} record${res.deleted === 1 ? "" : "s"} deleted.`,
          "Deleted",
        );
      }
      if (res.failed.length) {
        error(
          res.failed
            .slice(0, 3)
            .map((f) => (f.id ? `#${f.id}: ${f.message}` : f.message))
            .join(" · "),
          "Some failed",
        );
      }
      setConfirmOpen(false);
      setSelected(new Set());
      await load();
    } catch (err) {
      error(err instanceof Error ? err.message : "Bulk delete failed.");
      setConfirmOpen(false);
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="app-filters grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Year
          </label>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={inputClass}>
            <option value="">All years</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            CENRO office
          </label>
          <select value={office} onChange={(e) => setOffice(e.target.value)} className={inputClass}>
            <option value="">All offices</option>
            {offices.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Status
          </label>
          <select value={status} onChange={(e) => setStatus(e.target.value)} className={inputClass}>
            <option value="">All statuses</option>
            {Object.entries(STATUS_LABEL).map(([k, label]) => (
              <option key={k} value={k}>
                {label}
              </option>
            ))}
          </select>
        </div>
        <div className="lg:col-span-2">
          <label className="mb-1 block text-[11px] font-medium uppercase tracking-wide text-[var(--muted)]">
            Search
          </label>
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Place, docket, remarks…"
            className={inputClass}
          />
        </div>
      </div>

      {/* Actions bar */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-[13px] text-[var(--muted)]">
          {loading
            ? "Loading…"
            : `${rows.length.toLocaleString()} active record${rows.length === 1 ? "" : "s"} (max 500)`}
          {selected.size > 0 && (
            <span className="ml-2 font-medium text-[var(--foreground)]">
              · {selected.size} selected
            </span>
          )}
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => toggleAll(!allSelected)}
            disabled={!rows.length || loading}
            className="rounded-md border border-[var(--border)] px-3 py-1.5 text-[13px] disabled:opacity-40"
          >
            {allSelected ? "Deselect all" : "Select all"}
          </button>
          <button
            type="button"
            onClick={() => setConfirmOpen(true)}
            disabled={selected.size === 0 || deleting || loading}
            className="rounded-md border border-red-500/40 bg-[var(--card)] px-4 py-1.5 text-[13px] font-medium text-red-700 hover:bg-red-500/10 disabled:opacity-40 dark:text-red-400"
          >
            Delete selected ({selected.size})
          </button>
        </div>
      </div>

      {/* Table */}
      <div className="app-table-shell overflow-auto">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border)] bg-[var(--accent)] text-[11px] font-semibold uppercase tracking-wide text-white">
            <tr>
              <th className="w-10 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={(e) => toggleAll(e.target.checked)}
                  disabled={!rows.length}
                  aria-label="Select all"
                />
              </th>
              <th className="px-3 py-2.5 font-semibold">ID</th>
              <th className="px-3 py-2.5 font-semibold">Year</th>
              <th className="px-3 py-2.5 font-semibold">Office</th>
              <th className="px-3 py-2.5 font-semibold">Date / Place</th>
              <th className="px-3 py-2.5 font-semibold">Status</th>
              <th className="px-3 py-2.5 font-semibold">Docket</th>
            </tr>
          </thead>
          <tbody>
            {loading && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  Loading records…
                </td>
              </tr>
            )}
            {!loading && rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-[var(--muted)]">
                  No active records match these filters.
                </td>
              </tr>
            )}
            {!loading &&
              rows.map((r) => (
                <tr
                  key={r.id}
                  className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--shell)]"
                >
                  <td className="px-3 py-2">
                    <input
                      type="checkbox"
                      checked={selected.has(r.id)}
                      onChange={() => toggleOne(r.id)}
                      aria-label={`Select record ${r.id}`}
                    />
                  </td>
                  <td className="px-3 py-2 tabular-nums text-[var(--muted)]">{r.id}</td>
                  <td className="px-3 py-2 tabular-nums">{r.year}</td>
                  <td className="px-3 py-2">{r.cenroOffice}</td>
                  <td className="px-3 py-2">
                    <div className="max-w-[240px]">
                      {r.dateOfApprehension && (
                        <div className="text-[12px] text-[var(--muted)]">{r.dateOfApprehension}</div>
                      )}
                      <div className="truncate">{r.placeOfApprehension || "—"}</div>
                    </div>
                  </td>
                  <td className="px-3 py-2">{STATUS_LABEL[r.status] ?? r.status}</td>
                  <td className="px-3 py-2">{r.docketNumber || "—"}</td>
                </tr>
              ))}
          </tbody>
        </table>
      </div>

      <ConfirmModal
        open={confirmOpen}
        title={`Delete ${selected.size} record${selected.size === 1 ? "" : "s"}?`}
        message="This cannot be undone from this screen. Selected records will be marked as deleted (same as the Delete button on a record page). They will no longer appear in the dashboard or reports."
        confirmLabel={deleting ? "Deleting…" : "Delete"}
        cancelLabel="Cancel"
        danger
        onConfirm={handleDelete}
        onCancel={() => !deleting && setConfirmOpen(false)}
      />
    </div>
  );
}
