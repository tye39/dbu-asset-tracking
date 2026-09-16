"use client";

import React, { useState, useTransition } from "react";
import {
  createFacultyAction,
  deleteFacultyAction,
  createDepartmentAction,
  updateDepartmentAction,
  deleteDepartmentAction
} from "@/app/actions/user";
import { useRouter } from "next/navigation";
import { Trash2, Network, ToggleLeft, ToggleRight } from "lucide-react";

interface FacultyItem {
  id: string;
  name: string;
  code: string;
  departments: { id: string }[];
}

interface DepartmentItem {
  id: string;
  name: string;
  code: string;
  type: string;
  parentId?: string | null;
  parent?: { name: string } | null;
  faculty?: { name: string } | null;
  facultyId?: string | null;
  headOfUnit?: string | null;
  officeLocation?: string | null;
  contactInfo?: string | null;
  description?: string | null;
  status: string;
}

interface DepartmentManagementClientProps {
  faculties: FacultyItem[];
  departments: DepartmentItem[];
}

const UNIT_TYPES = [
  { value: "COLLEGE", label: "Academic College / Faculty" },
  { value: "SCHOOL", label: "Academic School" },
  { value: "INSTITUTE", label: "Academic Institute" },
  { value: "DEPARTMENT", label: "Academic Department" },
  { value: "RESEARCH_CENTER", label: "Research Center" },
  { value: "LABORATORY", label: "Laboratory" },
  { value: "LIBRARY", label: "Library" },
  { value: "DIRECTORATE", label: "Directorate (e.g. ICT, Planning)" },
  { value: "ADMINISTRATIVE_OFFICE", label: "Administrative Office" },
  { value: "CLINIC", label: "University Clinic" },
  { value: "CAFETRIA", label: "Cafeteria" },
  { value: "STORE", label: "Central Store" },
  { value: "WAREHOUSE", label: "Warehouse" },
  { value: "OTHER", label: "Other Unit" },
];

export function DepartmentManagementClient({ faculties, departments }: DepartmentManagementClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [activeTab, setActiveTab] = useState<"faculties" | "departments" | "hierarchy">("departments");

  // Faculty form state
  const [facultyName, setFacultyName] = useState("");
  const [facultyCode, setFacultyCode] = useState("");
  const [facError, setFacError] = useState<string | null>(null);

  // Organizational Unit form state
  const [deptName, setDeptName] = useState("");
  const [deptCode, setDeptCode] = useState("");
  const [deptType, setDeptType] = useState("DEPARTMENT");
  const [deptParentId, setDeptParentId] = useState("");
  const [deptFacultyId, setDeptFacultyId] = useState("");
  const [headOfUnit, setHeadOfUnit] = useState("");
  const [officeLocation, setOfficeLocation] = useState("");
  const [contactInfo, setContactInfo] = useState("");
  const [description, setDescription] = useState("");
  const [deptError, setDeptError] = useState<string | null>(null);

  // Edit unit state
  const [editingUnit, setEditingUnit] = useState<DepartmentItem | null>(null);

  const handleFacultySubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setFacError(null);
    if (!facultyName || !facultyCode) return;

    startTransition(async () => {
      const res = await createFacultyAction(null, {
        name: facultyName,
        code: facultyCode,
      });

      if (res.error) {
        setFacError(res.error);
      } else {
        setFacultyName("");
        setFacultyCode("");
        alert("Faculty created!");
        router.refresh();
      }
    });
  };

  const handleDeptSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setDeptError(null);
    if (!deptName || !deptCode) return;

    startTransition(async () => {
      const payload = {
        name: deptName,
        code: deptCode,
        type: deptType,
        parentId: deptParentId || undefined,
        facultyId: deptFacultyId || undefined,
        headOfUnit: headOfUnit || undefined,
        officeLocation: officeLocation || undefined,
        contactInfo: contactInfo || undefined,
        description: description || undefined,
      };

      const res = await createDepartmentAction(null, payload);

      if (res.error) {
        setDeptError(res.error);
      } else {
        setDeptName("");
        setDeptCode("");
        setDeptType("DEPARTMENT");
        setDeptParentId("");
        setDeptFacultyId("");
        setHeadOfUnit("");
        setOfficeLocation("");
        setContactInfo("");
        setDescription("");
        alert("Organizational Unit created!");
        router.refresh();
      }
    });
  };

  const handleDeptUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUnit) return;

    startTransition(async () => {
      const res = await updateDepartmentAction(null, {
        id: editingUnit.id,
        name: editingUnit.name,
        code: editingUnit.code,
        type: editingUnit.type,
        parentId: editingUnit.parentId || null,
        facultyId: editingUnit.facultyId || null,
        headOfUnit: editingUnit.headOfUnit || null,
        officeLocation: editingUnit.officeLocation || null,
        contactInfo: editingUnit.contactInfo || null,
        description: editingUnit.description || null,
      });

      if (res.error) {
        alert(res.error);
      } else {
        setEditingUnit(null);
        alert("Organizational Unit updated!");
        router.refresh();
      }
    });
  };

  const toggleUnitStatus = (unit: DepartmentItem) => {
    const nextStatus = unit.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    startTransition(async () => {
      const res = await updateDepartmentAction(null, {
        id: unit.id,
        status: nextStatus
      });
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  const handleDeleteFaculty = (id: string) => {
    if (!confirm("Are you sure? This will delete all departments in this faculty if they don't have assets.")) return;
    startTransition(async () => {
      const res = await deleteFacultyAction(null, id);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  const handleDeleteDept = (id: string) => {
    if (!confirm("Are you sure?")) return;
    startTransition(async () => {
      const res = await deleteDepartmentAction(null, id);
      if (res.error) alert(res.error);
      else router.refresh();
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 bg-sky-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-sky-900">Organizational Unit Manager</h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">Configure academic faculties, colleges, libraries, and administrative directorates</p>
        </div>
      </div>

      {/* Tab select */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => { setActiveTab("departments"); setEditingUnit(null); }}
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "departments" ? "border-sky-700 text-slate-800 bg-slate-50" : "border-transparent text-slate-400"
          }`}
        >
          Organizational Units ({departments.length})
        </button>
        <button
          onClick={() => { setActiveTab("hierarchy"); setEditingUnit(null); }}
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "hierarchy" ? "border-sky-700 text-slate-800 bg-slate-50" : "border-transparent text-slate-400"
          }`}
        >
          Hierarchical Tree Structure
        </button>
        <button
          onClick={() => { setActiveTab("faculties"); setEditingUnit(null); }}
          className={`px-6 py-2.5 text-xs font-bold border-b-2 transition-all ${
            activeTab === "faculties" ? "border-sky-700 text-slate-800 bg-slate-50" : "border-transparent text-slate-400"
          }`}
        >
          Parent Faculties
        </button>
      </div>

      {/* Tab content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Form: Add / Edit New Unit */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm h-fit">
          {activeTab === "faculties" ? (
            <form onSubmit={handleFacultySubmit} className="space-y-4">
              <h4 className="text-xs font-extrabold text-sky-750 uppercase pb-2 border-b border-slate-100">Add Faculty</h4>
              {facError && <div className="text-xs text-red-600 font-semibold">{facError}</div>}
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Faculty Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Faculty of Technology"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={facultyName}
                  onChange={(e) => setFacultyName(e.target.value)}
                />
              </div>
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Faculty Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. FTEC"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={facultyCode}
                  onChange={(e) => setFacultyCode(e.target.value.toUpperCase())}
                />
              </div>
              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-sky-700 hover:bg-sky-800 text-white rounded text-xs font-bold transition-all"
              >
                {isPending ? "Creating..." : "Create Faculty"}
              </button>
            </form>
          ) : editingUnit ? (
            /* Editing Unit Form */
            <form onSubmit={handleDeptUpdateSubmit} className="space-y-4">
              <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                <h4 className="text-xs font-extrabold text-amber-700 uppercase">Edit Unit</h4>
                <button
                  type="button"
                  onClick={() => setEditingUnit(null)}
                  className="text-[10px] text-slate-400 font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.name}
                  onChange={(e) => setEditingUnit({ ...editingUnit, name: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Code</label>
                <input
                  type="text"
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.code}
                  onChange={(e) => setEditingUnit({ ...editingUnit, code: e.target.value.toUpperCase() })}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Type</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.type}
                  onChange={(e) => setEditingUnit({ ...editingUnit, type: e.target.value })}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parent Unit (Hierarchy)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.parentId || ""}
                  onChange={(e) => setEditingUnit({ ...editingUnit, parentId: e.target.value || null })}
                >
                  <option value="">-- None (Top Level) --</option>
                  {departments
                    .filter((d) => d.id !== editingUnit.id)
                    .map((d) => (
                      <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                    ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parent Faculty (Optional)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.facultyId || ""}
                  onChange={(e) => setEditingUnit({ ...editingUnit, facultyId: e.target.value || null })}
                >
                  <option value="">-- None (Non-Academic) --</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>{f.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Head of Unit</label>
                <input
                  type="text"
                  placeholder="e.g. Dr. Abebe"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.headOfUnit || ""}
                  onChange={(e) => setEditingUnit({ ...editingUnit, headOfUnit: e.target.value })}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Office Location</label>
                <input
                  type="text"
                  placeholder="Building 12, Room 102"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={editingUnit.officeLocation || ""}
                  onChange={(e) => setEditingUnit({ ...editingUnit, officeLocation: e.target.value })}
                />
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-amber-700 hover:bg-amber-800 text-white rounded text-xs font-bold transition-all"
              >
                {isPending ? "Saving..." : "Save Changes"}
              </button>
            </form>
          ) : (
            /* Create Organizational Unit Form */
            <form onSubmit={handleDeptSubmit} className="space-y-4">
              <h4 className="text-xs font-extrabold text-sky-700 uppercase pb-2 border-b border-slate-100">Add Org Unit</h4>
              {deptError && <div className="text-xs text-red-600 font-semibold">{deptError}</div>}
              
              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Office"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={deptName}
                  onChange={(e) => setDeptName(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Code</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. DBU-FIN"
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={deptCode}
                  onChange={(e) => setDeptCode(e.target.value.toUpperCase())}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Unit Type</label>
                <select
                  required
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={deptType}
                  onChange={(e) => setDeptType(e.target.value)}
                >
                  {UNIT_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parent Unit (Hierarchy)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={deptParentId}
                  onChange={(e) => setDeptParentId(e.target.value)}
                >
                  <option value="">-- None (Top Level) --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Parent College/Faculty (Optional)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={deptFacultyId}
                  onChange={(e) => setDeptFacultyId(e.target.value)}
                >
                  <option value="">-- None (Non-Academic) --</option>
                  {faculties.map((f) => (
                    <option key={f.id} value={f.id}>{f.name} ({f.code})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Head of Unit</label>
                  <input
                    type="text"
                    placeholder="Head name"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                    value={headOfUnit}
                    onChange={(e) => setHeadOfUnit(e.target.value)}
                  />
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-slate-400 uppercase mb-1">Location</label>
                  <input
                    type="text"
                    placeholder="Bldg/Office"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                    value={officeLocation}
                    onChange={(e) => setOfficeLocation(e.target.value)}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isPending}
                className="w-full py-2 bg-sky-700 hover:bg-sky-850 text-white rounded text-xs font-bold transition-all"
              >
                {isPending ? "Creating..." : "Create Unit"}
              </button>
            </form>
          )}
        </div>

        {/* Right Content Area */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          {activeTab === "faculties" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2.5">Code</th>
                    <th className="py-2.5">Faculty Name</th>
                    <th className="py-2.5">Linked Units</th>
                    <th className="py-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                  {faculties.map((f) => (
                    <tr key={f.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-bold text-slate-800">{f.code}</td>
                      <td className="py-3 font-semibold text-slate-700">{f.name}</td>
                      <td className="py-3 text-slate-400">{f.departments.length} units</td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleDeleteFaculty(f.id)}
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
          )}

          {activeTab === "departments" && (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2.5">Code</th>
                    <th className="py-2.5">Unit Name</th>
                    <th className="py-2.5">Type</th>
                    <th className="py-2.5">Parent / Scope</th>
                    <th className="py-2.5">Status</th>
                    <th className="py-2.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs text-slate-700">
                  {departments.map((d) => (
                    <tr key={d.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-bold text-slate-850">{d.code}</td>
                      <td className="py-3 font-semibold text-slate-800">
                        <span>{d.name}</span>
                        {d.headOfUnit && <span className="block text-[10px] text-slate-400 italic">Head: {d.headOfUnit}</span>}
                      </td>
                      <td className="py-3 text-[10px] font-bold text-sky-850 uppercase">{d.type.replace(/_/g, " ")}</td>
                      <td className="py-3 text-slate-500">
                        {d.parent ? <span className="block">Parent: {d.parent.name}</span> : null}
                        {d.faculty ? <span className="block text-[10px] text-slate-400">Faculty: {d.faculty.name}</span> : null}
                      </td>
                      <td className="py-3">
                        <button
                          onClick={() => toggleUnitStatus(d)}
                          className="flex items-center space-x-1 hover:opacity-85"
                          title="Toggle Status"
                        >
                          {d.status === "ACTIVE" ? (
                            <span className="flex items-center text-emerald-600 font-bold">
                              <ToggleRight className="mr-1" size={16} /> ACTIVE
                            </span>
                          ) : (
                            <span className="flex items-center text-slate-400 font-semibold">
                              <ToggleLeft className="mr-1" size={16} /> INACTIVE
                            </span>
                          )}
                        </button>
                      </td>
                      <td className="py-3 text-right space-x-1">
                        <button
                          onClick={() => setEditingUnit(d)}
                          className="px-2 py-0.5 border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteDept(d.id)}
                          className="p-1 bg-slate-100 hover:bg-red-50 text-slate-500 hover:text-red-700 inline-block align-middle rounded"
                        >
                          <Trash2 size={12} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {activeTab === "hierarchy" && (
            <div className="space-y-4">
              <h4 className="text-xs font-extrabold text-sky-800 uppercase flex items-center border-b border-slate-100 pb-2">
                <Network size={14} className="mr-1.5" />
                University Hierarchical Tree
              </h4>
              <div className="text-xs space-y-4 max-h-[450px] overflow-y-auto pr-2">
                {/* 1. Top Level Units (no parentId) */}
                {departments
                  .filter((d) => !d.parentId)
                  .map((parent) => {
                    const children = departments.filter((child) => child.parentId === parent.id);
                    return (
                      <div key={parent.id} className="p-3 bg-slate-50 rounded-xl border border-slate-100">
                        <div className="flex justify-between items-center font-bold text-slate-800">
                          <span>🏢 {parent.name} ({parent.code})</span>
                          <span className="text-[9px] font-black uppercase bg-sky-50 text-sky-700 px-1.5 py-0.5 rounded border border-sky-100">{parent.type}</span>
                        </div>
                        {parent.officeLocation && <span className="block text-[10px] text-slate-400 mt-0.5">📍 Location: {parent.officeLocation}</span>}

                        {/* Children mapping */}
                        {children.length > 0 && (
                          <div className="mt-2.5 ml-4 pl-4 border-l-2 border-slate-200 space-y-2">
                            {children.map((child) => (
                              <div key={child.id} className="p-2 bg-white rounded border border-slate-100 flex justify-between items-center">
                                <div>
                                  <span className="font-semibold text-slate-700">🔹 {child.name} ({child.code})</span>
                                  {child.officeLocation && <span className="block text-[9px] text-slate-400">📍 {child.officeLocation}</span>}
                                </div>
                                <span className="text-[8px] font-bold text-slate-400 uppercase">{child.type}</span>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
}
