"use client";

import { useTransition } from "react";
import { useToast } from "@/components/ui/Toast";
import {
  setPenroDefaultOfficer,
  setCenroParentPenro,
  setCenroDefaultOfficer,
} from "./mappingActions";

type Named = { id: number; name: string };

type PenroOfficeRow = Named & {
  defaultOfficerId: number | null;
  defaultOfficer: Named | null;
};

type CenroOfficeRow = Named & {
  penroOfficeId: number | null;
  defaultOfficerId: number | null;
  defaultOfficer: Named | null;
  penroOffice: Named | null;
};

const selectClass =
  "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--card)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)] focus:border-[var(--accent)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]/20 disabled:opacity-60";

export default function OfficeMappingPanel({
  penroOffices,
  penroOfficers,
  cenroOffices,
  cenroOfficers,
}: {
  penroOffices: PenroOfficeRow[];
  penroOfficers: Named[];
  cenroOffices: CenroOfficeRow[];
  cenroOfficers: Named[];
}) {
  const [pending, startTransition] = useTransition();
  const { error, flash } = useToast();

  function run(
    action: (fd: FormData) => Promise<void>,
    formData: FormData,
    okMsg: string,
  ) {
    startTransition(async () => {
      try {
        await action(formData);
        flash("success", okMsg, "Saved");
      } catch (err) {
        error(err instanceof Error ? err.message : "Could not save mapping.");
      }
    });
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-[15px] font-semibold text-[var(--foreground)]">
          Office &amp; officer mappings
        </h2>
        <p className="mt-1 text-[13px] text-[var(--muted)]">
          Configure cascading defaults for the New Apprehension form. Select a
          PENRO office → its default officer is auto-filled. CENRO offices under
          that PENRO appear in the CENRO dropdown; choosing a CENRO auto-fills
          its officer.
        </p>
      </div>

      {/* ── PENRO → default officer ───────────────────────── */}
      <div className="dash-panel p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          1. PENRO office → default PENRO officer
        </h3>
        {penroOffices.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">
            Add PENRO offices above first.
          </p>
        ) : (
          <ul className="space-y-2">
            {penroOffices.map((po) => (
              <li
                key={po.id}
                className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/40 px-3 py-2 sm:flex-row sm:items-center"
              >
                <span className="min-w-[8rem] shrink-0 text-[13px] font-medium text-[var(--foreground)]">
                  {po.name}
                </span>
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      setPenroDefaultOfficer,
                      new FormData(e.currentTarget),
                      `Default officer set for ${po.name}.`,
                    );
                  }}
                >
                  <input type="hidden" name="penroOfficeId" value={po.id} />
                  <select
                    name="officerId"
                    defaultValue={po.defaultOfficerId ?? ""}
                    disabled={pending}
                    className={selectClass}
                  >
                    <option value="">— No default —</option>
                    {penroOfficers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={pending}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── CENRO → parent PENRO (AOR) ────────────────────── */}
      <div className="dash-panel p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          2. CENRO office → parent PENRO (AOR)
        </h3>
        <p className="mb-3 text-[12px] text-[var(--muted)]">
          When a user selects a PENRO on New Record, only CENRO offices assigned
          here will appear in the CENRO dropdown.
        </p>
        {cenroOffices.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">
            Add CENRO offices above first.
          </p>
        ) : (
          <ul className="space-y-2">
            {cenroOffices.map((co) => (
              <li
                key={co.id}
                className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/40 px-3 py-2 sm:flex-row sm:items-center"
              >
                <span className="min-w-[10rem] shrink-0 text-[13px] font-medium text-[var(--foreground)]">
                  {co.name}
                </span>
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      setCenroParentPenro,
                      new FormData(e.currentTarget),
                      `AOR updated for ${co.name}.`,
                    );
                  }}
                >
                  <input type="hidden" name="cenroOfficeId" value={co.id} />
                  <select
                    name="penroOfficeId"
                    defaultValue={co.penroOfficeId ?? ""}
                    disabled={pending}
                    className={selectClass}
                  >
                    <option value="">— Unassigned —</option>
                    {penroOffices.map((po) => (
                      <option key={po.id} value={po.id}>
                        {po.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={pending}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ── CENRO → default officer ───────────────────────── */}
      <div className="dash-panel p-4 sm:p-5">
        <h3 className="mb-3 text-[14px] font-semibold text-[var(--foreground)]">
          3. CENRO office → default CENRO officer
        </h3>
        {cenroOffices.length === 0 ? (
          <p className="text-[13px] text-[var(--muted)]">
            Add CENRO offices above first.
          </p>
        ) : (
          <ul className="space-y-2">
            {cenroOffices.map((co) => (
              <li
                key={co.id}
                className="flex flex-col gap-2 rounded-md border border-[var(--border)] bg-[var(--background)]/40 px-3 py-2 sm:flex-row sm:items-center"
              >
                <span className="min-w-[10rem] shrink-0 text-[13px] font-medium text-[var(--foreground)]">
                  {co.name}
                  {co.penroOffice && (
                    <span className="ml-1.5 text-[11px] font-normal text-[var(--muted)]">
                      ({co.penroOffice.name})
                    </span>
                  )}
                </span>
                <form
                  className="flex min-w-0 flex-1 items-center gap-2"
                  onSubmit={(e) => {
                    e.preventDefault();
                    run(
                      setCenroDefaultOfficer,
                      new FormData(e.currentTarget),
                      `Default officer set for ${co.name}.`,
                    );
                  }}
                >
                  <input type="hidden" name="cenroOfficeId" value={co.id} />
                  <select
                    name="officerId"
                    defaultValue={co.defaultOfficerId ?? ""}
                    disabled={pending}
                    className={selectClass}
                  >
                    <option value="">— No default —</option>
                    {cenroOfficers.map((o) => (
                      <option key={o.id} value={o.id}>
                        {o.name}
                      </option>
                    ))}
                  </select>
                  <button
                    type="submit"
                    disabled={pending}
                    className="shrink-0 rounded-lg bg-[var(--accent)] px-3 py-1.5 text-[12px] font-medium text-white hover:opacity-90 disabled:opacity-60"
                  >
                    Save
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
