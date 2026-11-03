import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { getOfficeScope } from "@/lib/officeScope";
import { permissions, type Role } from "@/lib/permissions";
import UploadForm from "./UploadForm";

export default async function UploadPage() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (!permissions.uploadExcel(session.role as Role)) {
    redirect("/dashboard");
  }

  const scope = await getOfficeScope();

  return (
    <div className="space-y-6">
      {scope?.isCenro && scope.officeName ? (
        <div className="rounded-xl border border-[var(--accent)]/25 bg-[var(--accent-soft)] px-4 py-3 text-[13px] text-[var(--foreground)]">
          <p className="font-semibold">CENRO bulk upload — {scope.officeName}</p>
          <p className="mt-1 text-[var(--muted)]">
            Rows are saved only under <strong>{scope.officeName}</strong>. Office
            headings for other CENROs in the file are ignored or rejected.
          </p>
        </div>
      ) : null}

      <a
        href="/apprehension_upload_template.xlsx"
        download
        className="inline-block rounded-md border border-[var(--border-strong)] bg-white px-4 py-2 text-[14px] text-[var(--accent)] hover:bg-[var(--shell)]"
      >
        Download template (.xlsx)
      </a>

      <UploadForm />
    </div>
  );
}
