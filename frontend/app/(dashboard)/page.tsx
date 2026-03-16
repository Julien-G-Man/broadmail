"use client";

import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { OverviewStats } from "@/types";
import { formatPercent, formatDate, getStatusColor } from "@/lib/utils";
import { Users, Send, TrendingUp, MousePointer } from "lucide-react";
import Link from "next/link";

export default function DashboardPage() {
  const { data: stats, isLoading } = useQuery<OverviewStats>({
    queryKey: ["overview"],
    queryFn: async () => {
      const res = await api.get("/api/analytics/overview");
      return res.data;
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="card p-6 h-24 animate-pulse bg-surface-3" />
          ))}
        </div>
      </div>
    );
  }

  const statCards = [
    {
      label: "Total Contacts",
      value: stats?.total_contacts?.toLocaleString() || "0",
      icon: Users,
      href: "/contacts",
    },
    {
      label: "Total Campaigns",
      value: stats?.total_campaigns?.toLocaleString() || "0",
      icon: Send,
      href: "/campaigns",
    },
    {
      label: "Emails Sent",
      value: stats?.total_sent?.toLocaleString() || "0",
      icon: TrendingUp,
      href: "/campaigns",
    },
    {
      label: "Open Rate",
      value: formatPercent(stats?.overall_open_rate || 0),
      icon: MousePointer,
      href: "/campaigns",
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-display font-semibold text-text-primary mb-1">Overview</h2>
        <p className="text-text-secondary text-sm">Your email campaign performance at a glance.</p>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {statCards.map((card) => (
          <Link key={card.label} href={card.href}>
            <div className="card p-5 hover:shadow-md transition-shadow cursor-pointer">
              <div className="flex items-start justify-between mb-3">
                <p className="text-text-secondary text-xs font-medium">{card.label}</p>
                <card.icon className="w-4 h-4 text-text-muted" />
              </div>
              <p className="text-2xl font-display font-bold text-text-primary">{card.value}</p>
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Campaigns */}
      <div className="card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <h3 className="font-semibold text-text-primary">Recent Campaigns</h3>
          <Link href="/campaigns" className="text-sm text-brand hover:underline">
            View all
          </Link>
        </div>
        <div className="divide-y divide-border">
          {stats?.recent_campaigns?.length === 0 && (
            <div className="p-12 text-center">
              <Send className="w-8 h-8 text-text-muted mx-auto mb-3" />
              <p className="text-text-secondary text-sm">No campaigns yet.</p>
              <Link href="/campaigns/new" className="btn-primary inline-block mt-3 text-xs">
                Create your first campaign
              </Link>
            </div>
          )}
          {stats?.recent_campaigns?.map((c) => (
            <div key={c.id} className="p-4 flex items-center justify-between hover:bg-surface-2">
              <div>
                <p className="text-sm font-medium text-text-primary">{c.name}</p>
                <p className="text-xs text-text-muted mt-0.5">{formatDate(c.created_at)}</p>
              </div>
              <div className="flex items-center gap-4">
                <span className="text-xs text-text-secondary">
                  {c.total_recipients} recipients
                </span>
                <span className={`status-badge ${getStatusColor(c.status)}`}>
                  <span className="w-1.5 h-1.5 rounded-full bg-current" />
                  {c.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
