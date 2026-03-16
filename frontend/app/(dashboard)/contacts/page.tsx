"use client";

import { useState } from "react";
import Link from "next/link";
import { useContacts, useCreateContact, useDeleteContact } from "@/hooks/useContacts";
import { formatDate } from "@/lib/utils";
import { Search, UserPlus, Upload, Trash2, AlertCircle, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import ContactImportModal from "@/components/contacts/ContactImportModal";

export default function ContactsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newFirst, setNewFirst] = useState("");
  const [newLast, setNewLast] = useState("");

  const { data, isLoading, refetch } = useContacts({ page, search: search || undefined });
  const deleteContact = useDeleteContact();
  const createContact = useCreateContact();

  const handleCreate = async () => {
    if (!newEmail.trim()) return;
    try {
      await createContact.mutateAsync({ email: newEmail.trim(), first_name: newFirst.trim() || undefined, last_name: newLast.trim() || undefined });
      toast.success("Contact added");
      setNewEmail(""); setNewFirst(""); setNewLast(""); setShowCreate(false);
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Failed to add contact");
    }
  };

  const handleDelete = async (id: string, email: string) => {
    if (!confirm(`Delete contact ${email}?`)) return;
    try {
      await deleteContact.mutateAsync(id);
      toast.success("Contact deleted");
    } catch {
      toast.error("Failed to delete contact");
    }
  };

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold">Contacts</h2>
          <p className="text-text-secondary text-sm mt-0.5">
            {data?.total?.toLocaleString() || 0} total contacts
          </p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="btn-ghost flex items-center gap-2 border border-border"
          >
            <Upload className="w-4 h-4" />
            Import CSV
          </button>
          <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
            <UserPlus className="w-4 h-4" />
            Add Contact
          </button>
        </div>
      </div>

      {/* Inline create form */}
      {showCreate && (
        <div className="card p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm">Add Contact</h3>
            <button onClick={() => setShowCreate(false)} className="text-text-muted hover:text-text-primary">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <input placeholder="Email *" value={newEmail} onChange={(e) => setNewEmail(e.target.value)} className="input" type="email" />
            <input placeholder="First name" value={newFirst} onChange={(e) => setNewFirst(e.target.value)} className="input" />
            <input placeholder="Last name" value={newLast} onChange={(e) => setNewLast(e.target.value)} className="input" />
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost border border-border text-sm">Cancel</button>
            <button
              onClick={handleCreate}
              disabled={!newEmail.trim() || createContact.isPending}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {createContact.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Add Contact
            </button>
          </div>
        </div>
      )}

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
        <input
          type="search"
          placeholder="Search by email, name…"
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          className="input pl-9 max-w-sm"
        />
      </div>

      {/* Table */}
      <div className="card overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading contacts…</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <AlertCircle className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary">No contacts found.</p>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Email</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {data?.items.map((contact) => (
                <tr key={contact.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3">
                    <Link href={`/contacts/${contact.id}`} className="font-mono text-xs text-brand hover:underline">
                      {contact.email}
                    </Link>
                  </td>
                  <td className="px-4 py-3 text-text-secondary">
                    {[contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—"}
                  </td>
                  <td className="px-4 py-3">
                    {contact.is_suppressed ? (
                      <span className="status-badge bg-red-100 text-red-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        Suppressed
                      </span>
                    ) : (
                      <span className="status-badge bg-green-100 text-green-700">
                        <span className="w-1.5 h-1.5 rounded-full bg-current" />
                        Active
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(contact.created_at)}</td>
                  <td className="px-4 py-3">
                    <button
                      onClick={() => handleDelete(contact.id, contact.email)}
                      className="text-text-muted hover:text-error transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Pagination */}
      {data && data.total > data.page_size && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Showing {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} of {data.total}
          </span>
          <div className="flex gap-2">
            <button
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              className="btn-ghost border border-border disabled:opacity-50"
            >
              Previous
            </button>
            <button
              disabled={page * data.page_size >= data.total}
              onClick={() => setPage((p) => p + 1)}
              className="btn-ghost border border-border disabled:opacity-50"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {showImport && (
        <ContactImportModal
          onClose={() => setShowImport(false)}
          onSuccess={() => { setShowImport(false); refetch(); }}
        />
      )}
    </div>
  );
}
