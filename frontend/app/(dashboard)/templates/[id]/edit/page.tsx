"use client";

import { useParams, useRouter } from "next/navigation";
import { useTemplate, useUpdateTemplate } from "@/hooks/useTemplates";
import TemplateEditor from "@/components/templates/TemplateEditor";
import { toast } from "sonner";
import { Loader2, AlertCircle } from "lucide-react";
import Link from "next/link";

export default function EditTemplatePage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: template, isLoading } = useTemplate(id);
  const updateTemplate = useUpdateTemplate();

  const handleSave = async (data: { name: string; subject: string; html_body: string; text_body?: string }) => {
    try {
      await updateTemplate.mutateAsync({ id, data });
      toast.success("Template saved");
      router.push("/templates");
    } catch {
      toast.error("Failed to save template");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading template…
      </div>
    );
  }

  if (!template) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-text-muted" />
        <p>Template not found.</p>
        <Link href="/templates" className="text-brand text-sm mt-2 inline-block hover:underline">
          Back to Templates
        </Link>
      </div>
    );
  }

  return (
    <TemplateEditor
      initial={{
        id: template.id,
        name: template.name,
        subject: template.subject,
        html_body: template.html_body,
        text_body: template.text_body || undefined,
        mode: template.mode,
      }}
      onSave={handleSave}
    />
  );
}
