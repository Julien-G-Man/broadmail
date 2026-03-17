"use client";

import { useParams } from "next/navigation";
import Link from "next/link";
import { useList, useListContacts, useRemoveContactFromList } from "@/hooks/useContacts";
import { formatDate } from "@/lib/utils";
import { ArrowLeft, Users, Trash2, AlertCircle, Loader2, Upload } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";
import ContactImportModal from "@/components/contacts/ContactImportModal";

export default function ListDetailPage() {
  const params = useParams();
  const id = params.id as string;

  const [page, setPage] = useState(1);
  const [showImport, setShowImport] = useState(false);
  const { data: list, isLoading: listLoading, refetch: refetchList } = useList(id);
  const { data, isLoading: contactsLoading, refetch: refetchContacts } = useListContacts(id, { page });
  const removeContact = useRemoveContactFromList();

  const handleRemove = async (contactId: string, email: string) => {
    if (!confirm(`Remove ${email} from this list?`)) return;
    try {
      await removeContact.mutateAsync({ listId: id, contactId });
      toast.success("Contact removed from list");
    } catch {
      toast.error("Failed to remove contact");
    }
  };

  if (listLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (!list) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-text-muted" />
        <p>List not found.</p>
        <Link href="/dashboard/contacts/lists" className="text-brand text-sm mt-2 inline-block hover:underline">
          Back to Lists
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <Link
          href="/dashboard/contacts/lists"
          className="flex items-center gap-1 text-text-muted text-sm hover:text-text-primary mb-2"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Contact Lists
        </Link>
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-xl font-display font-semibold">{list.name}</h2>
            {list.description && (
              <p className="text-text-secondary text-sm mt-0.5">{list.description}</p>
            )}
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-sm text-text-muted">
              <Users className="w-4 h-4" />
              <span>{list.member_count.toLocaleString()} contacts</span>
            </div>
            <button
              onClick={() => setShowImport(true)}
              className="btn-primary flex items-center gap-1.5 text-sm"
            >
              <Upload className="w-3.5 h-3.5" /> Import to this list
            </button>
          </div>
        </div>
      </div>

      {/* Members table */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border flex items-center justify-between">
          <h3 className="font-medium">Members</h3>
          <p className="text-xs text-text-muted">{data?.total?.toLocaleString() || 0} total</p>
        </div>

        {contactsLoading ? (
          <div className="p-8 text-center text-text-muted">Loading members…</div>
        ) : data?.items.length === 0 ? (
          <div className="p-12 text-center">
            <Users className="w-8 h-8 text-text-muted mx-auto mb-3" />
            <p className="text-text-secondary text-sm">No contacts in this list yet.</p>
            <p className="text-text-muted text-xs mt-1">
              Import a CSV or add contacts from the{" "}
              <Link href="/dashboard/contacts" className="text-brand hover:underline">
                Contacts page
              </Link>
              .
            </p>
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
                    <Link
                      href={`/dashboard/contacts/${contact.id}`}
                      className="font-mono text-xs text-brand hover:underline"
                    >
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
                      onClick={() => handleRemove(contact.id, contact.email)}
                      disabled={removeContact.isPending}
                      className="text-text-muted hover:text-error transition-colors disabled:opacity-40"
                      title="Remove from list"
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

      {showImport && (
        <ContactImportModal
          defaultListId={id}
          onClose={() => setShowImport(false)}
          onSuccess={() => {
            setShowImport(false);
            refetchList();
            refetchContacts();
          }}
        />
      )}

      {/* Pagination */}
      {data && data.total > data.page_size && (
        <div className="flex items-center justify-between text-sm text-text-secondary">
          <span>
            Showing {(page - 1) * data.page_size + 1}–{Math.min(page * data.page_size, data.total)} of{" "}
            {data.total}
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
    </div>
  );
}
