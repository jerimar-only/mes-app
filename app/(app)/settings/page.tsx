import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import GoogleDriveSettings from "@/components/settings/GoogleDriveSettings";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const session = await getSession();
  if (!session) redirect("/login");

  const isSuperAdmin = session.role === "SUPERADMIN";
  // All signed-in users can see status; only Super Admin can connect/change
  return (
    <div className="mx-auto max-w-2xl px-4 py-6 sm:px-6">
      <div className="mb-6">
        <h1 className="text-[22px] font-semibold tracking-tight text-[var(--foreground)]">
          Settings
        </h1>
        <p className="mt-1 text-[14px] text-[var(--muted)]">
          Google Drive connection for case document uploads.
        </p>
      </div>
      <GoogleDriveSettings isSuperAdmin={isSuperAdmin} />
    </div>
  );
}
