"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useCreateTemplate } from "@/hooks/useTemplates";
import TemplateEditor from "@/components/templates/TemplateEditor";
import { toast } from "sonner";

export default function NewTemplatePage() {
  const router = useRouter();
  const createTemplate = useCreateTemplate();

  const handleSave = async (data: { name: string; subject: string; html_body: string; text_body?: string }) => {
    try {
      await createTemplate.mutateAsync(data);
      toast.success("Template created");
      router.push("/dashboard/templates");
    } catch {
      toast.error("Failed to create template");
    }
  };

  return <TemplateEditor onSave={handleSave} />;
}
