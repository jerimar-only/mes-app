import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload apprehensions from Excel</h1>
        <p className="mt-1 text-[15px] text-[var(--muted)]">
          Use the template below, fill in your records, then upload the completed file.
        </p>
      </div>

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
