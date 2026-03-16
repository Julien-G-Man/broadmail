"use client";

import Link from "next/link";
import { useCampaigns, useDeleteCampaign, useSendCampaign, useCancelCampaign } from "@/hooks/useCampaigns";
import { formatDate, getStatusColor } from "@/lib/utils";
import { Plus, Send, Trash2, X, BarChart2 } from "lucide-react";
import { toast } from "sonner";
import { Campaign } from "@/types";

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const deleteCampaign = useDeleteCampaign();
  const sendCampaign = useSendCampaign();
  const cancelCampaign = useCancelCampaign();

  const handleSend = async (campaign: Campaign) => {
    if (!confirm(`Send "${campaign.name}" to ${campaign.total_recipients || "all"} recipients now?`)) return;
    try {
      await sendCampaign.mutateAsync(campaign.id);
      toast.success("Campaign queued for sending");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send campaign");
    }
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!confirm(`Delete "${campaign.name}"?`)) return;
    try {
      await deleteCampaign.mutateAsync(campaign.id);
      toast.success("Campaign deleted");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to delete campaign");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold">Campaigns</h2>
          <p className="text-text-secondary text-sm mt-0.5">{campaigns?.length || 0} campaigns</p>
        </div>
        <Link href="/campaigns/new" className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New Campaign
        </Link>
      </div>

      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading campaigns…</div>
        ) : campaigns?.length === 0 ? (
          <div className="p-12 text-center">
            <Send className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary mb-4">No campaigns yet.</p>
            <Link href="/campaigns/new" className="btn-primary inline-block">
              Create your first campaign
            </Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Recipients</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Created</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {campaigns?.map((campaign) => (
                <tr key={campaign.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/campaigns/${campaign.id}`} className="font-medium hover:underline">
                      {campaign.name}
                    </Link>
                    <p className="text-xs text-text-muted mt-0.5">{campaign.from_email}</p>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${getStatusColor(campaign.status)}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {campaign.status}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {campaign.total_recipients.toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(campaign.created_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2 justify-end">
                      {campaign.status === "sent" && (
                        <Link
                          href={`/campaigns/${campaign.id}`}
                          className="text-text-muted hover:text-brand transition-colors"
                        >
                          <BarChart2 className="w-4 h-4" />
                        </Link>
                      )}
                      {campaign.status === "draft" && (
                        <button
                          onClick={() => handleSend(campaign)}
                          className="text-text-muted hover:text-success transition-colors"
                          title="Send now"
                        >
                          <Send className="w-4 h-4" />
                        </button>
                      )}
                      {["draft", "failed", "cancelled"].includes(campaign.status) && (
                        <button
                          onClick={() => handleDelete(campaign)}
                          className="text-text-muted hover:text-error transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
