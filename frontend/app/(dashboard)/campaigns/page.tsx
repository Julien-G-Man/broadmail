"use client";

import Link from "next/link";
import { useCampaigns, useDeleteCampaign, useSendCampaign } from "@/hooks/useCampaigns";
import { formatDate } from "@/lib/utils";
import { Send, Trash2, BarChart2, Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { Campaign } from "@/types";

const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: "bg-surface-3",    text: "text-text-secondary", dot: "bg-text-muted" },
  scheduled: { bg: "bg-blue-50",      text: "text-blue-600",       dot: "bg-blue-500" },
  queued:    { bg: "bg-amber-50",      text: "text-amber-600",      dot: "bg-amber-500" },
  sending:   { bg: "bg-amber-50",      text: "text-amber-600",      dot: "bg-amber-500" },
  sent:      { bg: "bg-emerald-50",    text: "text-emerald-700",    dot: "bg-emerald-500" },
  failed:    { bg: "bg-red-50",        text: "text-red-600",        dot: "bg-red-500" },
  cancelled: { bg: "bg-surface-3",    text: "text-text-muted",     dot: "bg-text-muted" },
};

const COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-amber-100",  text: "text-amber-600" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
];
function color(s: string) { return COLORS[s.charCodeAt(0) % COLORS.length]; }

export default function CampaignsPage() {
  const { data: campaigns, isLoading } = useCampaigns();
  const del = useDeleteCampaign();
  const send = useSendCampaign();

  const handleSend = async (c: Campaign) => {
    if (!confirm(`Send "${c.name}" now?`)) return;
    try { await send.mutateAsync(c.id); toast.success("Campaign queued"); }
    catch (e: any) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDelete = async (c: Campaign) => {
    if (!confirm(`Delete "${c.name}"?`)) return;
    try { await del.mutateAsync(c.id); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="bg-white rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-border bg-surface-2">
        <span className="text-[12px] text-text-muted">
          {isLoading ? "Loading…" : `${campaigns?.length ?? 0} campaigns`}
        </span>
        <Link href="/campaigns/new" className="flex items-center gap-1 text-[13px] font-medium text-brand hover:underline">
          <Plus size={13} /> New campaign
        </Link>
      </div>

      {isLoading ? (
        <div className="py-16 flex items-center justify-center gap-2 text-text-muted text-sm">
          <Loader2 size={16} className="animate-spin" /> Loading…
        </div>
      ) : campaigns?.length === 0 ? (
        <div className="py-20 text-center">
          <Send size={24} className="text-text-muted mx-auto mb-3" />
          <p className="text-sm text-text-secondary mb-4">No campaigns yet.</p>
          <Link href="/campaigns/new" className="btn-primary inline-flex">
            <Plus size={13} /> Create campaign
          </Link>
        </div>
      ) : (
        <>
          {/* Column headers */}
          <div className="flex items-center gap-4 px-5 py-2.5 border-b border-border">
            <div className="w-9 shrink-0" />
            <span className="flex-1 text-[11px] font-semibold text-text-muted uppercase tracking-wider">Campaign</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-32 hidden lg:block">From</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-24 text-center hidden md:block">Status</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-20 text-right hidden lg:block">Recipients</span>
            <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-20 text-right">Date</span>
            <span className="w-14 shrink-0" />
          </div>

          <ul className="divide-y divide-border">
            {campaigns?.map((c) => {
              const col = color(c.name);
              const st = STATUS[c.status] ?? STATUS.draft;
              return (
                <li key={c.id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors group">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none ${col.bg} ${col.text}`}>
                    {c.name.slice(0, 2).toUpperCase()}
                  </div>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/campaigns/${c.id}`}
                      className="text-[13px] font-semibold text-text-primary hover:text-brand transition-colors block truncate">
                      {c.name}
                    </Link>
                  </div>

                  {/* From */}
                  <span className="w-32 text-[12px] text-text-muted truncate hidden lg:block shrink-0">
                    {c.from_name}
                  </span>

                  {/* Status */}
                  <div className="w-24 hidden md:flex justify-center shrink-0">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {c.status}
                    </span>
                  </div>

                  {/* Recipients */}
                  <span className="w-20 text-right text-[12px] text-text-muted hidden lg:block shrink-0">
                    {c.total_recipients.toLocaleString()}
                  </span>

                  {/* Date */}
                  <span className="w-20 text-right text-[12px] text-text-muted shrink-0">
                    {formatDate(c.created_at)}
                  </span>

                  {/* Actions */}
                  <div className="w-14 flex items-center justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                    {c.status === "sent" && (
                      <Link href={`/campaigns/${c.id}`} title="Analytics"
                        className="text-text-muted hover:text-brand transition-colors">
                        <BarChart2 size={14} />
                      </Link>
                    )}
                    {c.status === "draft" && (
                      <button onClick={() => handleSend(c)} title="Send now"
                        className="text-text-muted hover:text-emerald-600 transition-colors">
                        <Send size={14} />
                      </button>
                    )}
                    {["draft", "failed", "cancelled"].includes(c.status) && (
                      <button onClick={() => handleDelete(c)} title="Delete"
                        className="text-text-muted hover:text-error transition-colors">
                        <Trash2 size={14} />
                      </button>
                    )}
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
