"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { saveFinancialAuditAction } from "@/app/actions/financial-audit";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  AreaChart,
  Area
} from "recharts";
import {
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Plus,
  Loader2
} from "lucide-react";
import Link from "next/link";

interface FinancialStats {
  totalAssetCost: number;
  allocatedBudget: number;
  spentBudget: number;
  remainingBudget: number;
  budgetUtilizationPct: number;
  totalProcurementCost: number;
  totalMaintenanceCost: number;
  totalDepreciation: number;
  currentBookValue: number;
  totalDisposalValue: number;
}

interface DiscrepantAsset {
  id: string;
  name: string;
  assetCode: string;
  invoiceNumber?: string | null;
}

interface BudgetOverrun {
  id: string;
  departmentName: string;
  fiscalYear: string;
  total: number;
  spent: number;
  overrun: number;
}

interface DiscrepancyReport {
  missingCost: DiscrepantAsset[];
  missingSupplier: DiscrepantAsset[];
  missingInvoice: DiscrepantAsset[];
  invalidValues: DiscrepantAsset[];
  budgetOverruns: BudgetOverrun[];
  duplicateInvoices: DiscrepantAsset[];
  missingDeprData: DiscrepantAsset[];
  count: number;
}

interface MaintenanceAuditItem {
  id: string;
  name: string;
  assetCode: string;
  departmentName: string;
  procurementCost: number;
  maintenanceCost: number;
  costRatioPct: number;
  recommendReplacement: boolean;
}

interface BudgetDetail {
  id: string;
  departmentName: string;
  total: number;
  spent: number;
  variance: number;
  pct: number;
  alert: boolean;
}

interface ProcurementItem {
  id: string;
  assetCode: string;
  name: string;
  purchaseDate: string;
  procurementCost: number;
  invoiceNumber: string;
  supplierName: string;
  approved: boolean;
}

interface DepreciationItem {
  assetCode: string;
  name: string;
  cost: number;
  salvage: number;
  lifecycle: number;
  annualDepr: number;
  accumDepr: number;
  bookValue: number;
}

interface AuditHistoryItem {
  id: string;
  auditDate: Date | string;
  fiscalYear: string;
  findings: string;
  recommendations: string;
  financialStatus: string;
  totalAssetValue: unknown;
  budgetAudited: unknown;
  auditor: { name: string };
  department?: { name: string } | null;
}

interface FinancialAuditClientProps {
  stats: FinancialStats;
  discrepancies: DiscrepancyReport;
  maintenanceItems: MaintenanceAuditItem[];
  budgets: BudgetDetail[];
  procurements: ProcurementItem[];
  depreciations: DepreciationItem[];
  history: AuditHistoryItem[];
  departments: { id: string; name: string }[];
}

const COLORS = ["#0284c7", "#0ea5e9", "#38bdf8", "#7dd3fc", "#bae6fd"];

export function FinancialAuditClient({
  stats,
  discrepancies,
  maintenanceItems,
  budgets,
  procurements,
  depreciations,
  history,
  departments
}: FinancialAuditClientProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const [activeTab, setActiveTab] = useState<"dashboard" | "budget" | "procure" | "maint" | "depr" | "discrepancies" | "history">("dashboard");

  // Form states for persistent audit log
  const [fiscalYear, setFiscalYear] = useState("2026");
  const [selectedDeptId, setSelectedDeptId] = useState("");
  const [findings, setFindings] = useState("");
  const [recommendations, setRecommendations] = useState("");
  const [status, setStatus] = useState("STABLE");
  const [showLogModal, setShowLogModal] = useState(false);
  const [logError, setLogError] = useState<string | null>(null);

  const formatCurrency = (val: number) => {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(val);
  };

  const handleSaveAudit = (e: React.FormEvent) => {
    e.preventDefault();
    setLogError(null);
    if (!findings.trim() || !recommendations.trim()) return;

    startTransition(async () => {
      const res = await saveFinancialAuditAction(null, {
        fiscalYear,
        departmentId: selectedDeptId || undefined,
        findings: findings.trim(),
        recommendations: recommendations.trim(),
        status,
      });

      if (res.error) {
        setLogError(res.error);
      } else {
        setFindings("");
        setRecommendations("");
        setShowLogModal(false);
        alert("Financial audit findings recorded successfully!");
        router.refresh();
      }
    });
  };

  // Recharts chart datas compilation
  const budgetChartData = budgets.map(b => ({
    name: b.departmentName.split(" ")[0],
    "Allocated Budget": b.total,
    "Actual Spending": b.spent
  }));

  const pieChartData = budgets.map(b => ({
    name: b.departmentName.split(" ")[0],
    value: b.spent
  }));

  // Group procurement by month mock timeline
  const procurementTimelineData = [
    { name: "Jan", Cost: 12000 },
    { name: "Feb", Cost: 800 },
    { name: "Mar", Cost: 3000 },
    { name: "Apr", Cost: 1500 },
    { name: "May", Cost: 0 },
    { name: "Jun", Cost: 45000 },
    { name: "Jul", Cost: stats.totalProcurementCost > 60000 ? 1500 : 0 }
  ];

  const maintenanceTrendData = maintenanceItems.map(m => ({
    name: m.name.slice(0, 10),
    Cost: m.maintenanceCost
  })).slice(0, 5);

  const deprTrendData = depreciations.map(d => ({
    name: d.name.slice(0, 10),
    "Book Value": d.bookValue,
    "Accumulated Depr": d.accumDepr
  })).slice(0, 5);

  const deptValueData = budgets.map(b => ({
    name: b.departmentName.split(" ")[0],
    "Asset Value": b.total * 0.8 // capital holdings proxy
  }));

  const budgetUtilData = budgets.map(b => ({
    name: b.departmentName.split(" ")[0],
    "Utilization %": b.pct
  }));

  const reportsList = [
    { name: "Financial Audit Report", code: "fin_audit" },
    { name: "Budget Utilization Report", code: "fin_budget" },
    { name: "Procurement Cost Report", code: "fin_procure" },
    { name: "Depreciation Report", code: "fin_depr" },
    { name: "Maintenance Cost Report", code: "fin_maint" },
    { name: "Asset Valuation Report", code: "fin_value" },
    { name: "Organizational Unit Financial Summary", code: "fin_dept" },
  ];

  return (
    <div className="space-y-6">
      {/* Exporter & Persist Panel */}
      <div className="flex flex-wrap items-center justify-between gap-4 bg-slate-50 p-4 rounded-xl border border-slate-200">
        <div className="flex space-x-2">
          {reportsList.map((rep) => (
            <a
              key={rep.code}
              href={`/api/reports?type=${rep.code}`}
              className="px-2.5 py-1 border border-slate-200 hover:bg-slate-100 rounded text-[10px] font-bold text-slate-600 bg-white flex items-center space-x-1 transition-all"
              title={`Download CSV for ${rep.name}`}
            >
              <FileSpreadsheet size={10} />
              <span>{rep.name.split(" ")[0]} XLS</span>
            </a>
          ))}
        </div>

        <button
          onClick={() => setShowLogModal(true)}
          className="flex items-center space-x-1.5 px-3 py-1.5 bg-teal-700 hover:bg-teal-800 text-white rounded text-xs font-bold transition-all shadow-sm"
        >
          <Plus size={14} />
          <span>Record Audit Findings</span>
        </button>
      </div>

      {/* Tab select container */}
      <div className="flex border-b border-slate-200 bg-slate-50 rounded-t-xl overflow-x-auto text-xs">
        {[
          { id: "dashboard", label: "Executive Dashboard" },
          { id: "budget", label: "Budget Audit" },
          { id: "procure", label: "Procurement Audit" },
          { id: "maint", label: "Maintenance Expenses" },
          { id: "depr", label: "Depreciation books" },
          { id: "discrepancies", label: `Discrepancies (${discrepancies.count})` },
          { id: "history", label: "Audit Logs & History" },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as "dashboard" | "budget" | "procure" | "maint" | "depr" | "discrepancies" | "history")}
            className={`px-4 py-3 font-bold hover:text-teal-700 transition-colors border-b-2 shrink-0 ${
              activeTab === tab.id ? "border-teal-700 text-teal-900 bg-white" : "border-transparent text-slate-500"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab: EXECUTIVE DASHBOARD */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {/* Key Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">DBU FIXED ASSETS VALUE</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(stats.totalAssetCost)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Book Value: {formatCurrency(stats.currentBookValue)}</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">ANNUAL BUDGET LIMIT</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(stats.allocatedBudget)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Spent: {formatCurrency(stats.spentBudget)} ({stats.budgetUtilizationPct}%)</p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">REMAINING BALANCE</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(stats.remainingBudget)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Overruns: <span className="text-red-600 font-bold">{discrepancies.budgetOverruns.length} alert</span></p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
              <span className="text-[10px] text-slate-400 block font-bold uppercase">MAINTENANCE EXPENSES</span>
              <h3 className="text-lg font-bold text-slate-800 mt-1">{formatCurrency(stats.totalMaintenanceCost)}</h3>
              <p className="text-[10px] text-slate-500 mt-1">Disposal values: {formatCurrency(stats.totalDisposalValue)}</p>
            </div>
          </div>

          {/* Interactive Charts Visualizations */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: Budget vs Spending */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Budget Allocation vs Actual Spending</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetChartData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Legend />
                    <Bar dataKey="Allocated Budget" fill="#0284c7" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="Actual Spending" fill="#ef4444" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Department Spending Share */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Organizational Unit Spending Share</h5>
              <div className="h-64 flex justify-center">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={pieChartData}
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      fill="#8884d8"
                      dataKey="value"
                      label={({ name, percent }) => `${name} ${percent !== undefined ? (percent * 100).toFixed(0) : 0}%`}
                    >
                      {pieChartData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 3: Procurement Cost by Month */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Procurement Cost by Month</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={procurementTimelineData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Line type="monotone" dataKey="Cost" stroke="#0284c7" strokeWidth={2} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 4: Maintenance Spends */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Maintenance Cost Trends (Top 5 Assets)</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={maintenanceTrendData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="Cost" fill="#ea580c" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 5: Depreciation Progress Area */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Depreciation Trends (Book Value vs. Accrued Depreciation)</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={deprTrendData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Area type="monotone" dataKey="Book Value" stroke="#38bdf8" fill="#bae6fd" />
                    <Area type="monotone" dataKey="Accumulated Depr" stroke="#94a3b8" fill="#f1f5f9" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 6: Budget Utilization % */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Budget Utilization Percentage</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={budgetUtilData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="Utilization %" fill="#14b8a6" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 7: Asset Value by Department */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm">
              <h5 className="text-xs font-bold text-slate-700 uppercase mb-4">Asset Value by Organizational Unit</h5>
              <div className="h-64">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={deptValueData}>
                    <XAxis dataKey="name" stroke="#888888" fontSize={10} />
                    <YAxis stroke="#888888" fontSize={10} />
                    <Tooltip />
                    <Bar dataKey="Asset Value" fill="#0369a1" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tab: BUDGET AUDIT */}
      {activeTab === "budget" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">Organizational Unit Budget Variance Checker</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                  <th className="py-2.5 px-3">Organizational Unit</th>
                  <th className="py-2.5 px-3">Allocated Amount</th>
                  <th className="py-2.5 px-3">Actual Spending</th>
                  <th className="py-2.5 px-3">Variance</th>
                  <th className="py-2.5 px-3">Utilization</th>
                  <th className="py-2.5 px-3 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {budgets.map((b) => (
                  <tr key={b.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-bold text-slate-800">{b.departmentName}</td>
                    <td className="py-3 px-3">{formatCurrency(b.total)}</td>
                    <td className="py-3 px-3">{formatCurrency(b.spent)}</td>
                    <td className={`py-3 px-3 font-bold ${b.variance < 0 ? "text-red-600" : "text-emerald-600"}`}>
                      {formatCurrency(b.variance)}
                    </td>
                    <td className="py-3 px-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden inline-block mr-2 align-middle">
                        <div className={`h-full ${b.alert ? "bg-red-500" : "bg-teal-600"}`} style={{ width: `${Math.min(100, b.pct)}%` }} />
                      </div>
                      <span className="font-bold">{b.pct}%</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {b.alert ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200">
                          OVER BUDGET ALERT
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          UNDER BUDGET
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: PROCUREMENT AUDIT */}
      {activeTab === "procure" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase">Purchased Property Audit Ledger</h4>
            <div className="flex space-x-2">
              <Link
                href="/reports/print?type=fin_procure"
                target="_blank"
                className="flex items-center space-x-1 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600 bg-white"
              >
                <Printer size={12} />
                <span>Print Ledger</span>
              </Link>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                  <th className="py-2.5 px-3">Asset Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Invoice Code</th>
                  <th className="py-2.5 px-3">Supplier</th>
                  <th className="py-2.5 px-3">Purchase Date</th>
                  <th className="py-2.5 px-3">Price</th>
                  <th className="py-2.5 px-3 text-right">Approval</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {procurements.map((p) => {
                  const isDuplicate = procurements.filter(x => x.invoiceNumber === p.invoiceNumber && p.invoiceNumber).length > 1;
                  return (
                    <tr key={p.id} className="hover:bg-slate-50/50">
                      <td className="py-3 px-3 font-mono font-bold text-slate-700">{p.assetCode}</td>
                      <td className="py-3 px-3 font-bold text-slate-800">{p.name}</td>
                      <td className="py-3 px-3">
                        <span className={isDuplicate ? "text-amber-600 font-bold bg-amber-50 px-1 py-0.5 rounded" : ""}>
                          {p.invoiceNumber || <span className="text-red-500 italic">Missing Invoice</span>}
                        </span>
                        {isDuplicate && <span className="block text-[8px] text-amber-500 font-black uppercase">Duplicate Invoice</span>}
                      </td>
                      <td className="py-3 px-3">{p.supplierName}</td>
                      <td className="py-3 px-3">{p.purchaseDate ? new Date(p.purchaseDate).toLocaleDateString() : "-"}</td>
                      <td className="py-3 px-3 font-bold">{formatCurrency(p.procurementCost)}</td>
                      <td className="py-3 px-3 text-right">
                        {p.approved ? (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-green-50 text-green-700 border border-green-200">
                            Approved
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200 animate-pulse">
                            No Approval Flag
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: MAINTENANCE EXPENSES */}
      {activeTab === "maint" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <h4 className="text-xs font-extrabold text-slate-700 uppercase">Property Maintenance Spends & Replacement Indicators</h4>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                  <th className="py-2.5 px-3">Asset Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Organizational Unit</th>
                  <th className="py-2.5 px-3">Purchase Price</th>
                  <th className="py-2.5 px-3">Maintenance Spends</th>
                  <th className="py-2.5 px-3">Repair / Cost Ratio</th>
                  <th className="py-2.5 px-3 text-right">Replacement Indicator</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {maintenanceItems.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{m.assetCode}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{m.name}</td>
                    <td className="py-3 px-3">{m.departmentName}</td>
                    <td className="py-3 px-3">{formatCurrency(m.procurementCost)}</td>
                    <td className="py-3 px-3 font-bold text-slate-700">{formatCurrency(m.maintenanceCost)}</td>
                    <td className="py-3 px-3">
                      <div className="w-24 bg-slate-100 rounded-full h-2.5 overflow-hidden inline-block mr-2 align-middle">
                        <div className={`h-full ${m.costRatioPct > 50 ? "bg-red-500" : "bg-orange-500"}`} style={{ width: `${Math.min(100, m.costRatioPct)}%` }} />
                      </div>
                      <span className="font-bold">{m.costRatioPct}%</span>
                    </td>
                    <td className="py-3 px-3 text-right">
                      {m.recommendReplacement ? (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-red-50 text-red-700 border border-red-200 animate-pulse">
                          RECOMMEND REPLACE
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[9px] font-black uppercase bg-slate-100 text-slate-500">
                          KEEP / OK
                        </span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: DEPRECIATION BOOKS */}
      {activeTab === "depr" && (
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
          <div className="flex justify-between items-center border-b border-slate-100 pb-3">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase">Fixed Asset Depreciation Schedule (Straight-Line)</h4>
            <Link
              href="/reports/print?type=fin_depr"
              target="_blank"
              className="flex items-center space-x-1 px-2.5 py-1 border border-slate-200 hover:bg-slate-50 rounded text-[10px] font-bold text-slate-600 bg-white"
            >
              <Printer size={12} />
              <span>Print Schedule</span>
            </Link>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                  <th className="py-2.5 px-3">Asset Code</th>
                  <th className="py-2.5 px-3">Name</th>
                  <th className="py-2.5 px-3">Purchase price</th>
                  <th className="py-2.5 px-3">Salvage Value</th>
                  <th className="py-2.5 px-3">Useful Life (Yrs)</th>
                  <th className="py-2.5 px-3">Annual Depr.</th>
                  <th className="py-2.5 px-3">Accum. Depr.</th>
                  <th className="py-2.5 px-3 text-right">Net Book Value</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {depreciations.map((d, idx) => (
                  <tr key={idx} className="hover:bg-slate-50/50">
                    <td className="py-3 px-3 font-mono font-bold text-slate-700">{d.assetCode}</td>
                    <td className="py-3 px-3 font-bold text-slate-800">{d.name}</td>
                    <td className="py-3 px-3">{formatCurrency(d.cost)}</td>
                    <td className="py-3 px-3">{formatCurrency(d.salvage)}</td>
                    <td className="py-3 px-3">{d.lifecycle}</td>
                    <td className="py-3 px-3">{formatCurrency(d.annualDepr)}</td>
                    <td className="py-3 px-3 text-red-500 font-bold">{formatCurrency(d.accumDepr)}</td>
                    <td className="py-3 px-3 text-right font-black text-slate-800">{formatCurrency(d.bookValue)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Tab: DISCREPANCY BOARD */}
      {activeTab === "discrepancies" && (
        <div className="space-y-6">
          {/* Missing fields check lists */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Missing cost */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h5 className="text-xs font-bold text-red-700 uppercase flex items-center border-b border-red-50 pb-2">
                <AlertTriangle size={14} className="mr-1.5" />
                Missing Purchase Price ({discrepancies.missingCost.length})
              </h5>
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {discrepancies.missingCost.length === 0 ? (
                  <li className="text-slate-400 italic font-semibold">No missing prices flagged.</li>
                ) : (
                  discrepancies.missingCost.map((item, idx) => (
                    <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between font-mono">
                      <span>{item.name}</span>
                      <span className="font-bold text-slate-500">{item.assetCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Missing Invoices */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h5 className="text-xs font-bold text-red-700 uppercase flex items-center border-b border-red-50 pb-2">
                <AlertTriangle size={14} className="mr-1.5" />
                Missing Invoices ({discrepancies.missingInvoice.length})
              </h5>
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {discrepancies.missingInvoice.length === 0 ? (
                  <li className="text-slate-400 italic font-semibold">No missing invoices flagged.</li>
                ) : (
                  discrepancies.missingInvoice.map((item, idx) => (
                    <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between font-mono">
                      <span>{item.name}</span>
                      <span className="font-bold text-slate-500">{item.assetCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Missing Supplier info */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h5 className="text-xs font-bold text-slate-600 uppercase flex items-center border-b border-slate-100 pb-2">
                <AlertTriangle size={14} className="mr-1.5 text-amber-500" />
                Missing Supplier Info ({discrepancies.missingSupplier.length})
              </h5>
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {discrepancies.missingSupplier.length === 0 ? (
                  <li className="text-slate-400 italic font-semibold">No missing suppliers.</li>
                ) : (
                  discrepancies.missingSupplier.map((item, idx) => (
                    <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between font-mono">
                      <span>{item.name}</span>
                      <span className="font-bold text-slate-500">{item.assetCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Duplicate Invoices */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
              <h5 className="text-xs font-bold text-amber-700 uppercase flex items-center border-b border-amber-50 pb-2">
                <AlertTriangle size={14} className="mr-1.5" />
                Duplicate Procurement Invoices ({discrepancies.duplicateInvoices.length})
              </h5>
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {discrepancies.duplicateInvoices.length === 0 ? (
                  <li className="text-slate-400 italic font-semibold">No duplicates.</li>
                ) : (
                  discrepancies.duplicateInvoices.map((item, idx) => (
                    <li key={idx} className="p-2 bg-slate-50 rounded border border-slate-100 flex justify-between font-mono">
                      <span>Invoice: <span className="font-bold text-amber-600">{item.invoiceNumber}</span></span>
                      <span>Code: {item.assetCode}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>

            {/* Budget Overruns */}
            <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3 md:col-span-2">
              <h5 className="text-xs font-bold text-red-700 uppercase flex items-center border-b border-red-50 pb-2">
                <AlertTriangle size={14} className="mr-1.5" />
                Active Departmental Budget Overruns ({discrepancies.budgetOverruns.length})
              </h5>
              <ul className="text-xs space-y-1.5 max-h-48 overflow-y-auto">
                {discrepancies.budgetOverruns.length === 0 ? (
                  <li className="text-slate-400 italic font-semibold">No budget overruns detected.</li>
                ) : (
                  discrepancies.budgetOverruns.map((b, idx) => (
                    <li key={idx} className="p-3 bg-red-50/50 border border-red-100 rounded flex justify-between items-center font-semibold">
                      <div>
                        <span className="text-slate-800 block">{b.departmentName} ({b.fiscalYear})</span>
                        <span className="text-[10px] text-slate-400">Budget: {formatCurrency(b.total)} | Spent: {formatCurrency(b.spent)}</span>
                      </div>
                      <span className="text-red-700 font-extrabold block">Over: {formatCurrency(b.overrun)}</span>
                    </li>
                  ))
                )}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Tab: AUDIT HISTORY */}
      {activeTab === "history" && (
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
            <h4 className="text-xs font-extrabold text-slate-700 uppercase">Recorded DBU Financial Audit Logs</h4>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase bg-slate-50/50">
                    <th className="py-2.5 px-3">Audit Date</th>
                    <th className="py-2.5 px-3">Auditor</th>
                    <th className="py-2.5 px-3">Year / Scope</th>
                    <th className="py-2.5 px-3">Asset Value</th>
                    <th className="py-2.5 px-3">Audited Spends</th>
                    <th className="py-2.5 px-3">Findings Summary</th>
                    <th className="py-2.5 px-3 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {history.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-6 text-center text-slate-400 italic font-semibold">
                        No financial audits recorded yet.
                      </td>
                    </tr>
                  ) : (
                    history.map((h) => (
                      <tr key={h.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3">{new Date(h.auditDate).toLocaleDateString()}</td>
                        <td className="py-3 px-3 font-bold text-slate-800">{h.auditor.name}</td>
                        <td className="py-3 px-3 uppercase text-[10px] font-bold text-slate-500">
                          {h.fiscalYear} {h.department ? `(${h.department.name})` : "(University)"}
                        </td>
                        <td className="py-3 px-3">{formatCurrency(Number(h.totalAssetValue))}</td>
                        <td className="py-3 px-3">{formatCurrency(Number(h.budgetAudited))}</td>
                        <td className="py-3 px-3 max-w-[200px] truncate" title={h.findings}>
                          <span className="block truncate">{h.findings}</span>
                          <span className="block text-[10px] text-slate-400 truncate italic">Rec: {h.recommendations}</span>
                        </td>
                        <td className="py-3 px-3 text-right">
                          <span className={`px-2 py-0.5 rounded text-[9px] font-black uppercase border ${
                            h.financialStatus === "STABLE" ? "bg-green-50 text-green-700 border-green-200" :
                            h.financialStatus === "OVER_BUDGET" ? "bg-amber-50 text-amber-700 border-amber-200" :
                            "bg-red-50 text-red-700 border-red-200"
                          }`}>
                            {h.financialStatus}
                          </span>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* Modal: Write Audit Log */}
      {showLogModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm">
          <div className="bg-white rounded-2xl w-full max-w-md p-6 border border-slate-200 shadow-2xl relative">
            <h3 className="text-sm font-bold text-slate-800 uppercase mb-4">Record Financial Audit Findings</h3>

            {logError && <div className="mb-4 p-2.5 bg-red-50 border-l-4 border-red-500 rounded text-xs text-red-700 font-semibold">{logError}</div>}

            <form onSubmit={handleSaveAudit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Fiscal Year</label>
                  <input
                    type="text"
                    required
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs font-bold"
                    value={fiscalYear}
                    onChange={(e) => setFiscalYear(e.target.value)}
                  />
                </div>

                <div>
                  <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Audit Status</label>
                  <select
                    className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                    value={status}
                    onChange={(e) => setStatus(e.target.value)}
                  >
                    <option value="STABLE">STABLE</option>
                    <option value="OVER_BUDGET">OVER BUDGET</option>
                    <option value="CRITICAL_DISCREPANCY">CRITICAL DISCREPANCY</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Scope Organizational Unit (Optional)</label>
                <select
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs focus:outline-none"
                  value={selectedDeptId}
                  onChange={(e) => setSelectedDeptId(e.target.value)}
                >
                  <option value="">-- University Wide --</option>
                  {departments.map((d) => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Findings Notes</label>
                <textarea
                  required
                  placeholder="Summarize missing invoices, overruns, duplicates, etc."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs h-20 resize-none focus:outline-none"
                  value={findings}
                  onChange={(e) => setFindings(e.target.value)}
                />
              </div>

              <div>
                <label className="block text-[9px] font-bold text-slate-500 uppercase mb-1">Audit Recommendations</label>
                <textarea
                  required
                  placeholder="e.g. Purchase freeze on technology department, re-align budgets."
                  className="w-full p-2 bg-slate-50 border border-slate-200 rounded text-xs h-20 resize-none focus:outline-none"
                  value={recommendations}
                  onChange={(e) => setRecommendations(e.target.value)}
                />
              </div>

              <div className="flex justify-end space-x-2 pt-2 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowLogModal(false)}
                  className="px-4 py-2 border border-slate-200 rounded-lg text-xs text-slate-500 font-bold hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white rounded-lg text-xs font-bold flex items-center"
                >
                  {isPending && <Loader2 size={12} className="animate-spin mr-1.5" />}
                  Save Findings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
