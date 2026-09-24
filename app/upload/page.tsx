import UploadForm from "./UploadForm";

export default function UploadPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Upload apprehensions from Excel</h1>
        <p className="mt-1 text-[15px] text-[#5B6156]">
          Use the template below, fill in your records, then upload the completed file.
        </p>
      </div>

      <a
        href="/apprehension_upload_template.xlsx"
        download
        className="inline-block rounded-md border border-[#D8D3C4] bg-white px-4 py-2 text-[14px] text-[#4A6741] hover:bg-[#F0EDE3]"
      >
        Download template (.xlsx)
      </a>

      <UploadForm />
    </div>
  );
}
