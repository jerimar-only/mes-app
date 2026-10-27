import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="space-y-6">
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
