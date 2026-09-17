import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Prisma } from "@prisma/client";
import { Search, ChevronLeft, ChevronRight, Globe, ShieldCheck } from "lucide-react";
import Link from "next/link";

export const revalidate = 0;

interface HeadAuditLogsPageProps {
  searchParams: {
    search?: string;
    action?: string;
    staffId?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

export default async function HeadAuditLogsPage({ searchParams }: HeadAuditLogsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const deptId = session.user.departmentId;
  if (!deptId) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
        You are not assigned to any faculty department. Contact System Administrator.
      </div>
    );
  }

  const page = Number(searchParams.page) || 1;
  const limit = 15;
  const skip = (page - 1) * limit;

  const searchQuery = searchParams.search || "";
  const filterAction = searchParams.action || "";
  const filterStaffId = searchParams.staffId || "";
  const startDate = searchParams.startDate || "";
  const endDate = searchParams.endDate || "";

  // 1. Fetch Department Info
  const department = await prisma.organizationalUnit.findUnique({
    where: { id: deptId },
    select: { id: true, name: true, code: true }
  });

  // 2. Fetch Department Staff list for filter dropdown
  const departmentStaff = await prisma.user.findMany({
    where: {
      departmentId: deptId,
      deletedAt: null,
    },
    select: { id: true, name: true, email: true, role: { select: { name: true } } },
    orderBy: { name: "asc" }
  });

  // 3. Build where clause strictly scoped to this department's staff or department's assets
  const whereConditions: Prisma.AuditLogWhereInput[] = [
    {
      OR: [
        // Actions performed by department users
        { user: { departmentId: deptId } },
        // Actions affecting department assets
        { asset: { departmentId: deptId } },
      ]
    }
  ];

  if (filterStaffId) {
    whereConditions.push({ userId: filterStaffId });
  }

  if (filterAction) {
    whereConditions.push({ action: filterAction });
  }

  if (startDate || endDate) {
    const dateRange: Prisma.DateTimeFilter = {};
    if (startDate) {
      dateRange.gte = new Date(startDate);
    }
    if (endDate) {
      const end = new Date(endDate);
      end.setHours(23, 59, 59, 999);
      dateRange.lte = end;
    }
    whereConditions.push({ createdAt: dateRange });
  }

  if (searchQuery) {
    whereConditions.push({
      OR: [
        { action: { contains: searchQuery, mode: "insensitive" } },
        { entityType: { contains: searchQuery, mode: "insensitive" } },
        { user: { name: { contains: searchQuery, mode: "insensitive" } } },
        { user: { email: { contains: searchQuery, mode: "insensitive" } } },
        { asset: { name: { contains: searchQuery, mode: "insensitive" } } },
        { asset: { assetCode: { contains: searchQuery, mode: "insensitive" } } },
      ]
    });
  }

  const where: Prisma.AuditLogWhereInput = {
    AND: whereConditions,
  };

  // 4. Fetch logs
  const [logs, totalLogs] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
      include: {
        user: { select: { name: true, email: true, role: { select: { name: true } } } },
        asset: { select: { name: true, assetCode: true } }
      }
    }),
    prisma.auditLog.count({ where }),
  ]);

  const totalPages = Math.ceil(totalLogs / limit);

  const actionsList = [
    "STAFF_MEMBER_REQUESTED_ASSET",
    "DEPARTMENT_HEAD_APPROVED_REQUEST",
    "DEPARTMENT_HEAD_REJECTED_REQUEST",
    "PROPERTY_MANAGEMENT_APPROVED_REQUEST",
    "PROPERTY_MANAGEMENT_REJECTED_REQUEST",
    "ASSET_REQUEST_FULFILLED",
    "ASSET_ASSIGNMENT_CREATED",
    "ASSET_ASSIGNMENT_ACCEPTED",
    "ASSET_ASSIGNMENT_REJECTED",
    "ASSET_RETURN_REQUESTED",
    "ASSET_RETURN_PROCESSED",
    "MAINTENANCE_REQUEST",
    "MAINTENANCE_COMPLETED",
    "TRANSFER_REQUEST",
    "TRANSFER_APPROVE",
    "DEPARTMENT_HEAD_CREATED_APPEAL",
    "PROPERTY_MANAGEMENT_RESPONDED_TO_APPEAL",
  ];

  const getActionBadge = (action: string) => {
    if (action.includes("APPROVED") || action.includes("ACCEPTED") || action.includes("FULFILLED")) {
      return "bg-emerald-50 text-emerald-700 border-emerald-200";
    }
    if (action.includes("REJECTED")) {
      return "bg-rose-50 text-rose-700 border-rose-200";
    }
    if (action.includes("REQUEST")) {
      return "bg-amber-50 text-amber-700 border-amber-200";
    }
    if (action.includes("RETURN")) {
      return "bg-purple-50 text-purple-700 border-purple-200";
    }
    if (action.includes("MAINTENANCE")) {
      return "bg-orange-50 text-orange-700 border-orange-200";
    }
    if (action.includes("APPEAL")) {
      return "bg-sky-50 text-sky-700 border-sky-200";
    }
    return "bg-slate-50 text-slate-700 border-slate-200";
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between border-b border-green-100 pb-4 bg-green-950/5 -mx-3 -mt-3 sm:-mx-6 sm:-mt-6 p-4 sm:p-6 gap-2">
        <div>
          <div className="flex items-center space-x-2">
            <h2 className="text-lg sm:text-xl font-bold text-green-900">Department Activity & Staff Audit Logs</h2>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-green-100 text-green-800 border border-green-200 flex items-center">
              <ShieldCheck size={12} className="mr-1" />
              {department?.name || "My Department"}
            </span>
          </div>
          <p className="text-[11px] sm:text-xs text-green-600 font-semibold mt-0.5">
            Audit trail of asset requests, assignments, acceptances, returns, and property actions for your department
          </p>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm space-y-3">
        <form method="GET" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
          {/* Search */}
          <div className="relative">
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search keyword, code..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-green-600"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Staff Member filter */}
          <select
            name="staffId"
            defaultValue={filterStaffId}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Department Staff --</option>
            {departmentStaff.map((staff) => (
              <option key={staff.id} value={staff.id}>
                {staff.name} ({staff.role.name.replace(/_/g, " ")})
              </option>
            ))}
          </select>

          {/* Action filter */}
          <select
            name="action"
            defaultValue={filterAction}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Actions --</option>
            {actionsList.map((a) => (
              <option key={a} value={a}>{a.replace(/_/g, " ")}</option>
            ))}
          </select>

          {/* Start Date */}
          <input
            type="date"
            name="startDate"
            defaultValue={startDate}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none text-slate-600"
            title="Start Date"
          />

          {/* End Date */}
          <div className="flex space-x-2">
            <input
              type="date"
              name="endDate"
              defaultValue={endDate}
              className="w-full p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none text-slate-600"
              title="End Date"
            />
            <button
              type="submit"
              className="px-4 py-1.5 bg-green-700 hover:bg-green-800 text-white rounded-lg text-xs font-bold transition-all shrink-0"
            >
              Filter
            </button>
          </div>
        </form>

        {(searchQuery || filterAction || filterStaffId || startDate || endDate) && (
          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
            <span className="text-slate-500">Active filters applied</span>
            <Link
              href="/head/audit-logs"
              className="text-green-700 hover:underline font-semibold"
            >
              Clear all filters
            </Link>
          </div>
        )}
      </div>

      {/* Audit Logs Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5">Date & Time</th>
                <th className="py-2.5">Staff Member</th>
                <th className="py-2.5">Action</th>
                <th className="py-2.5">Target Entity / Asset</th>
                <th className="py-2.5">State Summary / Description</th>
                <th className="py-2.5 text-right">Device / IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400 font-semibold">
                    No activity logs found for your department.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const createdAtDate = new Date(log.createdAt);
                  const formattedDate = !isNaN(createdAtDate.getTime())
                    ? `${createdAtDate.toLocaleDateString()} ${createdAtDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
                    : "-";

                  return (
                    <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="py-3 text-slate-500 whitespace-nowrap text-[11px] font-mono">
                        {formattedDate}
                      </td>
                      <td className="py-3">
                        <span className="font-semibold text-slate-800 block">
                          {log.user?.name || "System"}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold uppercase block">
                          {log.user?.role?.name ? log.user.role.name.replace(/_/g, " ") : "SYSTEM"}
                        </span>
                      </td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${getActionBadge(log.action)}`}>
                          {log.action.replace(/_/g, " ")}
                        </span>
                      </td>
                      <td className="py-3">
                        {log.asset ? (
                          <div>
                            <span className="font-semibold text-slate-800 block">{log.asset.name}</span>
                            <span className="font-mono text-[9px] text-sky-700 font-bold block">{log.asset.assetCode}</span>
                          </div>
                        ) : (
                          <span className="text-slate-500 font-mono text-[11px]">{log.entityType} ({log.entityId.slice(0, 8)}...)</span>
                        )}
                      </td>
                      <td className="py-3 max-w-[240px]">
                        {log.newState ? (
                          <span className="text-[10px] text-slate-600 block truncate" title={JSON.stringify(log.newState)}>
                            {JSON.stringify(log.newState).replace(/["{}]/g, " ").slice(0, 50)}...
                          </span>
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">No state changes recorded</span>
                        )}
                      </td>
                      <td className="py-3 text-right text-slate-500 text-[11px] whitespace-nowrap">
                        <div className="flex items-center justify-end space-x-1">
                          <Globe size={11} className="text-slate-400" />
                          <span>{log.ipAddress || "Internal"}</span>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 border-t border-slate-100">
            <span className="text-xs text-slate-500">
              Showing page <span className="font-bold text-slate-700">{page}</span> of{" "}
              <span className="font-bold text-slate-700">{totalPages}</span> ({totalLogs} records)
            </span>
            <div className="flex space-x-1">
              <Link
                href={page > 1 ? `/head/audit-logs?page=${page - 1}&search=${searchQuery}&action=${filterAction}&staffId=${filterStaffId}&startDate=${startDate}&endDate=${endDate}` : "#"}
                className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page <= 1 ? "opacity-35 cursor-not-allowed" : ""}`}
              >
                <ChevronLeft size={14} />
              </Link>
              <Link
                href={page < totalPages ? `/head/audit-logs?page=${page + 1}&search=${searchQuery}&action=${filterAction}&staffId=${filterStaffId}&startDate=${startDate}&endDate=${endDate}` : "#"}
                className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page >= totalPages ? "opacity-35 cursor-not-allowed" : ""}`}
              >
                <ChevronRight size={14} />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
