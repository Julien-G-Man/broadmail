"use client";

import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "@/lib/api";
import { User } from "@/types";
import { formatDate } from "@/lib/utils";
import { Plus, Trash2, Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

const createUserSchema = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters"),
  role: z.enum(["admin", "sender"]),
});

type CreateUserForm = z.infer<typeof createUserSchema>;

export default function SettingsPage() {
  const isAdmin = true; // auth disabled — always admin in dev mode
  const qc = useQueryClient();

  const [showCreate, setShowCreate] = useState(false);

  const { data: users, isLoading } = useQuery<User[]>({
    queryKey: ["users"],
    queryFn: async () => {
      const res = await api.get("/api/users");
      return res.data;
    },
    enabled: isAdmin,
  });

  const createUser = useMutation({
    mutationFn: (data: CreateUserForm) => api.post("/api/users", data).then((r) => r.data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User created");
      setShowCreate(false);
      reset();
    },
    onError: (err: any) => toast.error(err.response?.data?.detail || "Failed to create user"),
  });

  const deactivateUser = useMutation({
    mutationFn: (id: string) => api.delete(`/api/users/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["users"] });
      toast.success("User deactivated");
    },
    onError: () => toast.error("Failed to deactivate user"),
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateUserForm>({
    resolver: zodResolver(createUserSchema),
    defaultValues: { role: "sender" },
  });

  if (!isAdmin) {
    return (
      <div className="card p-12 text-center">
        <Shield className="w-8 h-8 text-text-muted mx-auto mb-3" />
        <p className="text-text-secondary">Admin access required.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h2 className="text-xl font-display font-semibold">Settings</h2>
        <p className="text-text-secondary text-sm mt-0.5">Manage users and organization settings.</p>
      </div>

      {/* Users Section */}
      <div className="card">
        <div className="p-5 border-b border-border flex items-center justify-between">
          <div>
            <h3 className="font-semibold">Team Members</h3>
            <p className="text-text-muted text-xs mt-0.5">{users?.length || 0} users</p>
          </div>
          <button onClick={() => setShowCreate(!showCreate)} className="btn-primary flex items-center gap-2 text-sm">
            <Plus className="w-4 h-4" />
            Add User
          </button>
        </div>

        {/* Create User Form */}
        {showCreate && (
          <div className="p-5 border-b border-border bg-surface-2">
            <h4 className="font-medium mb-4 text-sm">Create New User</h4>
            <form onSubmit={handleSubmit((data) => createUser.mutate(data))} className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium mb-1">Name *</label>
                <input {...register("name")} placeholder="Full name" className="input text-sm" />
                {errors.name && <p className="text-error text-xs mt-1">{errors.name.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Email *</label>
                <input {...register("email")} type="email" placeholder="user@example.com" className="input text-sm" />
                {errors.email && <p className="text-error text-xs mt-1">{errors.email.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Password *</label>
                <input {...register("password")} type="password" placeholder="Min. 8 characters" className="input text-sm" />
                {errors.password && <p className="text-error text-xs mt-1">{errors.password.message}</p>}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">Role *</label>
                <select {...register("role")} className="input text-sm">
                  <option value="sender">Sender</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="col-span-2 flex gap-2">
                <button type="button" onClick={() => setShowCreate(false)} className="btn-ghost border border-border text-sm">
                  Cancel
                </button>
                <button type="submit" disabled={createUser.isPending} className="btn-primary text-sm flex items-center gap-2">
                  {createUser.isPending && <Loader2 className="w-3 h-3 animate-spin" />}
                  Create User
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Users Table */}
        {isLoading ? (
          <div className="p-8 text-center text-text-muted">Loading users…</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-surface-2 border-b border-border">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Name</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Email</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Role</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Status</th>
                <th className="text-left px-4 py-3 font-medium text-text-secondary">Added</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {users?.map((user) => (
                <tr key={user.id} className="hover:bg-surface-2 transition-colors">
                  <td className="px-4 py-3 font-medium">{user.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-text-secondary">{user.email}</td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${user.role === "admin" ? "bg-brand text-white" : "bg-surface-3 text-text-secondary"}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <span className={`status-badge ${user.is_active ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-500"}`}>
                      <span className="w-1.5 h-1.5 rounded-full bg-current" />
                      {user.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-text-muted">{formatDate(user.created_at)}</td>
                  <td className="px-4 py-3">
                    {user.is_active && (
                      <button
                        onClick={() => {
                          if (confirm(`Deactivate ${user.name}?`)) deactivateUser.mutate(user.id);
                        }}
                        className="text-text-muted hover:text-error transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
