"use client";

import Link from "next/link";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { formatDate } from "@/lib/utils";
import { FileText, Edit2, Trash2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";

const COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
];
function color(s: string) { return COLORS[s.charCodeAt(0) % COLORS.length]; }

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const del = useDeleteTemplate();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2">
        <span className="text-[12px] text-text-muted">
          {isLoading ? "Loading…" : `${templates?.length ?? 0} templates`}
        </span>
        <Link href="/templates/new" className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <Plus size={13} /> New template
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : templates?.length === 0 ? (
        <div className="py-20 text-center">
          <FileText size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-4">No templates yet.</p>
          <Link href="/templates/new" className="btn-primary inline-flex">
            <Plus size={13} /> Create template
          </Link>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border">
            <div className="w-9 shrink-0" />
            <span className="flex-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Template</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex-1 hidden md:block">Subject line</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-24 text-right">Updated</span>
            <span className="w-14 shrink-0" />
          </div>

          <ul className="divide-y divide-border">
            {templates?.map((t) => {
              const col = color(t.name);
              return (
                <li key={t.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors group">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none ${col.bg} ${col.text}`}>
                    {t.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="text-[13px] font-semibold text-text-primary truncate">{t.name}</p>
                    {t.variables.length > 0 && (
                      <div className="flex items-center gap-1 mt-0.5">
                        {t.variables.slice(0, 3).map((v) => (
                          <span key={v} className="text-[10px] bg-surface-2 text-text-muted border border-border px-1.5 py-px rounded font-mono">
                            {`{{${v}}}`}
                          </span>
                        ))}
                        {t.variables.length > 3 && (
                          <span className="text-[10px] text-text-muted">+{t.variables.length - 3}</span>
                        )}
                      </div>
                    )}
                  </div>

                  {/* Subject */}
                  <p className="flex-1 text-[13px] text-text-secondary truncate hidden md:block shrink-0">
                    {t.subject}
                  </p>

                  {/* Date */}
                  <span className="w-24 text-right text-[12px] text-text-muted shrink-0">
                    {formatDate(t.updated_at)}
                  </span>

                  {/* Actions */}
                  <div className="w-14 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    <Link href={`/templates/${t.id}/edit`}
                      className="text-text-muted hover:text-brand transition-colors">
                      <Edit2 size={14} />
                    </Link>
                    <button onClick={() => handleDelete(t.id, t.name)}
                      className="text-text-muted hover:text-error transition-colors">
                      <Trash2 size={14} />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </div>
  );
}
