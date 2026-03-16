"use client";

import { usePathname } from "next/navigation";

const PAGE_TITLES: Record<string, string> = {
  "/": "Dashboard",
  "/contacts": "Contacts",
  "/contacts/lists": "Contact Lists",
  "/templates": "Email Templates",
  "/campaigns": "Campaigns",
  "/settings": "Settings",
};

export default function TopBar() {
  const pathname = usePathname();

  const title =
    Object.entries(PAGE_TITLES)
      .sort((a, b) => b[0].length - a[0].length)
      .find(([path]) => pathname === path || pathname.startsWith(path + "/"))?.[1] || "Broadmail";

  return (
    <header className="h-14 border-b border-border bg-white flex items-center px-6">
      <h1 className="font-display text-base font-semibold text-text-primary">{title}</h1>
    </header>
  );
}
