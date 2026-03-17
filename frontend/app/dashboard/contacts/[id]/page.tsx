"use client";

import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useContact, useContactEvents, useUpdateContact } from "@/hooks/useContacts";
import { formatDate, formatDateTime } from "@/lib/utils";
import { ArrowLeft, Mail, AlertCircle, Check, MousePointer, ExternalLink, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useState } from "react";

const EVENT_ICONS: Record<string, JSX.Element> = {
  sent: <Mail className="w-3.5 h-3.5 text-brand" />,
  delivered: <Check className="w-3.5 h-3.5 text-success" />,
  opened: <Mail className="w-3.5 h-3.5 text-blue-500" />,
  clicked: <MousePointer className="w-3.5 h-3.5 text-purple-500" />,
  bounced: <AlertCircle className="w-3.5 h-3.5 text-error" />,
  unsubscribed: <AlertCircle className="w-3.5 h-3.5 text-warning" />,
  complained: <AlertCircle className="w-3.5 h-3.5 text-error" />,
};

export default function ContactDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: contact, isLoading } = useContact(id);
  const { data: events } = useContactEvents(id);
  const updateContact = useUpdateContact();

  const [editing, setEditing] = useState(false);
  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");

  const startEdit = () => {
    setFirstName(contact?.first_name || "");
    setLastName(contact?.last_name || "");
    setEditing(true);
  };

  const handleSave = async () => {
    try {
      await updateContact.mutateAsync({ id, data: { first_name: firstName, last_name: lastName } });
      toast.success("Contact updated");
      setEditing(false);
    } catch {
      toast.error("Failed to update contact");
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64 text-text-muted">
        <Loader2 className="w-5 h-5 animate-spin mr-2" />
        Loading…
      </div>
    );
  }

  if (!contact) {
    return (
      <div className="p-8 text-center text-text-secondary">
        <AlertCircle className="w-8 h-8 mx-auto mb-3 text-text-muted" />
        <p>Contact not found.</p>
        <Link href="/dashboard/contacts" className="text-brand text-sm mt-2 inline-block hover:underline">
          Back to Contacts
        </Link>
      </div>
    );
  }

  const fullName = [contact.first_name, contact.last_name].filter(Boolean).join(" ") || "—";
  const customFields = Object.entries(contact.custom_fields || {});

  return (
    <div className="space-y-6 max-w-3xl">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <Link
            href="/dashboard/contacts"
            className="flex items-center gap-1 text-text-muted text-sm hover:text-text-primary mb-2"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Contacts
          </Link>
          <h2 className="text-xl font-display font-semibold">{fullName}</h2>
          <p className="text-text-secondary text-sm font-mono mt-0.5">{contact.email}</p>
        </div>
        <div className="flex items-center gap-2">
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
          {!editing && (
            <button onClick={startEdit} className="btn-ghost border border-border text-sm">
              Edit
            </button>
          )}
        </div>
      </div>

      {/* Edit form */}
      {editing && (
        <div className="card p-5 space-y-3">
          <h3 className="font-medium text-sm">Edit Contact</h3>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-text-muted mb-1">First Name</label>
              <input
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="input"
                placeholder="First name"
              />
            </div>
            <div>
              <label className="block text-xs text-text-muted mb-1">Last Name</label>
              <input
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="input"
                placeholder="Last name"
              />
            </div>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setEditing(false)} className="btn-ghost border border-border text-sm">
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={updateContact.isPending}
              className="btn-primary text-sm flex items-center gap-2 disabled:opacity-50"
            >
              {updateContact.isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Save
            </button>
          </div>
        </div>
      )}

      {/* Details */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="card p-5 space-y-3">
          <h3 className="font-medium text-sm">Contact Info</h3>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between">
              <dt className="text-text-muted">Email</dt>
              <dd className="font-mono text-xs">{contact.email}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">First Name</dt>
              <dd>{contact.first_name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Last Name</dt>
              <dd>{contact.last_name || "—"}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-text-muted">Added</dt>
              <dd>{formatDate(contact.created_at)}</dd>
            </div>
            {contact.is_suppressed && (
              <>
                <div className="flex justify-between">
                  <dt className="text-text-muted">Suppression Reason</dt>
                  <dd className="text-error capitalize">{contact.suppression_reason || "—"}</dd>
                </div>
                {contact.suppressed_at && (
                  <div className="flex justify-between">
                    <dt className="text-text-muted">Suppressed At</dt>
                    <dd>{formatDate(contact.suppressed_at)}</dd>
                  </div>
                )}
              </>
            )}
          </dl>
        </div>

        {customFields.length > 0 && (
          <div className="card p-5 space-y-3">
            <h3 className="font-medium text-sm">Custom Fields</h3>
            <dl className="space-y-2 text-sm">
              {customFields.map(([key, value]) => (
                <div key={key} className="flex justify-between gap-4">
                  <dt className="text-text-muted capitalize">{key.replace(/_/g, " ")}</dt>
                  <dd className="text-right truncate max-w-[160px]">{String(value) || "—"}</dd>
                </div>
              ))}
            </dl>
          </div>
        )}
      </div>

      {/* Event History */}
      <div className="card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h3 className="font-medium">Email History</h3>
          <p className="text-xs text-text-muted mt-0.5">{events?.length || 0} events</p>
        </div>
        {!events || events.length === 0 ? (
          <div className="p-8 text-center text-text-muted text-sm">No email events yet.</div>
        ) : (
          <ul className="divide-y divide-border">
            {events.map((event) => (
              <li key={event.id} className="px-5 py-3 flex items-center gap-3 text-sm">
                <span className="shrink-0">{EVENT_ICONS[event.event_type] || <Mail className="w-3.5 h-3.5 text-text-muted" />}</span>
                <span className="capitalize text-text-primary flex-1">{event.event_type}</span>
                {event.url && (
                  <a
                    href={event.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brand text-xs flex items-center gap-1 hover:underline max-w-[200px] truncate"
                  >
                    <ExternalLink className="w-3 h-3 shrink-0" />
                    {event.url}
                  </a>
                )}
                <span className="text-text-muted text-xs shrink-0">{formatDateTime(event.occurred_at)}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
