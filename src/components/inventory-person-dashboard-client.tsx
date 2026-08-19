"use client";

import React, { useState } from "react";
import Link from "next/link";
import { ClipboardList, Calendar, Play, CheckCircle, ArrowRight, BookOpen } from "lucide-react";

interface SerializableAssignment {
  id: string;
  sessionNumber: string;
  notes: string;
  status: string;
  startDate: string;
  dueDate: string;
  departmentName: string;
  assignedBy: string;
  totalAssets: number;
  verifiedAssets: number;
  remainingAssets: number;
  progress: number;
}

interface InventoryPersonDashboardClientProps {
  assignments: SerializableAssignment[];
}

export function InventoryPersonDashboardClient({
  assignments
}: InventoryPersonDashboardClientProps) {
  const [activeTab, setActiveTab] = useState<"active" | "completed">("active");

  const activeAssignments = assignments.filter(
    (a) => a.status === "ASSIGNED" || a.status === "IN_PROGRESS" || a.status === "REOPENED"
  );
  const completedAssignments = assignments.filter(
    (a) => a.status === "COMPLETED" || a.status === "CANCELLED"
  );

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
        return "bg-slate-50 text-slate-650 border-slate-150";
    }
  };

  return (
    <div className="space-y-6">
      
      {/* Header */}
      <div className="border-b border-sky-100 pb-4">
        <h2 className="text-xl font-bold text-sky-950 flex items-center gap-2">
          <ClipboardList className="text-sky-700" />
          <span>My Inventory Counting Dashboard</span>
        </h2>
        <p className="text-xs text-sky-600 font-semibold mt-1">
          Perform physical asset verifications for your assigned organizational departments.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-200">
        <button
          onClick={() => setActiveTab("active")}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "active"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-450 hover:text-slate-650"
          }`}
        >
          <Play size={14} />
          Active Assignments ({activeAssignments.length})
        </button>
        <button
          onClick={() => setActiveTab("completed")}
          className={`py-2.5 px-4 font-bold text-xs border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "completed"
              ? "border-[#0b4a6e] text-[#0b4a6e]"
              : "border-transparent text-slate-450 hover:text-slate-650"
          }`}
        >
          <CheckCircle size={14} />
          Completed Audits ({completedAssignments.length})
        </button>
      </div>

      {/* Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {activeTab === "active" ? (
          activeAssignments.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white border border-slate-150 border-dashed rounded-2xl text-slate-400 text-xs font-semibold">
              No active inventory tasks assigned to you.
            </div>
          ) : (
            activeAssignments.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 hover:border-sky-350 transition-colors flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Status header */}
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                        {a.sessionNumber}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-wide mt-0.5">
                        {a.departmentName}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${getStatusBadgeColor(a.status)}`}>
                      {a.status}
                    </span>
                  </div>

                  {/* Dates info */}
                  <div className="grid grid-cols-2 gap-2 text-[10px] text-slate-500 font-semibold bg-slate-50 p-2.5 rounded-xl border border-slate-100">
                    <div className="flex items-center gap-1">
                      <Calendar size={10} className="text-slate-400" />
                      <span>Start: {new Date(a.startDate).toLocaleDateString()}</span>
                    </div>
                    <div className="flex items-center gap-1 font-bold text-slate-700">
                      <Calendar size={10} className="text-sky-700" />
                      <span>Due: {new Date(a.dueDate).toLocaleDateString()}</span>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-[10px] font-bold text-slate-650">
                      <span>Verification Progress</span>
                      <span>{a.progress}%</span>
                    </div>
                    <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-sky-600 h-full rounded-full transition-all duration-300"
                        style={{ width: `${a.progress}%` }}
                      />
                    </div>
                    <div className="flex justify-between text-[9px] font-bold text-slate-400">
                      <span>Total: {a.totalAssets}</span>
                      <span className="text-emerald-700">Verified: {a.verifiedAssets}</span>
                      <span className="text-slate-600">Remaining: {a.remainingAssets}</span>
                    </div>
                  </div>

                  {/* Notes */}
                  {a.notes && (
                    <div className="text-[10px] text-slate-500 bg-amber-50/40 border border-amber-100 p-2.5 rounded-lg flex gap-1.5">
                      <BookOpen size={12} className="text-amber-600 shrink-0 mt-0.5" />
                      <p className="line-clamp-2 leading-normal">{a.notes}</p>
                    </div>
                  )}
                </div>

                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Assigned by: {a.assignedBy}
                  </span>
                  
                  <Link
                    href={`/inventory/${a.id}`}
                    className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-850 text-white rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1"
                  >
                    <span>{a.status === "ASSIGNED" ? "Start Counting" : "Continue Inventory"}</span>
                    <ArrowRight size={12} />
                  </Link>
                </div>
              </div>
            ))
          )
        ) : (
          completedAssignments.length === 0 ? (
            <div className="col-span-2 text-center py-16 bg-white border border-slate-150 border-dashed rounded-2xl text-slate-400 text-xs font-semibold">
              No completed inventory sessions found.
            </div>
          ) : (
            completedAssignments.map((a) => (
              <div
                key={a.id}
                className="bg-white border border-slate-150 rounded-2xl p-5 shadow-sm space-y-4 hover:border-sky-350 transition-colors flex flex-col justify-between opacity-85"
              >
                <div className="space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold uppercase tracking-widest block">
                        {a.sessionNumber}
                      </span>
                      <h3 className="text-sm font-extrabold text-slate-800 tracking-wide mt-0.5">
                        {a.departmentName}
                      </h3>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[8px] font-bold border ${getStatusBadgeColor(a.status)}`}>
                      {a.status}
                    </span>
                  </div>

                  {/* Progress info */}
                  <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl flex justify-between items-center text-xs">
                    <div>
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Success Rate</p>
                      <p className="text-base font-black text-emerald-700">{a.progress}%</p>
                    </div>
                    <div className="text-right text-[10px] text-slate-500 space-y-0.5">
                      <p>Total Assets: <span className="font-bold text-slate-800">{a.totalAssets}</span></p>
                      <p>Verified count: <span className="font-bold text-emerald-750">{a.verifiedAssets}</span></p>
                      <p>Unverified count: <span className="font-bold text-red-650">{a.remainingAssets}</span></p>
                    </div>
                  </div>
                </div>

                <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between">
                  <span className="text-[9px] text-slate-400 font-semibold">
                    Assigned by: {a.assignedBy}
                  </span>

                  <Link
                    href={`/inventory/${a.id}`}
                    className="px-4 py-2 border border-slate-200 hover:bg-slate-50 text-slate-650 rounded-lg text-xs font-bold transition-all"
                  >
                    View Summary
                  </Link>
                </div>
              </div>
            ))
          )
        )}
      </div>

    </div>
  );
}
