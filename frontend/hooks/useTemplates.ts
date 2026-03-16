import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { EmailTemplate } from "@/types";

export function useTemplates() {
  return useQuery<EmailTemplate[]>({
    queryKey: ["templates"],
    queryFn: async () => {
      const res = await api.get("/api/templates");
      return res.data;
    },
  });
}

export function useTemplate(id: string) {
  return useQuery<EmailTemplate>({
    queryKey: ["template", id],
    queryFn: async () => {
      const res = await api.get(`/api/templates/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; subject: string; html_body: string; text_body?: string }) =>
      api.post("/api/templates", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function useUpdateTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<EmailTemplate> }) =>
      api.patch(`/api/templates/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["templates"] });
      qc.invalidateQueries({ queryKey: ["template", id] });
    },
  });
}

export function useDeleteTemplate() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/templates/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["templates"] }),
  });
}

export function usePreviewTemplate() {
  return useMutation({
    mutationFn: ({ id, sample_contact }: { id: string; sample_contact: Record<string, unknown> }) =>
      api.post(`/api/templates/${id}/preview`, { sample_contact }).then((r) => r.data),
  });
}
