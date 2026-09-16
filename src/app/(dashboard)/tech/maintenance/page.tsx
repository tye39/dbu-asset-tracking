import React from "react";
import { prisma } from "@/lib/db";
import { Eye } from "lucide-react";
import Link from "next/link";
import { MaintenanceStatus, MaintenancePriority, Prisma } from "@prisma/client";

export const revalidate = 0;

interface MaintenancePageProps {
  searchParams: {
    status?: string;
    priority?: string;
  };
}

export default async function TechMaintenancePage({ searchParams }: MaintenancePageProps) {
  const filterStatus = (searchParams.status as MaintenanceStatus) || undefined;
  const filterPriority = (searchParams.priority as MaintenancePriority) || undefined;

  const where: Prisma.MaintenanceWhereInput = {};
  if (filterStatus) {
    where.status = filterStatus;
  }
  if (filterPriority) {
    where.priority = filterPriority;
  }

  const tasks = await prisma.maintenance.findMany({
    where,
    include: {
      asset: true,
      reportedBy: true,
      assignedTo: true,
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-orange-100 pb-4 bg-orange-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-orange-950">Maintenance Workorders</h2>
          <p className="text-xs text-orange-700 font-semibold mt-1">Full registry of repair jobs, costs, and diagnostics</p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {/* Status filter */}
          <select
            name="status"
            defaultValue={filterStatus || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Statuses --</option>
            <option value="PENDING">Pending</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="COMPLETED">Completed</option>
          </select>

          {/* Priority filter */}
          <select
            name="priority"
            defaultValue={filterPriority || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Priorities --</option>
            <option value="LOW">Low</option>
            <option value="MEDIUM">Medium</option>
            <option value="HIGH">High</option>
          </select>

          <button
            type="submit"
            className="px-4 py-1.5 bg-orange-600 hover:bg-orange-700 text-white rounded-lg text-xs font-bold transition-all"
          >
            Apply Filters
          </button>

          {(filterStatus || filterPriority) && (
            <Link
              href="/tech/maintenance"
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Tasks Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5">Asset</th>
                <th className="py-2.5">Problem Details</th>
                <th className="py-2.5">Priority</th>
                <th className="py-2.5">Reporter</th>
                <th className="py-2.5">Cost</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {tasks.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-6 text-center text-slate-400 font-semibold">
                    No maintenance tasks found.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-semibold text-slate-800">
                      {task.asset.name}
                      <span className="block text-[10px] text-slate-400 font-mono font-bold text-sky-700">{task.asset.assetCode}</span>
                    </td>
                    <td className="py-3 text-slate-500 max-w-[200px] truncate">{task.description}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-extrabold border ${
                        task.priority === "HIGH" ? "bg-red-50 text-red-700 border-red-100" :
                        task.priority === "MEDIUM" ? "bg-yellow-50 text-yellow-700 border-yellow-100" : "bg-slate-50 text-slate-700 border-slate-100"
                      }`}>
                        {task.priority}
                      </span>
                    </td>
                    <td className="py-3 text-slate-500">{task.reportedBy.name}</td>
                    <td className="py-3 text-slate-600 font-semibold">
                      {task.cost ? `${task.cost} ETB` : "-"}
                    </td>
                    <td className="py-3 font-semibold">
                      <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                        task.status === "COMPLETED" ? "bg-green-50 text-green-700" :
                        task.status === "IN_PROGRESS" ? "bg-blue-50 text-blue-700" : "bg-yellow-50 text-yellow-700"
                      }`}>
                        {task.status}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <Link
                        href={`/assets/${task.asset.id}`}
                        className="inline-flex items-center space-x-1.5 px-3 py-1 bg-slate-100 hover:bg-orange-50 hover:text-orange-700 text-slate-600 rounded font-bold transition-all text-[11px]"
                      >
                        <Eye size={12} />
                        <span>Manage Asset</span>
                      </Link>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
