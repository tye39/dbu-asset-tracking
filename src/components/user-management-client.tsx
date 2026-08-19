"use client";

import React, { useState, useTransition } from "react";
import { createUserAction, deleteUserAction, updateUserAction } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Plus, Trash2, Edit2, X, Loader2 } from "lucide-react";

interface UserItem {
  id: string;
  name: string;
  email: string;
  roleId: string;
  departmentId?: string | null;
  role: { name: string };
  department?: { name: string } | null;
}

interface RoleItem {
  id: string;
  name: string;
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
}

interface UserManagementClientProps {
  users: UserItem[];
  roles: RoleItem[];
  departments: DepartmentItem[];
}

export function UserManagementClient({ users, roles, departments }: UserManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showModal, setShowModal] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [editMode, setEditMode] = useState(false);
  const [userId, setUserId] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [roleId, setRoleId] = useState("");
  const [departmentId, setDepartmentId] = useState("");

  const handleOpenCreate = () => {
    setEditMode(false);
    setUserId("");
    setName("");
    setEmail("");
    setPassword("Password123");
    setRoleId("");
    setDepartmentId("");
    setError(null);
    setShowModal(true);
  };

  const handleOpenEdit = (user: UserItem) => {
    setEditMode(true);
    setUserId(user.id);
    setName(user.name);
    setEmail(user.email);
    setPassword("");
    setRoleId(user.roleId);
    setDepartmentId(user.departmentId || "");
    setError(null);
    setShowModal(true);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !email || !roleId) {
      setError("Please fill in all required fields.");
      return;
    }

    startTransition(async () => {
      let res;
      if (editMode) {
        res = await updateUserAction(null, {
          id: userId,
          name,
          email,
          password: password || undefined,
          roleId,
          departmentId: departmentId || null,
        });
      } else {
        res = await createUserAction(null, {
          name,
          email,
          password,
          roleId,
          departmentId: departmentId || undefined,
        });
      }

      if (res.error) {
        setError(res.error);
      } else {
        setShowModal(false);
        alert(editMode ? "User updated!" : "User created!");
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure you want to delete this user?")) return;
    startTransition(async () => {
      const res = await deleteUserAction(null, id);
      if (res.error) {
        alert(res.error);
      } else {
        alert("User deleted!");
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-100 pb-4 bg-blue-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Manage Users</h2>
          <p className="text-xs text-blue-600 font-semibold mt-1">Configure account access, credentials, and institutional roles</p>
        </div>
        <button
          onClick={handleOpenCreate}
          className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-all shadow-md flex items-center space-x-1.5"
        >
          <Plus size={14} />
          <span>Add User</span>
        </button>
      </div>

      {/* Users Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5">Name</th>
                <th className="py-2.5">Email</th>
                <th className="py-2.5">Role</th>
                <th className="py-2.5">Organizational Unit</th>
                <th className="py-2.5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {users.map((user) => (
                <tr key={user.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3 font-semibold text-slate-800">{user.name}</td>
                  <td className="py-3 text-slate-500">{user.email}</td>
                  <td className="py-3">
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                      {user.role.name.replace(/_/g, " ")}
                    </span>
                  </td>
                  <td className="py-3 text-slate-500">{user.department?.name || "-"}</td>
                  <td className="py-3 text-right space-x-2">
                    <button
                      onClick={() => handleOpenEdit(user)}
                      className="p-1 bg-slate-100 hover:bg-blue-50 text-slate-600 hover:text-blue-700 rounded transition-all inline-flex items-center justify-center"
                    >
                      <Edit2 size={12} />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="p-1 bg-slate-100 hover:bg-red-50 text-slate-600 hover:text-red-700 rounded transition-all inline-flex items-center justify-center"
                    >
                      <Trash2 size={12} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: CREATE/EDIT USER */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">
              {editMode ? "Edit Account" : "Create Account"}
            </h3>

            {error && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Martha Hailu"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  placeholder="e.g. martha@dbu.edu.et"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                  Password {editMode && "(leave blank to keep unchanged)"}
                </label>
                <input
                  type="password"
                  required={!editMode}
                  placeholder={editMode ? "••••••••" : "Minimum 6 chars"}
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">System Role</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={roleId}
                  onChange={(e) => setRoleId(e.target.value)}
                >
                  <option value="">-- Choose Role --</option>
                  {roles.map((r) => (
                    <option key={r.id} value={r.id}>
                      {r.name.replace(/_/g, " ")}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Assigned Organizational Unit (Optional)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={departmentId}
                  onChange={(e) => setDepartmentId(e.target.value)}
                >
                  <option value="">-- None / General Administration --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Submit Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
