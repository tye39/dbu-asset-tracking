"use client";

import React, { useState, useTransition, useEffect } from "react";
import Link from "next/link";
import { startInventoryAction } from "@/app/actions/inventory";
import { ClipboardList, Plus, Play, CheckCircle, Loader2, Calendar, User, FileText } from "lucide-react";

interface SerializedSession {
  id: string;
  sessionNumber: string;
  notes: string;
  status: string;
  startDate: string;
  dueDate: string;
  department: { name: string };
  inventoryPerson: { name: string };
  assignedBy: { name: string };
  completedAt?: string | null;
  completedBy?: { name: string } | null;
}

interface InventoryListClientProps {
  departments: { id: string; name: string; code: string }[];
  activeSessions: SerializedSession[];
  completedSessions: SerializedSession[];
  inventoryPersons: { id: string; name: string; email: string }[];
}

export function InventoryListClient({
  departments,
  activeSessions,
  completedSessions,
  inventoryPersons
}: InventoryListClientProps) {
  const [showModal, setShowModal] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  // Form states
  const [sessionNumber, setSessionNumber] = useState("");
  const [departmentId, setDepartmentId] = useState("");
  const [inventoryPersonId, setInventoryPersonId] = useState("");
  const [startDate, setStartDate] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [notes, setNotes] = useState("");

  // Auto-generate session number
  useEffect(() => {
    if (showModal) {
      const rand = Math.floor(1000 + Math.random() * 9000);
      setSessionNumber(`INV-2026-${rand}`);
      
      const today = new Date().toISOString().split("T")[0];
      setStartDate(today);
      
      const nextWeek = new Date();
      nextWeek.setDate(nextWeek.getDate() + 7);
      setDueDate(nextWeek.toISOString().split("T")[0]);
    }
  }, [showModal]);

  const handleStartInventory = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!sessionNumber || !departmentId || !inventoryPersonId || !startDate || !dueDate) {
      setError("Please complete all required fields.");
      return;
    }

    startTransition(async () => {
      const res = await startInventoryAction({
        sessionNumber,
        departmentId,
        inventoryPersonId,
        startDate,
        dueDate,
        notes
      });
      if (res.error) {
        setError(res.error);
      } else {
        setShowModal(false);
        // Reset states
        setSessionNumber("");
        setDepartmentId("");
        setInventoryPersonId("");
        setNotes("");
        window.location.reload();
      }
    });
  };

  const getStatusBadgeColor = (status: string) => {
    switch (status) {
      case "ASSIGNED":
        return "bg-slate-100 text-slate-700 border-slate-200";
      case "IN_PROGRESS":
        return "bg-sky-50 text-sky-700 border-sky-150";
      case "REOPENED":
        return "bg-amber-50 text-amber-700 border-amber-150 animate-pulse";
      case "COMPLETED":
        return "bg-emerald-50 text-emerald-700 border-emerald-150";
      case "CANCELLED":
        return "bg-red-50 text-red-750 border-red-150";
      default:
        return "bg-slate-50 text-slate-600 border-slate-150";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header block */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4">
        <div>
          <h2 className="text-xl font-bold text-sky-950 flex items-center gap-2">
            <ClipboardList className="text-sky-700" />
            <span>Physical Inventory Assignments</span>
          </h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">
            Create permits and monitor physical inventory counting sessions performed by Inventory Persons.
          </p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold flex items-center space-x-1.5 shadow transition-all transform hover:scale-[1.02]"
        >
          <Plus size={14} />
          <span>New Inventory Assignment</span>
        </button>
      </div>

      {/* Grid of active / completed tables */}
      <div className="grid grid-cols-1 gap-6">
        
        {/* Active inventory sessions */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-50 mb-4">
            <Play className="text-sky-600" size={16} />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Active Counting Permits ({activeSessions.length})
            </h3>
          </div>

          {activeSessions.length === 0 ? (
            <div className="text-center py-12 border border-dashed border-slate-200 rounded-xl space-y-2">
              <ClipboardList className="mx-auto text-slate-300" size={32} />
              <p className="text-xs text-slate-500 font-semibold">No active inventory sessions are running.</p>
              <button
                onClick={() => setShowModal(true)}
                className="text-xs text-sky-700 font-bold hover:underline"
              >
                Create one now &rarr;
              </button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-450 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Session Number</th>
                    <th className="py-3 px-4">Department Unit</th>
                    <th className="py-3 px-4">Inventory Person</th>
                    <th className="py-3 px-4">Timeline</th>
                    <th className="py-3 px-4">Created By</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeSessions.map((session) => (
                    <tr key={session.id} className="border-b border-slate-50 text-xs text-slate-700 hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{session.sessionNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-650">{session.department.name}</td>
                      <td className="py-3 px-4 font-medium text-[#0b4a6e]">{session.inventoryPerson.name}</td>
                      <td className="py-3 px-4 space-y-0.5">
                        <p className="text-[10px] text-slate-500">Start: {new Date(session.startDate).toLocaleDateString()}</p>
                        <p className="text-[10px] text-slate-650 font-bold">Due: {new Date(session.dueDate).toLocaleDateString()}</p>
                      </td>
                      <td className="py-3 px-4 text-slate-500">{session.assignedBy.name}</td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold border rounded ${getStatusBadgeColor(session.status)}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/pao/inventory/${session.id}`}
                          className="inline-block px-3.5 py-1.5 bg-[#0b4a6e] hover:bg-sky-850 text-white text-[10px] font-bold rounded-lg transition-colors shadow-sm"
                        >
                          Monitor Session &rarr;
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Completed inventory reports list */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center space-x-2 pb-4 border-b border-slate-50 mb-4">
            <CheckCircle className="text-emerald-500" size={16} />
            <h3 className="text-sm font-extrabold text-slate-800 uppercase tracking-wider">
              Completed Audits History ({completedSessions.length})
            </h3>
          </div>

          {completedSessions.length === 0 ? (
            <div className="text-center py-8 text-xs text-slate-400 font-semibold">
              No historical completed inventory logs found.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] font-extrabold text-slate-450 uppercase tracking-wider bg-slate-50/50">
                    <th className="py-3 px-4">Session Number</th>
                    <th className="py-3 px-4">Department Unit</th>
                    <th className="py-3 px-4">Inventory Person</th>
                    <th className="py-3 px-4">Completed By</th>
                    <th className="py-3 px-4">Completion Date</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {completedSessions.map((session) => (
                    <tr key={session.id} className="border-b border-slate-50 text-xs text-slate-700 hover:bg-slate-50/40 transition-colors">
                      <td className="py-3 px-4 font-bold text-slate-800">{session.sessionNumber}</td>
                      <td className="py-3 px-4 font-semibold text-slate-650">{session.department.name}</td>
                      <td className="py-3 px-4 text-[#0b4a6e] font-medium">{session.inventoryPerson.name}</td>
                      <td className="py-3 px-4">{session.completedBy?.name || "System"}</td>
                      <td className="py-3 px-4 font-mono text-[10px] text-slate-500">
                        {session.completedAt ? new Date(session.completedAt).toLocaleDateString() : "-"}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`inline-block px-2 py-0.5 text-[9px] font-bold border rounded ${getStatusBadgeColor(session.status)}`}>
                          {session.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <Link
                          href={`/pao/inventory/${session.id}`}
                          className="inline-block px-3 py-1.5 border border-slate-200 hover:bg-slate-50 text-slate-600 text-[10px] font-bold rounded-lg transition-colors"
                        >
                          View Results Summary
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* CREATE MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/60 flex items-center justify-center z-50 p-4 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl p-6 border border-slate-150 space-y-4">
            
            <div className="flex justify-between items-start border-b border-slate-100 pb-3">
              <div>
                <h3 className="text-sm font-bold text-slate-800 flex items-center gap-1.5">
                  <ClipboardList size={16} className="text-[#0b4a6e]" />
                  <span>Create Inventory Assignment Permit</span>
                </h3>
                <p className="text-[10px] text-slate-400 font-semibold mt-1">
                  Issue a structured counting directive for specific organizational departments.
                </p>
              </div>
              <button
                onClick={() => {
                  setShowModal(false);
                  setError(null);
                }}
                className="text-slate-450 hover:text-slate-650 text-sm font-bold hover:bg-slate-100 px-2.5 py-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-red-50 border border-red-150 rounded-xl text-red-800 text-[11px] font-semibold">
                {error}
              </div>
            )}

            <form onSubmit={handleStartInventory} className="space-y-3.5">
              
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Session Number *
                  </label>
                  <div className="relative">
                    <FileText size={12} className="absolute left-2 top-2.5 text-slate-400" />
                    <input
                      type="text"
                      className="w-full p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                      placeholder="INV-2026-0001"
                      value={sessionNumber}
                      onChange={(e) => setSessionNumber(e.target.value)}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase">
                    Organizational Unit *
                  </label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={departmentId}
                    onChange={(e) => setDepartmentId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Unit --</option>
                    {departments.map((d) => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.code})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Assigned Inventory Person *
                </label>
                <div className="relative">
                  <User size={12} className="absolute left-2 top-2.5 text-slate-400" />
                  <select
                    className="w-full p-2 pl-7 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={inventoryPersonId}
                    onChange={(e) => setInventoryPersonId(e.target.value)}
                    required
                  >
                    <option value="">-- Select Registered Person --</option>
                    {inventoryPersons.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.email})
                      </option>
                    ))}
                  </select>
                </div>
                {inventoryPersons.length === 0 && (
                  <p className="text-[9px] text-amber-600 font-bold mt-1">
                    ⚠ No active Inventory Persons found. Please register some in the &apos;Inventory Persons&apos; tab first!
                  </p>
                )}
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar size={10} /> Start Date *
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    required
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase flex items-center gap-1">
                    <Calendar size={10} /> Due Date *
                  </label>
                  <input
                    type="date"
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none"
                    value={dueDate}
                    onChange={(e) => setDueDate(e.target.value)}
                    required
                  />
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-[10px] font-bold text-slate-500 uppercase">
                  Instructions & Notes (Optional)
                </label>
                <textarea
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold focus:outline-none h-20 resize-none"
                  placeholder="Counting procedures, asset verification constraints..."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 border-t border-slate-100 pt-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowModal(false);
                    setError(null);
                  }}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs font-bold text-slate-500 hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending || inventoryPersons.length === 0}
                  className="px-5 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                >
                  {isPending && <Loader2 size={12} className="animate-spin" />}
                  Assign counting task
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

    </div>
  );
}
