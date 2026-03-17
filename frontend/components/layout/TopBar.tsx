"use client";

import { usePathname } from "next/navigation";
import Link from "next/link";
import { Plus } from "lucide-react";

const META: Record<string, { title: string; cta?: { label: string; href: string } }> = {
  "/dashboard":               { title: "Dashboard" },
  "/dashboard/contacts":       { title: "Contacts",  cta: { label: "Import CSV",   href: "#import" } },
  "/dashboard/contacts/lists": { title: "Lists" },
  "/dashboard/templates":      { title: "Templates", cta: { label: "New Template", href: "/dashboard/templates/new" } },
  "/dashboard/campaigns":      { title: "Campaigns", cta: { label: "New Campaign", href: "/dashboard/campaigns/new" } },
};

export default function TopBar() {
  const pathname = usePathname();
  const meta =
    Object.entries(META)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([p]) => pathname === p || pathname.startsWith(p + "/"))?.[1]
    ?? { title: "Broadmail" };

  return (
    <header
      className="flex items-center justify-between bg-white border-b border-border px-6 shrink-0"
      style={{ height: 56 }}
    >
      <h1 className="font-display font-semibold text-text-primary" style={{ fontSize: 15 }}>
        {meta.title}
      </h1>

      {meta.cta && meta.cta.href !== "#import" && (
        <Link href={meta.cta.href} className="btn-primary">
          <Plus size={13} />
          {meta.cta.label}
        </Link>
      )}
    </header>
  );
}
