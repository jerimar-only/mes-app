"use client";

import { useEffect, useState, useCallback } from "react";
import Link from "next/link";

type RecordRow = {
  id: number;
  year: number;
  placeOfApprehension: string | null;
  dateOfApprehension: string | null;
  docketNumber: string | null;
  status: string;
  createdAt: string;   // ← add this
  cenroOffice: { name: string };
  _count: { items: number };
};

const STATUS_LABEL: Record<string, string> = {
  FOR_RESOLUTION: "For resolution",
  UNDER_ADJUDICATION: "Under adjudication",
  CONFISCATED: "Confiscated",
  DONATED: "Donated",
  RELEASED: "Released",
  UNKNOWN: "Needs review",
};

export default function RecordsClient({
  initialQuery,
}: {
  initialQuery: Record<string, string | undefined>;
}) {
  const [records, setRecords] = useState<RecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Resolve the page size the form asked for
  const pageSizeParam = initialQuery.pageSize ?? "25";
  const pageSize =
    pageSizeParam === "all"
      ? 500
      : Math.min(500, Math.max(10, parseInt(pageSizeParam, 10) || 25));

  const loadPage = useCallback(
    async (p: number) => {
      setLoading(true);
      setError(null);

      try {
        const qs = new URLSearchParams();
        Object.entries(initialQuery).forEach(([k, v]) => {
          if (v) qs.set(k, v);
        });
        qs.set("page", String(p));
        qs.set("pageSize", pageSizeParam); // keep the original value ("all" or number)

        const data = await fetch(`/api/records?${qs}`).then((r) => r.json());
        if (data.error) throw new Error(data.error);

        setRecords(data.records);
        setTotal(data.total);
        setPage(data.page);
        setTotalPages(data.totalPages);
      } catch (e: any) {
        setError(e.message || "Failed to load records");
      } finally {
        setLoading(false);
      }
    },
    [initialQuery, pageSizeParam]
  );

  useEffect(() => {
    loadPage(1);
  }, [loadPage]);

  return (
    <div className="space-y-5">
      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-[14px] text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      )}

      {/* Summary + pagination controls */}
      <div className="flex flex-wrap items-center justify-between gap-3 text-[13px] text-[var(--muted)]">
        <span>
          {loading
            ? "Loading…"
            : `${total.toLocaleString()} record${total === 1 ? "" : "s"}`}
        </span>

        {totalPages > 1 && (
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || loading}
              onClick={() => loadPage(page - 1)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-40"
            >
              Prev
            </button>
            <span className="tabular-nums">
              Page {page} of {totalPages}
            </span>
            <button
              type="button"
              disabled={page >= totalPages || loading}
              onClick={() => loadPage(page + 1)}
              className="rounded-md border border-[var(--border)] px-3 py-1.5 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>

      {/* Table */}
      <div className="overflow-auto rounded-lg border border-[var(--border)] bg-[var(--card)] shadow-sm">
        <table className="w-full text-left text-[13px]">
          <thead className="border-b border-[var(--border)] bg-[var(--background)] text-[11px] uppercase tracking-wide text-[var(--muted)]">
              <tr>
                <th className="px-4 py-2.5 font-semibold">Year</th>
                <th className="px-4 py-2.5 font-semibold">Office</th>
                <th className="px-4 py-2.5 font-semibold">Date / Place</th>
                <th className="px-4 py-2.5 font-semibold">Items</th>
                <th className="px-4 py-2.5 font-semibold">Status</th>
                <th className="px-4 py-2.5 font-semibold">Docket No.</th>
                <th className="px-4 py-2.5 font-semibold">Created</th>
              </tr>
          </thead>
          <tbody>
            {records.map((r) => (
              <tr key={r.id} className="border-b border-[var(--border)] last:border-0">
                <td className="px-4 py-2.5">{r.year}</td>
                <td className="px-4 py-2.5">{r.cenroOffice.name}</td>
                <td className="px-4 py-2.5">
                  <Link
                    href={`/records/${r.id}`}
                    className="text-[var(--accent)] hover:underline"
                  >
                    {r.placeOfApprehension || r.dateOfApprehension || "—"}
                  </Link>
                </td>
                <td className="px-4 py-2.5 text-[var(--muted)]">{r._count.items}</td>
                <td className="px-4 py-2.5">
                  {STATUS_LABEL[r.status] ?? r.status}
                </td>
                <td className="px-4 py-2.5 text-[var(--muted)]">
                  {r.docketNumber || "—"}
                </td>
                <td className="px-4 py-2.5 text-[var(--muted)] whitespace-nowrap">
                  {r.createdAt
                    ? new Date(r.createdAt).toLocaleDateString("en-PH", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                      })
                    : "—"}
                </td>
              </tr>
            ))}

            {!loading && records.length === 0 && (
              <tr>
                <td
                  colSpan={7}
                  className="px-4 py-12 text-center text-[var(--muted)]"
                >
                  No records found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}