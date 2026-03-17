import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { Campaign, CampaignStats, SendCampaignResponse } from "@/types";

function invalidateCampaignQueries(queryClient: ReturnType<typeof useQueryClient>, id?: string) {
  queryClient.invalidateQueries({ queryKey: ["campaigns"] });
  if (id) {
    queryClient.invalidateQueries({ queryKey: ["campaign", id] });
    queryClient.invalidateQueries({ queryKey: ["campaign-stats", id] });
  }
}

export function useCampaigns() {
  return useQuery<Campaign[]>({
    queryKey: ["campaigns"],
    queryFn: async () => {
      const res = await api.get("/api/campaigns");
      return res.data;
    },
  });
}

export function useCampaign(id: string) {
  return useQuery<Campaign>({
    queryKey: ["campaign", id],
    queryFn: async () => {
      const res = await api.get(`/api/campaigns/${id}`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCampaignStats(id: string) {
  return useQuery<CampaignStats>({
    queryKey: ["campaign-stats", id],
    queryFn: async () => {
      const res = await api.get(`/api/campaigns/${id}/analytics`);
      return res.data;
    },
    enabled: !!id,
  });
}

export function useCreateCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Campaign>) => api.post("/api/campaigns", data).then((r) => r.data),
    onSuccess: (campaign) => invalidateCampaignQueries(qc, campaign?.id),
  });
}

export function useSendCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      api.post<SendCampaignResponse>(`/api/campaigns/${id}/send`).then((r) => r.data),
    onSuccess: (_campaign, id) => invalidateCampaignQueries(qc, id),
  });
}

export function useScheduleCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, scheduled_at }: { id: string; scheduled_at: string }) =>
      api.post(`/api/campaigns/${id}/schedule`, { scheduled_at }).then((r) => r.data),
    onSuccess: (_campaign, variables) => invalidateCampaignQueries(qc, variables.id),
  });
}

export function useCancelCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.post(`/api/campaigns/${id}/cancel`).then((r) => r.data),
    onSuccess: (_campaign, id) => invalidateCampaignQueries(qc, id),
  });
}

export function useDeleteCampaign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => api.delete(`/api/campaigns/${id}`),
    onSuccess: (_result, id) => invalidateCampaignQueries(qc, id),
  });
}
