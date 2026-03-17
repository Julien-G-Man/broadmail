"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { useContactLists, useCreateList } from "@/hooks/useContacts";
import api from "@/lib/api";
import { toast } from "sonner";
import { Upload, X, FileText, Loader2, Plus } from "lucide-react";

interface Props {
  onClose: () => void;
  onSuccess: (listId?: string) => void;
  defaultListId?: string;
}

export default function ContactImportModal({ onClose, onSuccess, defaultListId }: Props) {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);

  // List assignment — if a defaultListId is provided, pre-select that list
  const { data: existingLists } = useContactLists();
  const createList = useCreateList();
  const [listMode, setListMode] = useState<"none" | "existing" | "new">(defaultListId ? "existing" : "new");
  const [selectedListId, setSelectedListId] = useState(defaultListId ?? "");
  const [newListName, setNewListName] = useState("");

  const onDrop = useCallback((accepted: File[]) => {
    if (accepted[0]) setFile(accepted[0]);
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
    try {
      // Resolve list ID
      let listId: string | undefined;
      if (listMode === "new" && newListName.trim()) {
        const created = await createList.mutateAsync({ name: newListName.trim() });
        listId = (created as any).id;
      } else if (listMode === "existing" && selectedListId) {
        listId = selectedListId;
      }

      // Upload file
      const formData = new FormData();
      formData.append("file", file);
      const url = listId ? `/api/contacts/import?list_id=${listId}` : "/api/contacts/import";
      const res = await api.post(url, formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const { created, skipped, invalid } = res.data;
      const parts = [`${created} added`];
      if (skipped) parts.push(`${skipped} skipped`);
      if (invalid) parts.push(`${invalid} invalid`);
      toast.success(`Import complete — ${parts.join(", ")}`);
      onSuccess(listId);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Import failed");
    } finally {
      setLoading(false);
    }
  };

  const canImport =
    !!file &&
    (listMode === "none" ||
      (listMode === "existing" && !!selectedListId) ||
      (listMode === "new" && !!newListName.trim()));

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-lg">Import Contacts</h3>
          <button onClick={onClose} className="text-text-muted hover:text-text-primary">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Drop zone */}
        {!file ? (
          <div
            {...getRootProps()}
            className={`border-2 border-dashed rounded-lg p-10 text-center cursor-pointer transition-colors ${
              isDragActive ? "border-brand bg-brand/5" : "border-border hover:border-brand/40"
            }`}
          >
            <input {...getInputProps()} />
            <Upload className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary">
              {isDragActive ? "Drop it here" : "Drag & drop a CSV or Excel file, or click to browse"}
            </p>
            <p className="text-xs text-text-muted mt-1">Required column: <span className="font-mono">email</span></p>
          </div>
        ) : (
          <div className="border border-border rounded-lg p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-brand flex-shrink-0" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{file.name}</p>
              <p className="text-xs text-text-muted">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
            <button onClick={() => setFile(null)} className="text-text-muted hover:text-error">
              <X className="w-4 h-4" />
            </button>
          </div>
        )}

        {/* List assignment */}
        <div>
          <p className="text-sm font-medium mb-2">Add to list</p>
          <div className="flex gap-2 mb-3">
            {[
              { value: "new", label: "New list" },
              { value: "existing", label: "Existing list" },
              { value: "none", label: "No list" },
            ].map((opt) => (
              <button
                key={opt.value}
                onClick={() => setListMode(opt.value as any)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium border transition-colors ${
                  listMode === opt.value
                    ? "bg-brand text-white border-brand"
                    : "border-border text-text-secondary hover:border-brand/40"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {listMode === "new" && (
            <input
              autoFocus
              placeholder="List name, e.g. Recruitment 2026"
              value={newListName}
              onChange={(e) => setNewListName(e.target.value)}
              className="input"
            />
          )}

          {listMode === "existing" && (
            <select
              value={selectedListId}
              onChange={(e) => setSelectedListId(e.target.value)}
              className="input"
            >
              <option value="">Select a list…</option>
              {existingLists?.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name} ({l.member_count} contacts)
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-3 pt-1">
          <button onClick={onClose} className="flex-1 btn-ghost border border-border">
            Cancel
          </button>
          <button
            onClick={handleImport}
            disabled={!canImport || loading}
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
