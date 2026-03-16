"use client";

import { useState } from "react";
import Link from "next/link";
import { useContactLists, useCreateList, useDeleteList } from "@/hooks/useContacts";
import { formatDate } from "@/lib/utils";
import { Plus, List, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

export default function ListsPage() {
  const { data: lists, isLoading } = useContactLists();
  const createList = useCreateList();
  const deleteList = useDeleteList();
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  const handleCreate = async () => {
    if (!name.trim()) return;
    try {
      await createList.mutateAsync({ name: name.trim(), description: description.trim() || undefined });
      toast.success("List created");
      setName("");
      setDescription("");
      setShowCreate(false);
    } catch {
      toast.error("Failed to create list");
    }
  };

  const handleDelete = async (id: string, listName: string) => {
    if (!confirm(`Delete list "${listName}"? This will not delete the contacts.`)) return;
    try {
      await deleteList.mutateAsync(id);
      toast.success("List deleted");
    } catch {
      toast.error("Failed to delete list");
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-display font-semibold">Contact Lists</h2>
          <p className="text-text-secondary text-sm mt-0.5">{lists?.length || 0} lists</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="btn-primary flex items-center gap-2">
          <Plus className="w-4 h-4" />
          New List
        </button>
      </div>

      {/* Create Form */}
      {showCreate && (
        <div className="card p-5 space-y-3">
          <h3 className="font-medium">Create New List</h3>
          <input
            placeholder="List name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input"
          />
          <input
            placeholder="Description (optional)"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="input"
          />
          <div className="flex gap-2">
            <button onClick={() => setShowCreate(false)} className="btn-ghost border border-border">
              Cancel
            </button>
            <button onClick={handleCreate} disabled={!name.trim()} className="btn-primary">
              Create List
            </button>
          </div>
        </div>
      )}

      {/* Lists Grid */}
      {isLoading ? (
        <div className="grid grid-cols-3 gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="card p-6 h-28 animate-pulse bg-surface-3" />
          ))}
        </div>
      ) : lists?.length === 0 ? (
        <div className="card p-12 text-center">
          <List className="w-8 h-8 text-text-muted mx-auto mb-3" />
          <p className="text-text-secondary">No lists yet. Create one to organize contacts.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists?.map((lst) => (
            <div key={lst.id} className="card p-5 hover:shadow-md transition-shadow">
              <div className="flex items-start justify-between mb-3">
                <div className="w-8 h-8 bg-brand/10 rounded-lg flex items-center justify-center">
                  <List className="w-4 h-4 text-brand" />
                </div>
                <button
                  onClick={() => handleDelete(lst.id, lst.name)}
                  className="text-text-muted hover:text-error transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
              <Link href={`/contacts/lists/${lst.id}`}>
                <h3 className="font-medium text-text-primary hover:underline">{lst.name}</h3>
              </Link>
              {lst.description && (
                <p className="text-xs text-text-muted mt-1 line-clamp-2">{lst.description}</p>
              )}
              <div className="flex items-center gap-1 mt-3 text-xs text-text-secondary">
                <Users className="w-3 h-3" />
                {lst.member_count.toLocaleString()} contacts
              </div>
              <p className="text-xs text-text-muted mt-1">{formatDate(lst.created_at)}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
