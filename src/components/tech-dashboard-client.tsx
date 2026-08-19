"use client";

import React, { useState, useTransition } from "react";
import { MaintenanceRequestsChart } from "./charts/maintenance-by-status";
import { updateMaintenanceAction } from "@/app/actions/maintenance";
import { useRouter } from "next/navigation";
import {
  Wrench,
  CheckCircle,
  Clock,
  X,
  Loader2,
  DollarSign
} from "lucide-react";

interface TaskItem {
  id: string;
  description: string;
  priority: string;
  status: "PENDING" | "IN_PROGRESS" | "COMPLETED";
  cost?: number | null;
  notes?: string | null;
  asset: { name: string; assetCode: string };
  reportedBy: { name: string };
}

interface TechDashboardClientProps {
  stats: {
    openTasks: number;
    inProgressTasks: number;
    completedThisMonth: number;
  };
  chartData: { status: string; count: number }[];
  myTasks: TaskItem[];
}

export function TechDashboardClient({
  stats,
  chartData,
  myTasks,
}: TechDashboardClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // Modal State
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  // Form State
  const [taskStatus, setTaskStatus] = useState<"PENDING" | "IN_PROGRESS" | "COMPLETED">("PENDING");
  const [taskCost, setTaskCost] = useState("");
  const [taskNotes, setTaskNotes] = useState("");
  const [updateError, setUpdateError] = useState<string | null>(null);

  const handleOpenUpdateModal = (task: TaskItem) => {
    setSelectedTask(task);
    setTaskStatus(task.status);
    setTaskCost(task.cost ? task.cost.toString() : "");
    setTaskNotes(task.notes || "");
    setUpdateError(null);
    setShowUpdateModal(true);
  };

  const handleUpdateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setUpdateError(null);

    if (!selectedTask) return;

    startTransition(async () => {
      const res = await updateMaintenanceAction(null, {
        id: selectedTask.id,
        status: taskStatus,
        cost: taskStatus === "COMPLETED" ? Number(taskCost) || 0 : undefined,
        notes: taskNotes,
      });

      if (res.error) {
        setUpdateError(res.error);
      } else {
        setShowUpdateModal(false);
        setSelectedTask(null);
        setTaskCost("");
        setTaskNotes("");
        alert("Maintenance task updated successfully!");
        router.refresh();
      }
    });
  };

  const getPriorityBadgeColor = (prio: string) => {
    switch (prio) {
      case "HIGH":
        return "bg-red-50 text-red-700 border-red-100";
      case "MEDIUM":
        return "bg-yellow-50 text-yellow-700 border-yellow-100";
      case "LOW":
        return "bg-slate-50 text-slate-700 border-slate-100";
      default:
        return "bg-slate-50 text-slate-700 border-slate-100";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header section matching mockup color */}
      <div className="flex items-center justify-between border-b border-orange-100 pb-4 bg-orange-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-orange-950">MAINTENANCE TECHNICIAN WORKSPACE</h2>
          <p className="text-xs text-orange-700 font-semibold mt-1">Asset Repair Hub & Diagnostic Station</p>
        </div>
      </div>

      {/* Grid of stats cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Open Tasks */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-yellow-50 text-yellow-600 rounded-lg"><Clock size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Open Requests</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.openTasks}</h3>
          </div>
        </div>

        {/* In Progress Tasks */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-lg"><Wrench size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">In Progress Tasks</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.inProgressTasks}</h3>
          </div>
        </div>

        {/* Completed This Month */}
        <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
          <div className="p-3 bg-green-50 text-green-600 rounded-lg"><CheckCircle size={20} /></div>
          <div>
            <p className="text-[10px] font-extrabold text-slate-400 uppercase">Completed This Month</p>
            <h3 className="text-lg font-bold text-slate-800 mt-0.5">{stats.completedThisMonth}</h3>
          </div>
        </div>
      </div>

      {/* Table of Tasks & Chart */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Table list */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm lg:col-span-2">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4">My Assigned Maintenance Tasks</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                  <th className="py-2.5">Asset</th>
                  <th className="py-2.5">Problem Details</th>
                  <th className="py-2.5">Priority</th>
                  <th className="py-2.5">Status</th>
                  <th className="py-2.5 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50 text-xs">
                {myTasks.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-slate-400 font-semibold">
                      No repair tasks currently assigned to you.
                    </td>
                  </tr>
                ) : (
                  myTasks.map((task) => (
                    <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 font-semibold text-slate-800">
                        {task.asset.name}
                        <span className="block text-[10px] text-slate-400">{task.asset.assetCode}</span>
                      </td>
                      <td className="py-3 text-slate-500 max-w-[200px] truncate">{task.description}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${getPriorityBadgeColor(task.priority)}`}>
                          {task.priority}
                        </span>
                      </td>
                      <td className="py-3 font-semibold">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                          task.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                          task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700 animate-pulse" : "bg-yellow-50 text-yellow-700"
                        }`}>
                          {task.status}
                        </span>
                      </td>
                      <td className="py-3 text-right">
                        <button
                          onClick={() => handleOpenUpdateModal(task)}
                          className="px-2.5 py-1 text-[10px] bg-orange-600 hover:bg-orange-700 text-white rounded font-bold transition-all"
                        >
                          Update
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Charts */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-xs font-extrabold text-slate-700 uppercase mb-4">Request Status Distribution</h4>
            <MaintenanceRequestsChart data={chartData} />
          </div>
        </div>
      </div>

      {/* Modal: UPDATE TASK STATUS */}
      {showUpdateModal && selectedTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <button
              onClick={() => setShowUpdateModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Update Task Status</h3>

            {updateError && (
              <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">
                {updateError}
              </div>
            )}

            <form onSubmit={handleUpdateSubmit} className="space-y-4">
              <div>
                <p className="text-xs font-bold text-slate-700">{selectedTask.asset.name} ({selectedTask.asset.assetCode})</p>
                <p className="text-[10px] text-slate-500 mt-1 italic">&quot;{selectedTask.description}&quot;</p>
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Status</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                  value={taskStatus}
                  onChange={(e) => setTaskStatus(e.target.value as "PENDING" | "IN_PROGRESS" | "COMPLETED")}
                >
                  <option value="PENDING">Pending (Not Started)</option>
                  <option value="IN_PROGRESS">In Progress (Diagnosing/Repairing)</option>
                  <option value="COMPLETED">Completed (Repaired & Tested)</option>
                </select>
              </div>

              {taskStatus === "COMPLETED" && (
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Repair Cost (ETB)</label>
                  <div className="relative">
                    <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400 text-xs">
                      <DollarSign size={12} />
                    </span>
                    <input
                      type="number"
                      step="0.01"
                      required
                      placeholder="0.00"
                      className="w-full pl-8 pr-4 py-2 bg-slate-50 border border-slate-200 rounded-lg text-xs"
                      value={taskCost}
                      onChange={(e) => setTaskCost(e.target.value)}
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">Remarks / Diagnostic Notes</label>
                <textarea
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded-lg text-xs h-20 resize-none"
                  placeholder="Details of parts replaced, repairs done..."
                  value={taskNotes}
                  onChange={(e) => setTaskNotes(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowUpdateModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
