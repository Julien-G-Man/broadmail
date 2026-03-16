import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Contact, ContactList, EmailEvent, PaginatedResponse } from "@/types";

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

export function useUpdateContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, data }: { id: string; data: Partial<Contact> }) =>
      api.patch(`/api/contacts/${id}`, data).then((r) => r.data),
    onSuccess: (_, { id }) => {
      qc.invalidateQueries({ queryKey: ["contacts"] });
      qc.invalidateQueries({ queryKey: ["contact", id] });
    },
  });
}

export function useDeleteContact() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/contacts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["contacts"] }),
  });
}

export function useContactEvents(contactId: string) {
  return useQuery<EmailEvent[]>({
    queryKey: ["contact-events", contactId],
    queryFn: async () => {
      const res = await api.get(`/api/contacts/${contactId}/events`);
      return res.data;
    },
    enabled: !!contactId,
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

export function useList(id: string) {
  return useQuery<ContactList>({
    queryKey: ["list", id],
    queryFn: async () => {
      const res = await api.get(`/api/lists/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useListContacts(listId: string, params?: { page?: number; search?: string }) {
  return useQuery<PaginatedResponse<Contact>>({
    queryKey: ["list-contacts", listId, params],
    queryFn: async () => {
      const res = await api.get(`/api/lists/${listId}/contacts`, { params });
      return res.data;
    },
    enabled: !!listId,
  });
}

export function useRemoveContactFromList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ listId, contactId }: { listId: string; contactId: string }) =>
      api.delete(`/api/lists/${listId}/contacts/${contactId}`),
    onSuccess: (_, { listId }) => {
      qc.invalidateQueries({ queryKey: ["list-contacts", listId] });
      qc.invalidateQueries({ queryKey: ["list", listId] });
      qc.invalidateQueries({ queryKey: ["lists"] });
    },
  });
}

export function useDeleteList() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/lists/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["lists"] }),
  });
}
