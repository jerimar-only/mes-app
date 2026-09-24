"use client";

import { useState } from "react";
import { uploadExcel } from "./actions";

export default function UploadForm() {
  const [status, setStatus] = useState<"idle" | "uploading" | "done">("idle");
  const [result, setResult] = useState<{ imported: number; errors: { row: number; message: string }[] } | null>(null);
  const [fileName, setFileName] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const formData = new FormData(form);
    setStatus("uploading");
    try {
      const res = await uploadExcel(formData);
      setResult(res);
      setStatus("done");
    } catch (err: any) {
      setResult({ imported: 0, errors: [{ row: 0, message: err.message || "Upload failed." }] });
      setStatus("done");
    }
  }

  return (
    <div className="max-w-xl space-y-6">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-[13px] font-medium text-[#5B6156]">
            Excel file (.xlsx)
          </label>
          <input
            type="file"
            name="file"
            accept=".xlsx,.xls"
            required
            onChange={(e) => setFileName(e.target.files?.[0]?.name ?? "")}
            className="w-full rounded-md border border-[#D8D3C4] bg-white px-3 py-2 text-[14px]"
          />
        </div>
        <button
          type="submit"
          disabled={status === "uploading"}
          className="rounded-md bg-[#4A6741] px-5 py-2.5 text-[14px] text-white hover:bg-[#3D5636] disabled:opacity-50"
        >
          {status === "uploading" ? "Uploading..." : "Upload and import"}
        </button>
      </form>

      {result && (
        <div className="rounded-lg border border-[#E9E5D8] bg-white p-4">
          <p className="text-[14px] font-medium">
            {result.imported} record{result.imported === 1 ? "" : "s"} imported successfully.
          </p>
          {result.errors.length > 0 && (
            <div className="mt-3">
              <p className="text-[13px] font-medium text-[#993C1D]">
                {result.errors.length} row{result.errors.length === 1 ? "" : "s"} had problems:
              </p>
              <ul className="mt-2 space-y-1 text-[13px] text-[#5B6156]">
                {result.errors.map((e, i) => (
                  <li key={i}>
                    {e.row > 0 ? `Row ${e.row}: ` : ""}
                    {e.message}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
