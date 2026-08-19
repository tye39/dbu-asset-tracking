"use client";

import React, { useState, useTransition } from "react";
import { registerInventoryPersonAction, toggleInventoryPersonAction } from "@/app/actions/inventory-person";
import { Search, Plus, ShieldCheck, UserCheck, Eye, ToggleLeft, ToggleRight, XCircle, Info, Loader2 } from "lucide-react";

interface AssignmentInfo {
  id: string;
  sessionNumber: string;
  status: string;
  departmentName: string;
  verifiedCount: number;
}

interface RegisteredPerson {
  id: string;
  userId: string;
  isActive: boolean;
  registeredAt: string;
  user: {
    name: string;
    email: string;
    roleName: string;
    departmentName: string;
  };
  registeredBy: {
    name: string;
  };
  assignments: AssignmentInfo[];
}

interface EligibleUser {
  id: string;
  name: string;
  email: string;
  roleName: string;
  departmentName: string;
}

interface InventoryPersonsClientProps {
  registeredPersons: RegisteredPerson[];
  eligibleUsers: EligibleUser[];
}

export function InventoryPersonsClient({
  registeredPersons,
  eligibleUsers
}: InventoryPersonsClientProps) {
  const [isPending, startTransition] = useTransition();

  // Search & Filter state for registered table
  const [searchTerm, setSearchTerm] = useState("");

  // Registration Modal states
  const [showRegModal, setShowRegModal] = useState(false);
  const [userSearchTerm, setUserSearchTerm] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [modalError, setModalError] = useState<string | null>(null);

  // Inspector details states
  const [selectedPerson, setSelectedPerson] = useState<RegisteredPerson | null>(null);

  // Search filtered registered lists
  const filteredPersons = registeredPersons.filter((p) => {
    const term = searchTerm.toLowerCase();
    return (
      p.user.name.toLowerCase().includes(term) ||
      p.user.email.toLowerCase().includes(term) ||
      p.user.departmentName.toLowerCase().includes(term) ||
      p.user.roleName.toLowerCase().includes(term)
    );
  });

  // Search filtered eligible users list
  const filteredUsers = eligibleUsers.filter((u) => {
    const term = userSearchTerm.toLowerCase();
    return (
      u.name.toLowerCase().includes(term) ||
      u.email.toLowerCase().includes(term) ||
      u.departmentName.toLowerCase().includes(term) ||
      u.roleName.toLowerCase().includes(term)
    );
  });

  const handleRegisterSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserId) {
      setModalError("Please select a system user to register.");
      return;
    }

    setModalError(null);
    startTransition(async () => {
      const res = await registerInventoryPersonAction(selectedUserId);
      if (res.error) {
        setModalError(res.error);
      } else {
        setShowRegModal(false);
        setSelectedUserId("");
        setUserSearchTerm("");
        alert("User registered as Inventory Person successfully!");
      }
    });
  };

  const handleToggleStatus = (id: string, currentStatus: boolean) => {
    if (!confirm(`Are you sure you want to ${currentStatus ? "deactivate" : "activate"} this Inventory Person?`)) {
      return;
    }

    startTransition(async () => {
      const res = await toggleInventoryPersonAction(id, !currentStatus);
      if (res.error) {
        alert(res.error);
      } else {
        alert(`Inventory Person status updated successfully!`);
        // Update local detail inspect view if open
        if (selectedPerson && selectedPerson.id === id) {
          setSelectedPerson(prev => prev ? { ...prev, isActive: !currentStatus } : null);
        }
      }
    });
  };

  return (
    <div className="space-y-6">
      
      {/* Title */}
      <div className="border-b border-sky-100 pb-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-xl font-bold text-sky-950 flex items-center gap-2">
            <UserCheck className="text-sky-700" />
            <span>Manage Inventory Persons</span>
          </h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">
            Designate eligible system users as authorized physical inventory counters.
          </p>
        </div>

        <button
          onClick={() => {
            setModalError(null);
            setShowRegModal(true);
          }}
          className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 shrink-0 self-start md:self-auto"
        >
          <Plus size={14} />
          Register Inventory Person
        </button>
      </div>

      {/* Main List & Search Bar */}
      <div className="bg-white border border-slate-100 rounded-2xl p-5 shadow-sm space-y-4">
        
        {/* Search */}
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-3 text-slate-400" />
          <input
            type="text"
            placeholder="Search registered persons by name, email, department..."
            className="w-full p-2 pl-9 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none focus:border-sky-500"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>

        {/* Table list */}
        <div className="bg-white border border-slate-100 rounded-xl overflow-hidden shadow-sm">
          {filteredPersons.length === 0 ? (
            <div className="text-center py-12 text-slate-400 text-xs font-semibold">
              No registered Inventory Persons found matching criteria.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-400 uppercase bg-slate-50/50">
                    <th className="py-3 px-4">Name & Email</th>
                    <th className="py-3 px-4">Department Unit</th>
                    <th className="py-3 px-4">System Role</th>
                    <th className="py-3 px-4 text-center">Active Status</th>
                    <th className="py-3 px-4">Registered By</th>
                    <th className="py-3 px-4 text-center">Tasks Count</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredPersons.map((person) => {
                    const activeTasks = person.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS").length;
                    
                    return (
                      <tr key={person.id} className="border-b border-slate-50 hover:bg-slate-50/30 text-slate-650 transition-colors">
                        <td className="py-3.5 px-4">
                          <p className="font-bold text-slate-800">{person.user.name}</p>
                          <p className="text-[10px] text-slate-450">{person.user.email}</p>
                        </td>
                        <td className="py-3.5 px-4 font-semibold text-slate-700">
                          {person.user.departmentName}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-[9px] uppercase tracking-wider text-slate-450">
                          {person.user.roleName.replace(/_/g, " ")}
                        </td>
                        <td className="py-3.5 px-4 text-center">
                          <span className={`inline-block px-2 py-0.5 rounded text-[9px] font-bold border ${
                            person.isActive
                              ? "bg-emerald-50 text-emerald-700 border-emerald-150"
                              : "bg-red-50 text-red-700 border-red-150"
                          }`}>
                            {person.isActive ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-slate-500 font-medium">
                          {person.registeredBy.name}
                        </td>
                        <td className="py-3.5 px-4 text-center font-bold text-slate-850">
                          {activeTasks} Active / {person.assignments.length} Total
                        </td>
                        <td className="py-3.5 px-4 text-right flex items-center justify-end space-x-1">
                          <button
                            onClick={() => setSelectedPerson(person)}
                            className="p-1.5 text-sky-700 hover:text-sky-900 rounded hover:bg-sky-50 transition-all"
                            title="Inspect Assignments"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            disabled={isPending}
                            onClick={() => handleToggleStatus(person.id, person.isActive)}
                            className={`p-1.5 rounded transition-all ${
                              person.isActive
                                ? "text-amber-600 hover:text-amber-800 hover:bg-amber-50"
                                : "text-emerald-600 hover:text-emerald-800 hover:bg-emerald-50"
                            }`}
                            title={person.isActive ? "Deactivate User" : "Activate User"}
                          >
                            {person.isActive ? <ToggleRight size={18} /> : <ToggleLeft size={18} />}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* REGISTRATION MODAL */}
      {showRegModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ShieldCheck size={16} className="text-[#0b4a6e]" />
                  <span>Register Inventory Person Profile</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Designate an active system user as an authorized physical scanner.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowRegModal(false);
                  setSelectedUserId("");
                  setUserSearchTerm("");
                }}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {/* Error alerts */}
            {modalError && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-800 text-[11px] font-semibold flex items-center gap-2">
                <XCircle size={14} className="shrink-0" />
                <span>{modalError}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSubmit} className="space-y-4">
              
              {/* Search Eligible Users list */}
              <div className="space-y-1.5">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Search & Select System User *
                </label>
                <div className="relative">
                  <Search size={12} className="absolute left-2.5 top-2.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Search users by name, email, department..."
                    className="w-full p-2 pl-8 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={userSearchTerm}
                    onChange={(e) => setUserSearchTerm(e.target.value)}
                  />
                </div>

                {/* List box selection */}
                <div className="border border-slate-200 rounded-lg max-h-48 overflow-y-auto divide-y divide-slate-50 text-xs">
                  {filteredUsers.length === 0 ? (
                    <div className="text-center py-8 text-slate-400 text-xs">
                      No eligible system users found.
                    </div>
                  ) : (
                    filteredUsers.map((u) => (
                      <label
                        key={u.id}
                        className={`flex items-center gap-3 p-2.5 hover:bg-slate-50/50 cursor-pointer transition-colors ${
                          selectedUserId === u.id ? "bg-sky-50/50 font-bold" : ""
                        }`}
                      >
                        <input
                          type="radio"
                          name="eligibleUser"
                          value={u.id}
                          checked={selectedUserId === u.id}
                          onChange={() => setSelectedUserId(u.id)}
                          className="text-[#0b4a6e] focus:ring-[#0b4a6e]"
                        />
                        <div className="overflow-hidden">
                          <p className="text-slate-800 leading-tight">{u.name}</p>
                          <p className="text-[10px] text-slate-450 leading-tight">
                            {u.email} • <span className="font-medium text-sky-800">{u.departmentName}</span>
                          </p>
                        </div>
                      </label>
                    ))
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowRegModal(false);
                    setSelectedUserId("");
                    setUserSearchTerm("");
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || !selectedUserId}
                  className="px-5 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Register as Inventory Person
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* INSPECTOR DETAILS DRAWER / MODAL */}
      {selectedPerson && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-2xl shadow-2xl p-6 border border-slate-150 space-y-4">
            
            {/* Header */}
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <Info size={16} className="text-[#0b4a6e]" />
                  <span>Assignments profile for {selectedPerson.user.name}</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Email: {selectedPerson.user.email} • Dept: {selectedPerson.user.departmentName}
                </p>
              </div>
              <button
                onClick={() => setSelectedPerson(null)}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕ Close
              </button>
            </div>

            {/* Content lists */}
            <div className="space-y-4 max-h-[350px] overflow-y-auto pr-1">
              
              {/* Section 1: Active assignments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">
                  Active Counting Permits / Tasks
                </h4>
                
                {selectedPerson.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS").length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No active inventory sessions assigned.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPerson.assignments.filter(a => a.status === "ASSIGNED" || a.status === "IN_PROGRESS").map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{a.sessionNumber}</p>
                          <p className="text-[10px] text-slate-450">Department: {a.departmentName}</p>
                        </div>
                        <span className={`px-2 py-0.5 rounded text-[8px] font-bold uppercase ${
                          a.status === "IN_PROGRESS"
                            ? "bg-sky-50 text-sky-700 border border-sky-150"
                            : "bg-slate-100 text-slate-600 border border-slate-200"
                        }`}>
                          {a.status}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Section 2: Completed assignments */}
              <div>
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest border-b border-slate-50 pb-1 mb-2">
                  Completed Counting Tasks History
                </h4>

                {selectedPerson.assignments.filter(a => a.status === "COMPLETED" || a.status === "APPROVED").length === 0 ? (
                  <p className="text-xs text-slate-400 py-2">No completed inventory sessions recorded.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedPerson.assignments.filter(a => a.status === "COMPLETED" || a.status === "APPROVED").map((a) => (
                      <div key={a.id} className="p-3 bg-slate-50 border border-slate-150 rounded-xl flex items-center justify-between text-xs">
                        <div>
                          <p className="font-bold text-slate-800">{a.sessionNumber}</p>
                          <p className="text-[10px] text-slate-450">Department: {a.departmentName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-emerald-700">{a.verifiedCount} Assets Verified</p>
                          <span className="px-2 py-0.5 rounded text-[8px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-150">
                            {a.status}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
