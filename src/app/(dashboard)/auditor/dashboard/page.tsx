import React from "react";
import { prisma } from "@/lib/db";
import { Search, History, ChevronLeft, ChevronRight, Globe, Laptop, Landmark, ClipboardList } from "lucide-react";
import { Prisma } from "@prisma/client";
import { AuditManagementClient } from "@/components/audit-management-client";
import { FinancialAuditClient } from "@/components/financial-audit-client";
import {
  getFinancialAuditDashboard,
  getFinancialDiscrepancies,
  getMaintenanceCostAudit,
  getFinancialAuditHistory
} from "@/app/actions/financial-audit";
import { calculateDepreciation } from "@/services/valuation";
import Link from "next/link";

export const revalidate = 0;

interface AuditorDashboardProps {
  searchParams: {
    search?: string;
    action?: string;
    page?: string;
    tab?: string;
  };
}

export default async function AuditorDashboardPage({ searchParams }: AuditorDashboardProps) {
  const tab = searchParams.tab || "physical";
  const page = Number(searchParams.page) || 1;
  const limit = 10;
  const skip = (page - 1) * limit;

  const searchQuery = searchParams.search || "";
  const filterAction = searchParams.action || "";

  // 1. Build where clause for logs
  const where: Prisma.AuditLogWhereInput = {};
  if (filterAction) {
    where.action = filterAction;
  }
  if (searchQuery) {
    where.OR = [
      { action: { contains: searchQuery, mode: "insensitive" } },
      { entityType: { contains: searchQuery, mode: "insensitive" } },
      { user: { name: { contains: searchQuery, mode: "insensitive" } } },
      { asset: { name: { contains: searchQuery, mode: "insensitive" } } },
      { asset: { assetCode: { contains: searchQuery, mode: "insensitive" } } },
    ];
  }

  // 2. Fetch stats & data
  const startOfMonth = new Date();
  startOfMonth.setDate(1);
  startOfMonth.setHours(0, 0, 0, 0);

  const [
    totalEvents,
    disposalsThisMonth,
    transfersThisMonth,
    logs,
    totalLogs,
    rawSessions,
    finStats,
    finDiscrepancies,
    maintCosts,
    rawAssets,
    rawHistory,
    deptsList
  ] = await Promise.all([
    prisma.auditLog.count(),
    prisma.disposal.count({ where: { disposalDate: { gte: startOfMonth } } }),
    prisma.transfer.count({ where: { status: "APPROVED", updatedAt: { gte: startOfMonth } } }),
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
    prisma.auditSession.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        auditor: { select: { name: true } },
        items: {
          include: {
            asset: {
              select: {
                name: true,
                assetCode: true,
                serialNumber: true,
                status: true,
              }
            }
          },
          orderBy: { asset: { name: "asc" } }
        }
      }
    }),
    getFinancialAuditDashboard(),
    getFinancialDiscrepancies(),
    getMaintenanceCostAudit(),
    prisma.asset.findMany({ where: { deletedAt: null }, include: { supplier: true } }),
    getFinancialAuditHistory(),
    prisma.organizationalUnit.findMany({ select: { id: true, name: true } })
  ]);

  const totalPages = Math.ceil(totalLogs / limit);
  const actionsList = [
    "CREATE", "UPDATE", "DELETE", "ASSIGN", "RETURN", 
    "TRANSFER_REQUEST", "TRANSFER_APPROVE", "TRANSFER_REJECT", 
    "MAINTENANCE_REQUEST", "MAINTENANCE_IN_PROGRESS", "MAINTENANCE_COMPLETED", "DISPOSE",
    "AUDIT_START", "AUDIT_SCAN", "AUDIT_COMPLETE", "AUDIT_MISSING", "AUDIT_DISCREPANCY"
  ];

  // Map Physical Sessions safely for client serialization
  const sessions = rawSessions.map((session) => ({
    id: session.id,
    title: session.title,
    status: session.status,
    startDate: session.startDate,
    endDate: session.endDate,
    auditor: { name: session.auditor.name },
    items: session.items.map((item) => ({
      id: item.id,
      status: item.status,
      physicalCondition: item.physicalCondition,
      scannedAt: item.scannedAt,
      notes: item.notes,
      asset: {
        name: item.asset.name,
        assetCode: item.asset.assetCode,
        serialNumber: item.asset.serialNumber,
        status: item.asset.status,
      }
    }))
  }));

  // Map Budget Details (Removed/Mocked)
  const budgets: {
    id: string;
    departmentName: string;
    total: number;
    spent: number;
    variance: number;
    pct: number;
    alert: boolean;
  }[] = [];

  // Map Procurements
  const procurements = rawAssets.map((a) => ({
    id: a.id,
    assetCode: a.assetCode,
    name: a.name,
    purchaseDate: a.purchaseDate ? a.purchaseDate.toISOString() : "",
    procurementCost: a.procurementCost ? Number(a.procurementCost) : 0,
    invoiceNumber: a.invoiceNumber || "",
    supplierName: a.supplier?.name || "Direct / Internal",
    approved: a.purchaseApproved
  }));

  // Map Depreciations
  const depreciations = rawAssets.map((a) => {
    const cost = a.procurementCost ? Number(a.procurementCost) : 0;
    const salvage = a.salvageValue ? Number(a.salvageValue) : 0;
    const lifecycle = a.expectedLifecycleYears || 5;
    const deprVal = calculateDepreciation(cost, a.purchaseDate, lifecycle, salvage);
    const annual = (cost - salvage) / lifecycle;
    return {
      assetCode: a.assetCode,
      name: a.name,
      cost,
      salvage,
      lifecycle,
      annualDepr: Number(annual.toFixed(2)),
      accumDepr: deprVal.totalDepreciation,
      bookValue: deprVal.currentValue
    };
  });

  // Map Audit History log
  const history = rawHistory.map((h) => ({
    id: h.id,
    auditDate: h.auditDate.toISOString(),
    fiscalYear: h.fiscalYear,
    findings: h.findings,
    recommendations: h.recommendations,
    financialStatus: h.financialStatus,
    totalAssetValue: Number(h.totalAssetValue),
    budgetAudited: Number(h.budgetAudited),
    auditor: { name: h.auditor.name },
    department: h.department ? { name: h.department.name } : null
  }));

  return (
    <div className="space-y-6">
      {/* Header section matching mockup color */}
      <div className="flex items-center justify-between border-b border-teal-100 pb-4 bg-teal-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-teal-900">INTERNAL AUDITOR CONSOLE</h2>
          <p className="text-xs text-teal-600 font-semibold mt-1">Audit Trail Examiner & Compliance Board</p>
        </div>
      </div>

      {/* Main Tab Switcher */}
      <div className="flex space-x-2 border-b border-slate-200">
        <Link
          href="/auditor/dashboard?tab=physical"
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            tab !== "financial" ? "border-teal-700 text-teal-950" : "border-transparent text-slate-400"
          }`}
        >
          <ClipboardList size={14} />
          <span>Physical Inventory Audits</span>
        </Link>
        <Link
          href="/auditor/dashboard?tab=financial"
          className={`flex items-center space-x-1.5 px-4 py-2 text-xs font-bold border-b-2 transition-all ${
            tab === "financial" ? "border-teal-700 text-teal-950" : "border-transparent text-slate-400"
          }`}
        >
          <Landmark size={14} />
          <span>Financial & Budget Audits</span>
        </Link>
      </div>

      {tab === "financial" ? (
        /* Financial Audit Section */
        <FinancialAuditClient
          stats={finStats}
          discrepancies={finDiscrepancies}
          maintenanceItems={maintCosts}
          budgets={budgets}
          procurements={procurements}
          depreciations={depreciations}
          history={history}
          departments={deptsList}
        />
      ) : (
        /* Physical Audit & Event Logs Section */
        <div className="space-y-6">
          {/* Grid of stats cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Total Audit Events */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
              <div className="p-3 bg-teal-50 text-teal-700 rounded-lg"><History size={20} /></div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase">Total Audit Events</p>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">{totalEvents}</h3>
              </div>
            </div>

            {/* Disposals This Month */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
              <div className="p-3 bg-red-50 text-red-600 rounded-lg"><History size={20} /></div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase">Disposals This Month</p>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">{disposalsThisMonth}</h3>
              </div>
            </div>

            {/* Transfers Approved This Month */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-slate-100 flex items-center space-x-4">
              <div className="p-3 bg-sky-50 text-sky-600 rounded-lg"><History size={20} /></div>
              <div>
                <p className="text-[10px] font-extrabold text-slate-400 uppercase">Transfers Approved</p>
                <h3 className="text-lg font-bold text-slate-800 mt-0.5">{transfersThisMonth}</h3>
              </div>
            </div>
          </div>

          {/* 12. Physical Audit Session Control Center */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase tracking-wider pb-2 border-b border-slate-100">
              Physical Inventory Verification Board
            </h4>
            <AuditManagementClient sessions={sessions} />
          </div>

          {/* Audit Log Stream Card */}
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pb-3 border-b border-slate-100">
              <h4 className="text-xs font-extrabold text-slate-700 uppercase">Audit Log Stream & Security Logs</h4>
              
              {/* Filters Form */}
              <form method="GET" className="flex flex-wrap items-center gap-2">
                {/* Search Input */}
                <div className="relative">
                  <input
                    type="text"
                    name="search"
                    defaultValue={searchQuery}
                    placeholder="Search logs..."
                    className="pl-8 pr-3 py-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none focus:ring-1 focus:ring-teal-600 w-44"
                  />
                  <Search size={12} className="absolute left-2.5 top-2 text-slate-400" />
                </div>

                {/* Action Select */}
                <select
                  name="action"
                  defaultValue={filterAction}
                  className="p-1 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                >
                  <option value="">-- All Actions --</option>
                  {actionsList.map((action) => (
                    <option key={action} value={action}>{action}</option>
                  ))}
                </select>

                <button
                  type="submit"
                  className="px-3 py-1 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold transition-all"
                >
                  Filter
                </button>
                {(searchQuery || filterAction) && (
                  <a
                    href="/auditor/dashboard"
                    className="px-2.5 py-1 border border-slate-200 text-slate-500 rounded text-xs font-bold hover:bg-slate-50"
                  >
                    Clear
                  </a>
                )}
              </form>
            </div>

            {/* Logs Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                    <th className="py-2.5">User / Role</th>
                    <th className="py-2.5">Action & Entity</th>
                    <th className="py-2.5">IP Address</th>
                    <th className="py-2.5">Device Information</th>
                    <th className="py-2.5">Timestamp</th>
                    <th className="py-2.5 text-right">State Snap</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 text-xs">
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                        No matching audit records found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="py-3">
                          <span className="font-semibold text-slate-800">{log.user?.name || "System"}</span>
                          <span className="block text-[10px] text-slate-400 font-bold uppercase">{log.user?.role?.name.replace(/_/g, " ") || "SYSTEM"}</span>
                        </td>
                        <td className="py-3">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-bold border ${
                            log.action.includes("CREATE") ? "bg-green-50 text-green-700 border-green-100" :
                            log.action.includes("DELETE") ? "bg-red-50 text-red-700 border-red-100" :
                            log.action.includes("TRANSFER") ? "bg-yellow-50 text-yellow-700 border-yellow-100" : "bg-sky-50 text-sky-700 border-sky-100"
                          }`}>
                            {log.action}
                          </span>
                          <span className="block text-[10px] text-slate-500 font-semibold mt-1">
                            {log.entityType} {log.asset && `(${log.asset.assetCode})`}
                          </span>
                        </td>
                        <td className="py-3 text-slate-600 font-semibold">
                          <div className="flex items-center space-x-1">
                            <Globe size={12} className="text-slate-400" />
                            <span>{log.ipAddress || "127.0.0.1"}</span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-500 max-w-[150px] truncate">
                          <div className="flex items-center space-x-1" title={log.userAgent || "NextJS Server Engine"}>
                            <Laptop size={12} className="text-slate-400 shrink-0" />
                            <span className="truncate">{log.userAgent || "Server-Side Engine"}</span>
                          </div>
                        </td>
                        <td className="py-3 text-slate-400">
                          {new Date(log.createdAt).toLocaleDateString()} at{" "}
                          {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="py-3 text-right">
                          <span className="text-[10px] text-slate-500 font-mono" title={log.newState ? JSON.stringify(log.newState) : ""}>
                            {log.newState ? JSON.stringify(log.newState).slice(0, 20) + "..." : "N/A"}
                          </span>
                        </td>
                      </tr>
                    ))
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
                  <a
                    href={page > 1 ? `/auditor/dashboard?page=${page - 1}&search=${searchQuery}&action=${filterAction}&tab=${tab}` : "#"}
                    className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page <= 1 ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    <ChevronLeft size={14} />
                  </a>
                  <a
                    href={page < totalPages ? `/auditor/dashboard?page=${page + 1}&search=${searchQuery}&action=${filterAction}&tab=${tab}` : "#"}
                    className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page >= totalPages ? "opacity-35 cursor-not-allowed" : ""}`}
                  >
                    <ChevronRight size={14} />
                  </a>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
