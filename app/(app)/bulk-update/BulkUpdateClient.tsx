"use client";

import { useMemo, useState } from "react";
import {
  parseBulkExcel,
  applyBulkUpdate,
  type BulkRow,
  type BulkFieldKey,
} from "./actions";
import {
  AttachmentUpload,
  type AttachmentUploadItem,
} from "@/components/ui/AttachmentUpload";
import { useToast } from "@/components/ui/Toast";

const EDITABLE_COLUMNS: { key: BulkFieldKey; label: string; wide?: boolean }[] = [
  { key: "cenroOffice", label: "CENRO office" },
  { key: "dateOfApprehension", label: "Date" },
  { key: "placeOfApprehension", label: "Place", wide: true },
  { key: "sourcePlace", label: "Source", wide: true },
  { key: "gpsCoordinates", label: "GPS" },
  { key: "landClassification", label: "Land class." },
  { key: "apprehendingAgency", label: "Officers" },
  { key: "claimantRespondent", label: "Claimant" },
  { key: "circumstances", label: "Circumstances", wide: true },
  { key: "custodianLocation", label: "Impounded" },
  { key: "otherAgencies", label: "Other agencies" },
  { key: "otherRemarks", label: "Other remarks", wide: true },
  { key: "remarks", label: "Remarks", wide: true },
  { key: "caseStatus", label: "Case status", wide: true },
  { key: "status", label: "Status" },
  { key: "docketNumber", label: "Docket #" },
  { key: "orderOfFinalityDate", label: "Finality date" },
  { key: "acpEndorsedToPenro", label: "ACP PENRO" },
  { key: "acpEndorsedToRo", label: "ACP RO" },
];

function changedKeys(row: BulkRow): Set<BulkFieldKey> {
  const set = new Set<BulkFieldKey>();
  for (const { key } of EDITABLE_COLUMNS) {
    const a = (row.current[key] ?? "").trim();
    const b = (row.next[key] ?? "").trim();
    // Only count fields present in next (from Excel)
    if (key in row.next && a !== b) set.add(key);
  }
  return set;
}

export default function BulkUpdateClient() {
  const [items, setItems] = useState<AttachmentUploadItem[]>([]);
  const [rows, setRows] = useState<BulkRow[]>([]);
  const [selected, setSelected] = useState<Set<number>>(new Set());
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [applying, setApplying] = useState(false);
  const [result, setResult] = useState<{
    updated: number;
    failed: { id: number; message: string }[];
  } | null>(null);
  const { success, error } = useToast();

  const selectableIds = useMemo(
    () => rows.filter((r) => r.found && !r.error).map((r) => r.id),
    [rows],
  );

  async function handleParse() {
    const file = items[0]?.file;
    if (!file) return;

    setLoading(true);
    setResult(null);
    setParseErrors([]);
    setRows([]);
    setSelected(new Set());

    setItems((prev) =>
      prev.map((it) => ({ ...it, status: "uploading" as const, error: undefined })),
    );

    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await parseBulkExcel(formData);
      setRows(res.rows);
      setParseErrors(res.errors);
      const okIds = res.rows.filter((r) => r.found && !r.error).map((r) => r.id);
      setSelected(new Set(okIds));
      setItems((prev) =>
        prev.map((it) => ({
          ...it,
          status: res.rows.length ? ("complete" as const) : ("failed" as const),
          error: res.rows.length ? undefined : res.errors[0],
        })),
      );
      if (!res.rows.length) {
        error(res.errors[0] || "No rows parsed.", "Parse failed");
      } else {
        success(
          `${res.rows.length} row${res.rows.length === 1 ? "" : "s"} loaded. Review and apply.`,
          "File parsed",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Parse failed.";
      setParseErrors([message]);
      setItems((prev) =>
        prev.map((it) => ({ ...it, status: "failed" as const, error: message })),
      );
      error(message, "Parse failed");
    } finally {
      setLoading(false);
    }
  }

  function updateCell(id: number, key: BulkFieldKey, value: string) {
    setRows((prev) =>
      prev.map((r) =>
        r.id === id ? { ...r, next: { ...r.next, [key]: value } } : r,
      ),
    );
  }

  function toggleAll(on: boolean) {
    setSelected(on ? new Set(selectableIds) : new Set());
  }

  function toggleOne(id: number) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApply() {
    const payload = rows
      .filter((r) => selected.has(r.id) && r.found && !r.error)
      .map((r) => ({
        id: r.id,
        fields: { ...r.next },
      }));

    if (!payload.length) {
      error("Select at least one valid row to update.", "Nothing to apply");
      return;
    }

    setApplying(true);
    setResult(null);
    try {
      const res = await applyBulkUpdate(payload);
      setResult(res);
      if (res.failed.length === 0) {
        success(
          `${res.updated} record${res.updated === 1 ? "" : "s"} updated.`,
          "Bulk update complete",
        );
      } else {
        error(
          `${res.updated} updated, ${res.failed.length} failed.`,
          "Partial success",
        );
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : "Apply failed.";
      error(message, "Apply failed");
    } finally {
      setApplying(false);
    }
  }

  const hasFile = items.length > 0 && !!items[0]?.file;

  return (
    <div className="space-y-5">
      <div className="dash-panel p-4 text-[13px] text-[var(--muted)] leading-relaxed">
        <p className="font-medium text-[var(--foreground)]">How to use</p>
        <ol className="mt-2 list-decimal space-y-1 pl-5">
          <li>
            Open{" "}
            <a href="/records/full" className="text-[var(--accent)] underline">
              Full view
            </a>{" "}
            and export to Excel (or use any sheet with an <strong>ID</strong> column).
          </li>
          <li>Edit the cells you want to change. Keep the ID column intact.</li>
          <li>Upload the file here, review the table, tweak values if needed, then apply.</li>
        </ol>
        <p className="mt-2">
          Nested items (forest products, conveyances, equipment) are not updated here —
          edit those on the individual record page.
        </p>
      </div>

      <AttachmentUpload
        value={items}
        onValueChange={(next) => {
          setItems(next);
          setRows([]);
          setSelected(new Set());
          setParseErrors([]);
          setResult(null);
        }}
        onFilesRejected={(_files, reason) => {
          if (reason === "type") {
            error("Only Excel files (.xlsx, .xls) are accepted.", "Invalid file");
          } else if (reason === "too-large") {
            error("File is too large.", "Invalid file");
          }
        }}
        accept=".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        multiple={false}
        maxFiles={1}
        maxFileSize={50 * 1024 * 1024}
        disabled={loading || applying}
        title="Drag and drop or browse your Excel file"
        description="Accepts .xlsx and .xls · Maximum 50 MB · Must include an ID column"
        attachmentsLabel="Selected file"
      />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          disabled={!hasFile || loading}
          onClick={handleParse}
          className="rounded-md bg-[var(--accent)] px-4 py-2 text-[13px] font-medium text-white hover:bg-[var(--accent-hover)] disabled:cursor-not-allowed disabled:opacity-50"
        >
          {loading ? "Parsing…" : "Parse Excel"}
        </button>
        {rows.length > 0 && (
          <button
            type="button"
            disabled={applying || selected.size === 0}
            onClick={handleApply}
            className="rounded-md border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--shell)] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {applying
              ? "Applying…"
              : `Apply updates (${selected.size} selected)`}
          </button>
        )}
      </div>

      {parseErrors.length > 0 && (
        <div className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-[13px] text-amber-900 dark:text-amber-200">
          <p className="font-medium">Parse notes</p>
          <ul className="mt-1 list-disc pl-5">
            {parseErrors.slice(0, 20).map((e, i) => (
              <li key={i}>{e}</li>
            ))}
          </ul>
        </div>
      )}

      {result && (
        <div className="rounded-lg border border-[var(--border)] bg-[var(--shell)] px-4 py-3 text-[13px]">
          <p className="font-medium text-[var(--foreground)]">
            Updated {result.updated} record{result.updated === 1 ? "" : "s"}
            {result.failed.length > 0 && `, ${result.failed.length} failed`}
          </p>
          {result.failed.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-[var(--danger)]">
              {result.failed.map((f) => (
                <li key={f.id}>
                  ID {f.id}: {f.message}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {rows.length > 0 && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2 text-[13px] text-[var(--muted)]">
            <span>
              {rows.length} row{rows.length === 1 ? "" : "s"} · {selected.size}{" "}
              selected
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                className="text-[var(--accent)] underline"
                onClick={() => toggleAll(true)}
              >
                Select all
              </button>
              <button
                type="button"
                className="text-[var(--accent)] underline"
                onClick={() => toggleAll(false)}
              >
                Clear
              </button>
            </div>
          </div>

          <div
            className="app-table-shell relative overflow-auto"
            style={{ maxHeight: "65vh" }}
          >
            <table className="w-full border-collapse text-left text-[12.5px]" style={{ minWidth: "1800px" }}>
              <thead className="sticky top-0 z-20 bg-[var(--accent)]">
                <tr className="border-b border-[var(--border)] bg-[var(--accent)] text-[11px] font-semibold uppercase tracking-wide text-white">
                  <th className="sticky left-0 z-30 bg-[var(--accent)] px-3 py-2.5 font-semibold text-white">
                    <input
                      type="checkbox"
                      checked={
                        selectableIds.length > 0 &&
                        selectableIds.every((id) => selected.has(id))
                      }
                      onChange={(e) => toggleAll(e.target.checked)}
                      aria-label="Select all"
                    />
                  </th>
                  <th className="bg-[var(--accent)] px-3 py-2.5 font-semibold text-white">ID</th>
                  <th className="bg-[var(--accent)] px-3 py-2.5 font-semibold text-white">Changes</th>
                  {EDITABLE_COLUMNS.map((c) => (
                    <th
                      key={c.key}
                      className={`bg-[var(--accent)] px-3 py-2.5 font-semibold text-white ${
                        c.wide ? "min-w-[140px]" : "whitespace-nowrap"
                      }`}
                    >
                      {c.label}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => {
                  const diffs = changedKeys(r);
                  const canSelect = r.found && !r.error;
                  return (
                    <tr
                      key={r.id}
                      className={`border-b border-[var(--border)] last:border-0 ${
                        !canSelect ? "opacity-60" : ""
                      }`}
                    >
                      <td className="sticky left-0 z-10 bg-[var(--card)] px-3 py-1.5">
                        <input
                          type="checkbox"
                          disabled={!canSelect}
                          checked={selected.has(r.id)}
                          onChange={() => toggleOne(r.id)}
                          aria-label={`Select record ${r.id}`}
                        />
                      </td>
                      <td className="px-3 py-1.5 font-medium tabular-nums">
                        <a
                          href={`/records/${r.id}`}
                          className="text-[var(--accent)] hover:underline"
                          target="_blank"
                          rel="noreferrer"
                        >
                          {r.id}
                        </a>
                        {r.error && (
                          <p className="mt-0.5 text-[11px] text-[var(--danger)]">{r.error}</p>
                        )}
                      </td>
                      <td className="px-3 py-1.5 tabular-nums text-[var(--muted)]">
                        {diffs.size || "—"}
                      </td>
                      {EDITABLE_COLUMNS.map((c) => {
                        const isChanged = diffs.has(c.key);
                        const value =
                          c.key in r.next
                            ? (r.next[c.key] ?? "")
                            : (r.current[c.key] ?? "");
                        return (
                          <td key={c.key} className="px-1 py-1">
                            <input
                              type="text"
                              value={value}
                              disabled={!canSelect}
                              onChange={(e) =>
                                updateCell(r.id, c.key, e.target.value)
                              }
                              title={
                                isChanged
                                  ? `Was: ${r.current[c.key] || "(empty)"}`
                                  : undefined
                              }
                              className={`w-full min-w-[100px] rounded border px-2 py-1.5 text-[12.5px] outline-none focus:border-[var(--accent)] ${
                                isChanged
                                  ? "border-amber-500/50 bg-amber-500/10 text-[var(--foreground)]"
                                  : "border-[var(--border)] bg-[var(--shell)] text-[var(--foreground)]"
                              }`}
                            />
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
