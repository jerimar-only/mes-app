import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getOfficeScope } from "@/lib/officeScope";

function paramOne(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  const s = Array.isArray(value) ? value[0] : value;
  const t = s?.trim();
  return t ? t : undefined;
}

export default async function ReceiptIndexPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const raw = await searchParams;
  const q = paramOne(raw.q) ?? "";
  const scope = await getOfficeScope();

  const where: any = { isDeleted: false };
  if (scope?.allowedOfficeIds) {
    where.cenroOfficeId = { in: scope.allowedOfficeIds };
  }
  if (q) {
    const idNum = parseInt(q, 10);
    where.OR = [
      ...(Number.isFinite(idNum) ? [{ id: idNum }] : []),
      { placeOfApprehension: { contains: q, mode: "insensitive" } },
      { docketNumber: { contains: q, mode: "insensitive" } },
      { claimantRespondent: { contains: q, mode: "insensitive" } },
      { penroOffice: { contains: q, mode: "insensitive" } },
      { cenroOffice: { name: { contains: q, mode: "insensitive" } } },
    ];
  }

  const records = await prisma.apprehensionRecord.findMany({
    where,
    include: { cenroOffice: true },
    orderBy: [{ year: "desc" }, { id: "desc" }],
    take: 50,
  });

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-xl font-semibold tracking-tight text-[var(--foreground)]">
          Print apprehension receipt
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Search for a record, then open the printable receipt report.
        </p>
      </div>

      <form method="get" className="flex flex-col gap-3 sm:flex-row">
        <input
          type="search"
          name="q"
          defaultValue={q}
          placeholder="Search by ID, place, docket, claimant, office…"
          className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-3.5 py-2.5 text-[14px] text-[var(--foreground)] placeholder:text-[var(--muted)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20"
        />
        <button
          type="submit"
          className="shrink-0 rounded-lg bg-[var(--accent)] px-5 py-2.5 text-[14px] font-medium text-white hover:bg-[var(--accent-hover)]"
        >
          Search
        </button>
      </form>

      <div className="overflow-hidden rounded-xl border border-[var(--border)] bg-[var(--card)]">
        {records.length === 0 ? (
          <p className="px-4 py-8 text-center text-[14px] text-[var(--muted)]">
            No records found. Try a different search.
          </p>
        ) : (
          <ul className="divide-y divide-[var(--border)]">
            {records.map((r) => (
              <li
                key={r.id}
                className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <p className="text-[14px] font-medium text-[var(--foreground)]">
                    #{r.id}
                    {r.docketNumber ? (
                      <span className="ml-2 font-normal text-[var(--muted)]">
                        Docket {r.docketNumber}
                      </span>
                    ) : null}
                  </p>
                  <p className="mt-0.5 truncate text-[13px] text-[var(--muted)]">
                    {r.cenroOffice?.name || "—"} · {r.dateOfApprehension || "—"} ·{" "}
                    {r.placeOfApprehension || "—"}
                  </p>
                </div>
                <Link
                  href={`/receipt/${r.id}`}
                  className="inline-flex shrink-0 items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-4 py-2 text-[13px] font-medium text-[var(--accent)] hover:bg-[var(--shell)]"
                >
                  Open receipt →
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
