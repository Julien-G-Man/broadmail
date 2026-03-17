"use client";

import { useCampaign, useCampaignStats, useSendCampaign, useCancelCampaign } from "@/hooks/useCampaigns";
import { formatDate, formatDateTime, getStatusColor, formatPercent } from "@/lib/utils";
import { ArrowLeft, Send, X, TrendingUp } from "lucide-react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { toast } from "sonner";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from "recharts";

export default function CampaignDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const { data: campaign, isLoading } = useCampaign(id);
  const { data: stats } = useCampaignStats(id);
  const sendCampaign = useSendCampaign();
  const cancelCampaign = useCancelCampaign();

  const handleSend = async () => {
    if (!confirm("Send this campaign now?")) return;
    try {
      await sendCampaign.mutateAsync(id);
      toast.success("Campaign queued for sending");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to send");
    }
  };

  const handleCancel = async () => {
    if (!confirm("Cancel this scheduled campaign?")) return;
    try {
      await cancelCampaign.mutateAsync(id);
      toast.success("Campaign cancelled");
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to cancel");
    }
  };

  if (isLoading || !campaign) {
    return <div className="p-8 text-text-muted">Loading…</div>;
  }

  const chartData = stats
    ? [
        { name: "Sent", value: stats.sent, color: "#1a1a2e" },
        { name: "Delivered", value: stats.delivered, color: "#16a34a" },
        { name: "Opened", value: stats.opened, color: "#2563eb" },
        { name: "Clicked", value: stats.clicked, color: "#7c3aed" },
        { name: "Bounced", value: stats.bounced, color: "#dc2626" },
      ]
    : [];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link href="/dashboard/campaigns" className="flex items-center gap-1 text-text-muted text-sm hover:text-text-primary mb-2">
            <ArrowLeft className="w-3.5 h-3.5" />
            Campaigns
          </Link>
          <h2 className="text-xl font-display font-semibold">{campaign.name}</h2>
          <div className="flex items-center gap-3 mt-1">
            <span className={`status-badge ${getStatusColor(campaign.status)}`}>
              <span className="w-1.5 h-1.5 rounded-full bg-current" />
              {campaign.status}
            </span>
            <span className="text-text-muted text-sm">
              Created {formatDate(campaign.created_at)}
            </span>
            {campaign.scheduled_at && (
              <span className="text-text-muted text-sm">
                Scheduled for {formatDateTime(campaign.scheduled_at)}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {campaign.status === "draft" && (
            <button onClick={handleSend} className="btn-primary flex items-center gap-2">
              <Send className="w-4 h-4" />
              Send Now
            </button>
          )}
          {campaign.status === "scheduled" && (
            <button onClick={handleCancel} className="btn-ghost border border-border flex items-center gap-2">
              <X className="w-4 h-4" />
              Cancel
            </button>
          )}
        </div>
      </div>

      {/* Meta */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "From", value: `${campaign.from_name} <${campaign.from_email}>` },
          { label: "Reply-To", value: campaign.reply_to || campaign.from_email },
          { label: "Total Recipients", value: campaign.total_recipients.toLocaleString() },
          {
            label: "Scheduled At",
            value: campaign.scheduled_at ? formatDateTime(campaign.scheduled_at) : "—",
          },
          { label: "Completed At", value: campaign.completed_at ? formatDateTime(campaign.completed_at) : "—" },
        ].map((item) => (
          <div key={item.label} className="card p-4">
            <p className="text-xs text-text-muted mb-1">{item.label}</p>
            <p className="text-sm font-medium truncate">{item.value}</p>
          </div>
        ))}
      </div>

      {/* Stats */}
      {stats && (
        <>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Open Rate</p>
              <p className="text-2xl font-bold font-display">{formatPercent(stats.open_rate)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Click Rate</p>
              <p className="text-2xl font-bold font-display">{formatPercent(stats.click_rate)}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Bounced</p>
              <p className="text-2xl font-bold font-display text-error">{stats.bounced}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs text-text-muted mb-1">Unsubscribed</p>
              <p className="text-2xl font-bold font-display">{stats.unsubscribed}</p>
            </div>
          </div>

          {/* Chart */}
          <div className="card p-6">
            <h3 className="font-semibold mb-4">Email Funnel</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={chartData} margin={{ left: -20 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e5e5" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="value" radius={[4, 4, 0, 0]}>
                  {chartData.map((entry, index) => (
                    <Cell key={index} fill={entry.color} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </>
      )}
    </div>
  );
}
