"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, Users, List, FileText, Send, Mail } from "lucide-react";

const nav = [
  { href: "/",               label: "Dashboard", icon: LayoutDashboard },
  { href: "/contacts",       label: "Contacts",  icon: Users },
  { href: "/contacts/lists", label: "Lists",     icon: List },
  { href: "/templates",      label: "Templates", icon: FileText },
  { href: "/campaigns",      label: "Campaigns", icon: Send },
];

export default function Sidebar() {
  const pathname = usePathname();

  return (
    <aside
      className="flex flex-col bg-white border-r border-border shrink-0"
      style={{ width: 240 }}
    >
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 h-[56px] border-b border-border shrink-0">
        <div className="w-7 h-7 rounded-lg bg-brand-accent flex items-center justify-center shrink-0">
          <Mail className="w-3.5 h-3.5 text-white" />
        </div>
        <span
          className="font-display font-bold text-text-primary tracking-tight"
          style={{ fontSize: 15 }}
        >
          Broadmail
        </span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-3 space-y-0.5 overflow-y-auto">
        <p className="px-2 pb-2 text-[10px] font-semibold text-text-muted uppercase tracking-widest">
          Menu
        </p>
        {nav.map(({ href, label, icon: Icon }) => {
          const active =
            pathname === href ||
            (href !== "/" && pathname.startsWith(href));

          return (
            <Link
              key={href}
              href={href}
              className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-all duration-100 relative"
              style={
                active
                  ? {
                      background: "#f0f1ff",
                      color: "#1a1a2e",
                    }
                  : {
                      color: "#5c5c70",
                    }
              }
              onMouseEnter={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "#f4f5f7";
                  (e.currentTarget as HTMLElement).style.color = "#111118";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  (e.currentTarget as HTMLElement).style.background = "";
                  (e.currentTarget as HTMLElement).style.color = "#5c5c70";
                }
              }}
            >
              {/* Active indicator */}
              {active && (
                <span
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full bg-brand"
                />
              )}
              <Icon
                size={15}
                style={{ color: active ? "#1a1a2e" : "#9898aa", flexShrink: 0 }}
              />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Footer */}
      <div className="px-5 py-4 border-t border-border">
        <span className="text-[11px] text-text-muted font-mono">dev mode · no auth</span>
      </div>
    </aside>
  );
}
