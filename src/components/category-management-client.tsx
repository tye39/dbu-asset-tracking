"use client";

import React, { useState, useTransition } from "react";
import { createCategoryAction, deleteCategoryAction } from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

interface CategoryItem {
  id: string;
  name: string;
  code: string;
  description?: string | null;
}

interface CategoryManagementClientProps {
  categories: CategoryItem[];
}

export function CategoryManagementClient({ categories }: CategoryManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form Fields
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [description, setDescription] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name || !code) return;

    startTransition(async () => {
      const res = await createCategoryAction(null, {
        name,
        code,
        description: description || undefined,
      });

      if (res.error) {
        setError(res.error);
      } else {
        setName("");
        setCode("");
        setDescription("");
        alert("Asset category created!");
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    if (!confirm("Are you sure?")) return;
    startTransition(async () => {
      const res = await deleteCategoryAction(null, id);
      if (res.error) {
        alert(res.error);
      } else {
        router.refresh();
      }
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-blue-100 pb-4 bg-blue-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-blue-900">Asset Categories</h2>
          <p className="text-xs text-blue-600 font-semibold mt-1">Configure asset classification tags and taxonomies</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Add Category */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
          <form onSubmit={handleSubmit} className="space-y-4">
            <h4 className="text-xs font-extrabold text-[#0b4a6e] uppercase pb-2 border-b border-slate-100">Add Category</h4>
            {error && <div className="text-xs text-red-600 font-semibold">{error}</div>}
            
            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Name</label>
              <input
                type="text"
                required
                placeholder="e.g. Computers"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                value={name}
                onChange={(e) => setName(e.target.value)}
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Category Code</label>
              <input
                type="text"
                required
                placeholder="e.g. COMP"
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs"
                value={code}
                onChange={(e) => setCode(e.target.value.toUpperCase())}
              />
            </div>

            <div>
              <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Description</label>
              <textarea
                placeholder="Optional taxonomy details..."
                className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs h-16 resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>

            <button
              type="submit"
              disabled={isPending}
              className="w-full py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded text-xs font-bold transition-all"
            >
              {isPending ? "Creating..." : "Create Category"}
            </button>
          </form>
        </div>

        {/* Right List Table */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Code</th>
                  <th className="py-2.5">Category Name</th>
                  <th className="py-2.5">Description</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {categories.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-bold text-slate-800">{c.code}</td>
                    <td className="py-3 font-semibold text-slate-700">{c.name}</td>
                    <td className="py-3 text-slate-500">{c.description || "-"}</td>
                    <td className="py-3 text-right">
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 rounded transition-all"
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

      </div>
    </div>
  );
}
