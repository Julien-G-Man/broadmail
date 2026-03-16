"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import api from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, FileText, Loader2 } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: () => void;
  listId?: string;
}

export default function ContactImportModal({ onClose, onSuccess, listId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles[0]) setFile(acceptedFiles[0]);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "text/csv": [".csv"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
    },
    maxFiles: 1,
  });

  const handleImport = async () => {
    if (!file) return;
    setLoading(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const url = listId ? `/api/contacts/import?list_id=${listId}` : "/api/contacts/import";
      const res = await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      const { created, skipped, invalid } = res.data;
      toast.success(`Import complete: ${created} added, ${skipped} skipped, ${invalid} invalid`);
      onSuccess();
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="card w-full max-w-md p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-lg">Import Contacts</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand bg-brand/5" : "border-border hover:border-brand/50"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {isDragActive ? "Drop the file here" : "Drag & drop a CSV or Excel file, or click to browse"}
            </p>
            <p className="text-xs text-text-muted mt-2">Required column: email</p>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-text-muted">
                {(file.size / 1024).toFixed(1)} KB
              </p>
            </div>
            <button onClick={() => setFile(null)} className="text-text-muted hover:text-error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="flex gap-3 mt-4">
          <button onClick={onClose} className="flex-1 btn-ghost border border-border">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!file || loading}
            className="flex-1 btn-primary flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {loading ? "Importing…" : "Import"}
          </button>
        </div>
      </div>
    </div>
  );
}
