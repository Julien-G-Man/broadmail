"use client";

import Link from "next/link";
import { useTemplates, useDeleteTemplate } from "@/hooks/useTemplates";
import { formatDate } from "@/lib/utils";
import { Plus, FileText, Edit2, Trash2, Tag } from "lucide-react";
import { toast } from "sonner";

export default function TemplatesPage() {
  const { data: templates, isLoading } = useTemplates();
  const deleteTemplate = useDeleteTemplate();

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete template "${name}"?`)) return;
    try {
      await deleteTemplate.mutateAsync(id);
      toast.success("Template deleted");
    } catch {
      toast.error("Failed to delete template");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold">Email Templates</h2>
          <p className="text-text-secondary text-sm mt-0.5">{templates?.length || 0} templates</p>
        </div>
        <Link href="/templates/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Template
        </Link>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6 h-32 animate-pulse bg-surface-3" />
          ))}
        </div>
      ) : templates?.length === 0 ? (
        <div className="card p-12 text-center">
          <FileText className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary mb-4">No templates yet.</p>
          <Link href="/templates/new" className="btn-primary inline-block">
            Create your first template
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {templates?.map((tmpl) => (
            <div key={tmpl.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                  <FileText className="w-4 h-4 text-brand" />
                </div>
                <div className="flex gap-2">
                  <Link
                    href={`/templates/${tmpl.id}/edit`}
                    className="text-text-muted hover:text-brand transition-colors"
                  >
                    <Edit2 className="w-4 h-4" />
                  </Link>
                  <button
                    onClick={() => handleDelete(tmpl.id, tmpl.name)}
                    className="text-text-muted hover:text-error transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
              <h3 className="font-medium text-text-primary">{tmpl.name}</h3>
              <p className="text-xs text-text-secondary mt-1 truncate">{tmpl.subject}</p>
              {tmpl.variables.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {tmpl.variables.slice(0, 3).map((v) => (
                    <span key={v} className="inline-flex items-center gap-1 text-xs bg-surface-2 text-text-secondary px-2 py-0.5 rounded">
                      <Tag className="w-2.5 h-2.5" />
                      {v}
                    </span>
                  ))}
                  {tmpl.variables.length > 3 && (
                    <span className="text-xs text-text-muted">+{tmpl.variables.length - 3} more</span>
                  )}
                </div>
              )}
              <p className="text-xs text-text-muted mt-3">{formatDate(tmpl.updated_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
