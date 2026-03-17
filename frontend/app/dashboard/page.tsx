"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { OverviewStats } from "@/types";
import { formatPercent, formatDate } from "@/lib/utils";
import { Users, Send, TrendingUp, MousePointer, Plus, ArrowUpRight } from "lucide-react";
import Link from "next/link";

const STATUS: Record<string, { bg: string; text: string; dot: string }> = {
  draft:     { bg: "bg-surface-3",   text: "text-text-secondary", dot: "bg-text-muted" },
  scheduled: { bg: "bg-blue-50",     text: "text-blue-600",       dot: "bg-blue-500" },
  queued:    { bg: "bg-amber-50",    text: "text-amber-600",      dot: "bg-amber-500" },
  sending:   { bg: "bg-amber-50",    text: "text-amber-600",      dot: "bg-amber-500" },
  sent:      { bg: "bg-emerald-50",  text: "text-emerald-700",    dot: "bg-emerald-500" },
  failed:    { bg: "bg-red-50",      text: "text-red-600",        dot: "bg-red-500" },
  cancelled: { bg: "bg-surface-3",   text: "text-text-muted",     dot: "bg-text-muted" },
};

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<OverviewStats>({
    queryKey: ["overview"],
    queryFn: () => api.get("/api/analytics/overview").then((r) => r.data),
  });

  const cards = [
    { label: "Total Contacts",  value: stats?.total_contacts?.toLocaleString(),   icon: Users,        href: "/dashboard/contacts", color: "text-violet-500",  bg: "bg-violet-50" },
    { label: "Campaigns Sent",  value: stats?.total_campaigns?.toLocaleString(),  icon: Send,         href: "/dashboard/campaigns",color: "text-blue-500",    bg: "bg-blue-50" },
    { label: "Emails Delivered",value: stats?.total_sent?.toLocaleString(),       icon: TrendingUp,   href: "/dashboard/campaigns",color: "text-emerald-500", bg: "bg-emerald-50" },
    { label: "Open Rate",       value: formatPercent(stats?.overall_open_rate??0),icon: MousePointer, href: "/dashboard/campaigns",color: "text-amber-500",   bg: "bg-amber-50" },
  ];

  return (
    <div className="space-y-5">
      {/* Stats */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {cards.map((c) => (
          <Link key={c.label} href={c.href}>
            <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-shadow group"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-center justify-between mb-4">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${c.bg}`}>
                  <c.icon size={15} className={c.color} />
                </div>
                <ArrowUpRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity" />
              </div>
              {isLoading ? (
                <div className="h-7 w-16 bg-surface-3 rounded animate-pulse" />
              ) : (
                <p className="text-2xl font-display font-bold text-text-primary">{c.value ?? "—"}</p>
              )}
              <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wide font-medium">{c.label}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Quick start */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { step: "1", label: "Import Contacts", desc: "Upload a CSV or Excel file", href: "/dashboard/contacts" },
          { step: "2", label: "Create Template", desc: "Write your email content", href: "/dashboard/templates/new" },
          { step: "3", label: "Send Campaign",   desc: "Choose audience and send", href: "/dashboard/campaigns/new" },
        ].map((a) => (
          <Link key={a.step} href={a.href}>
            <div className="bg-white rounded-xl border border-border p-5 hover:shadow-md transition-all hover:border-brand/30 group cursor-pointer"
              style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold text-text-muted uppercase tracking-widest mb-2 block">
                  Step {a.step}
                </span>
                <ArrowUpRight size={13} className="text-text-muted opacity-0 group-hover:opacity-100 transition-opacity mt-0.5" />
              </div>
              <p className="text-[13px] font-semibold text-text-primary">{a.label}</p>
              <p className="text-[12px] text-text-muted mt-0.5">{a.desc}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent campaigns */}
      <div className="bg-white rounded-xl border border-border overflow-hidden"
        style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-border">
          <span className="text-[13px] font-semibold text-text-primary">Recent Campaigns</span>
          <Link href="/dashboard/campaigns" className="text-[12px] text-brand font-medium hover:underline">
            View all →
          </Link>
        </div>

        {isLoading ? (
          <div className="divide-y divide-border">
            {[1,2,3].map((i) => (
              <div key={i} className="flex items-center gap-4 px-5 py-4">
                <div className="w-9 h-9 rounded-full bg-surface-3 animate-pulse shrink-0" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-surface-3 rounded w-44 animate-pulse" />
                  <div className="h-2.5 bg-surface-3 rounded w-28 animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : !stats?.recent_campaigns?.length ? (
          <div className="py-16 text-center">
            <Send size={22} className="text-text-muted mx-auto mb-3" />
            <p className="text-sm text-text-secondary mb-4">No campaigns yet.</p>
            <Link href="/dashboard/campaigns/new" className="btn-primary inline-flex">
              <Plus size={13} /> Create campaign
            </Link>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {stats.recent_campaigns.map((c) => {
              const st = STATUS[c.status] ?? STATUS.draft;
              return (
                <li key={c.id}>
                  <Link href={`/campaigns/${c.id}`}
                    className="flex items-center gap-4 px-5 py-3.5 hover:bg-surface-2 transition-colors group">
                    <div className="w-9 h-9 rounded-full bg-brand/10 flex items-center justify-center shrink-0">
                      <Send size={14} className="text-brand" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-[13px] font-semibold text-text-primary truncate group-hover:text-brand transition-colors">
                        {c.name}
                      </p>
                      <p className="text-[12px] text-text-muted mt-0.5">
                        {c.total_recipients.toLocaleString()} recipients · {formatDate(c.created_at)}
                      </p>
                    </div>
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium shrink-0 ${st.bg} ${st.text}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />
                      {c.status}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
