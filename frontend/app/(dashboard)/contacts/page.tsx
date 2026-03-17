"use client";

import { useState } from "react";
import Link from "next/link";
import { useContacts, useCreateContact, useDeleteContact } from "@/hooks/useContacts";
import { formatDate } from "@/lib/utils";
import { Search, Upload, Trash2, Loader2, X, UserPlus } from "lucide-react";
import { toast } from "sonner";
import ContactImportModal from "@/components/contacts/ContactImportModal";

const COLORS = [
  { bg: "bg-violet-100", text: "text-violet-700" },
  { bg: "bg-blue-100",   text: "text-blue-700" },
  { bg: "bg-emerald-100",text: "text-emerald-700" },
  { bg: "bg-amber-100",  text: "text-amber-600" },
  { bg: "bg-rose-100",   text: "text-rose-700" },
  { bg: "bg-cyan-100",   text: "text-cyan-700" },
  { bg: "bg-indigo-100", text: "text-indigo-700" },
  { bg: "bg-orange-100", text: "text-orange-600" },
];
function color(s: string) { return COLORS[s.charCodeAt(0) % COLORS.length]; }
function ini(email: string, first?: string | null, last?: string | null) {
  if (first || last) return `${first?.[0] ?? ""}${last?.[0] ?? ""}`.toUpperCase();
  return email.slice(0, 2).toUpperCase();
}

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [email, setEmail] = useState("");
  const [first, setFirst] = useState("");
  const [last, setLast] = useState("");

  const { data, isLoading, refetch } = useContacts({ page, search: search || undefined });
  const del = useDeleteContact();
  const create = useCreateContact();

  const handleCreate = async () => {
    if (!email.trim()) return;
    try {
      await create.mutateAsync({ email: email.trim(), first_name: first || undefined, last_name: last || undefined });
      toast.success("Contact added");
      setEmail(""); setFirst(""); setLast(""); setShowCreate(false);
    } catch (e: any) { toast.error(e.response?.data?.detail || "Failed"); }
  };

  const handleDelete = async (id: string, e: string) => {
    if (!confirm(`Delete ${e}?`)) return;
    try { await del.mutateAsync(id); toast.success("Deleted"); }
    catch { toast.error("Failed"); }
  };

  return (
    <div className="space-y-3">
      {/* Toolbar */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1 max-w-xs">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted pointer-events-none" />
          <input
            type="search"
            placeholder="Search contacts…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="input pl-8"
          />
        </div>
        <button
          onClick={() => setShowImport(true)}
          className="btn-ghost border border-border"
        >
          <Upload size={13} /> Import CSV
        </button>
        <button
          onClick={() => setShowCreate(!showCreate)}
          className="btn-primary"
        >
          <UserPlus size={13} /> Add Contact
        </button>
      </div>

      {/* Quick add */}
      {showCreate && (
        <div className="bg-white border border-border rounded-xl p-4 flex items-center gap-2">
          <input autoFocus type="email" placeholder="Email *" value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleCreate()}
            className="input flex-1" />
          <input placeholder="First name" value={first} onChange={(e) => setFirst(e.target.value)} className="input w-32" />
          <input placeholder="Last name" value={last} onChange={(e) => setLast(e.target.value)} className="input w-32" />
          <button onClick={handleCreate} disabled={!email.trim() || create.isPending}
            className="btn-primary disabled:opacity-50 shrink-0">
            {create.isPending ? <Loader2 size={13} className="animate-spin" /> : null} Add
          </button>
          <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary shrink-0">
            <X size={16} />
          </button>
        </div>
      )}

      {/* Table */}
      <div className="bg-white rounded-xl border border-border overflow-hidden" style={{ boxShadow: "0 1px 3px rgba(0,0,0,0.05)" }}>
        {/* Header row */}
        <div className="flex items-center px-5 py-2.5 border-b border-border bg-surface-2">
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider flex-1">Email</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-40 hidden md:block">Name</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-24 text-center hidden lg:block">Status</span>
          <span className="text-[11px] font-semibold text-text-muted uppercase tracking-wider w-24 text-right">Added</span>
          <span className="w-6" />
        </div>

        {isLoading ? (
          <div className="py-16 flex items-center justify-center gap-2 text-text-muted text-sm">
            <Loader2 size={16} className="animate-spin" /> Loading…
          </div>
        ) : data?.items.length === 0 ? (
          <div className="py-20 text-center">
            <p className="text-sm text-text-secondary">
              {search ? "No contacts match your search." : "No contacts yet."}
            </p>
            {!search && (
              <button onClick={() => setShowImport(true)}
                className="mt-3 text-[13px] text-brand font-medium hover:underline">
                Import from CSV →
              </button>
            )}
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {data?.items.map((c) => {
              const col = color(c.email);
              const initials = ini(c.email, c.first_name, c.last_name);
              const name = [c.first_name, c.last_name].filter(Boolean).join(" ");

              return (
                <li key={c.id}
                  className="flex items-center gap-4 px-5 py-3 hover:bg-surface-2 transition-colors group cursor-pointer">
                  {/* Avatar */}
                  <div className={`w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold shrink-0 select-none ${col.bg} ${col.text}`}>
                    {initials}
                  </div>

                  {/* Email + name */}
                  <div className="flex-1 min-w-0">
                    <Link href={`/contacts/${c.id}`}
                      className="text-[13px] font-semibold text-text-primary hover:text-brand transition-colors truncate block">
                      {c.email}
                    </Link>
                    {name && <p className="text-[12px] text-text-muted truncate mt-0.5">{name}</p>}
                  </div>

                  {/* Name col (desktop only) */}
                  <div className="w-40 hidden md:block shrink-0">
                    <p className="text-[13px] text-text-secondary truncate">{name || "—"}</p>
                  </div>

                  {/* Status */}
                  <div className="w-24 hidden lg:flex justify-center shrink-0">
                    {c.is_suppressed ? (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-red-50 text-red-600">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> Suppressed
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" /> Active
                      </span>
                    )}
                  </div>

                  {/* Date */}
                  <span className="text-[12px] text-text-muted w-24 text-right shrink-0">
                    {formatDate(c.created_at)}
                  </span>

                  {/* Delete */}
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDelete(c.id, c.email); }}
                    className="w-6 flex justify-center text-text-muted opacity-0 group-hover:opacity-100 hover:text-error transition-all">
                    <Trash2 size={14} />
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {/* Pagination */}
        {data && data.total > data.page_size && (
          <div className="flex items-center justify-between px-5 py-3 border-t border-border bg-surface-2">
            <span className="text-[12px] text-text-muted">
              {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} of {data.total.toLocaleString()}
            </span>
            <div className="flex gap-2">
              <button disabled={page === 1} onClick={() => setPage(p => p - 1)}
                className="btn-ghost border border-border disabled:opacity-40 text-xs py-1.5 px-3">Previous</button>
              <button disabled={page * data.page_size >= data.total} onClick={() => setPage(p => p + 1)}
                className="btn-ghost border border-border disabled:opacity-40 text-xs py-1.5 px-3">Next</button>
            </div>
          </div>
        )}
      </div>

      {showImport && (
        <ContactImportModal onClose={() => setShowImport(false)} onSuccess={() => { setShowImport(false); refetch(); }} />
      )}
    </div>
  );
}
