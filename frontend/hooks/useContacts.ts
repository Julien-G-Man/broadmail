import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Contact, ContactList, PaginatedResponse, ImportResult } from "@/types";

export function useContacts(params?: {
  page?: number;
  search?: string;
  list_id?: string;
  suppressed?: boolean;
}) {
  return useQuery<PaginatedResponse<Contact>>({
    queryKey: ["contacts", params],
    queryFn: async () => {
      const res = await api.get("/api/contacts", { params });
      return res.data;
    },
  });
}

export function useContact(id: string) {
  return useQuery<Contact>({
    queryKey: ["contact", id],
    queryFn: async () => {
      const res = await api.get(`/api/contacts/${id}`);
      return res.data;
    },
  });
}

export function useCreateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Contact>) => api.post("/api/contacts", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useContactLists() {
  return useQuery<ContactList[]>({
    queryKey: ["lists"],
    queryFn: async () => {
      const res = await api.get("/api/lists");
      return res.data;
    },
  });
}

export function useCreateList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; description?: string }) =>
      api.post("/api/lists", data).then((r) => r.data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/lists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
}
