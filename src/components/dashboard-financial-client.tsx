"use client";

import React, { useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line
} from "recharts";
import Link from "next/link";
import {
  DollarSign,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Package,
  Wrench,
  Activity,
  Layers,
  Calendar,
  Clock,
  ShieldAlert,
  ArrowUpRight,
  CheckCircle2,
  FileText,
  Building2,
  Users
} from "lucide-react";

interface DashboardFinancialClientProps {
  stats: {
    totalAssetValue: number;
    currentBookValue: number;
    totalDepreciation: number;
    totalMaintenanceCost: number;
    totalAssetInvestment: number;
    warrantyExpiringCount: number;
    expiredAssetsCount: number;
    endOfLifeCount: number;
    totalAssetsCount: number;
    activeAssetsCount: number;
    assignedAssetsCount: number;
    pendingRequestsCount: number;
    maintenanceCount: number;
    totalUsers: number;
    totalDepartments: number;
  };
  deptChartData: { name: string; value: number }[];
  catChartData: { name: string; value: number }[];
  fundingChartData: { name: string; value: number }[];
  maintChartData: { name: string; value: number }[];
  purchaseChartData: { name: string; value: number }[];
  depreciationTrendData: { name: string; bookValue: number; accumulatedDepreciation: number }[];
}

const COLORS = ["#0284c7", "#10b981", "#6366f1", "#f59e0b", "#ec4899", "#8b5cf6"];

export function DashboardFinancialClient({
  stats,
  deptChartData,
  catChartData,
  fundingChartData,
  maintChartData,
  purchaseChartData,
  depreciationTrendData
}: DashboardFinancialClientProps) {
  const [isPending, startTransition] = useTransition();

  const reports = [
    { name: "Asset Financial Report", type: "fin_asset" },
    { name: "Depreciation Report", type: "fin_depr" },
    { name: "Maintenance Cost Report", type: "fin_maint" },
    { name: "Funding Source Report", type: "fin_funding" },
    { name: "Warranty Report", type: "fin_warranty" },
    { name: "Asset Value by Department", type: "fin_dept_val" },
    { name: "Asset Value by Category", type: "fin_cat_val" }
  ];

  const handleDownloadReport = (reportType: string) => {
    startTransition(async () => {
      try {
        const res = await fetch(`/api/reports?type=${reportType}`);
        if (!res.ok) throw new Error("Failed to export report");
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = `DBU_Financial_Report_${reportType}_${new Date().toISOString().split("T")[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      } catch (err) {
        console.error(err);
        alert("Failed to export report.");
      }
    });
  };

  const handlePrint = (reportType: string) => {
    window.open(`/reports/print?type=${reportType}`, "_blank");
  };

  return (
    <div className="space-y-6">
      {/* Operational Quick Navigation Cards Grid (9 Clickable Cards) */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
            <Package size={14} className="text-sky-700" />
            Asset Portfolio & Operations Overview
          </h3>
          <span className="text-[10px] text-slate-400 font-semibold">Click any card to open detailed view</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-3 xl:grid-cols-3 gap-3.5">
          {/* Card 1: Total Assets */}
          <Link
            href="/pao/assets"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-sky-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Assets</span>
              <div className="flex items-center gap-1">
                <Package size={16} className="text-sky-700" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-sky-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 group-hover:text-sky-700 transition-colors">
                {stats.totalAssetsCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">All registered university items</p>
            </div>
          </Link>

          {/* Card 2: Active Assets */}
          <Link
            href="/pao/assets?status=ACTIVE"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-emerald-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Active Assets</span>
              <div className="flex items-center gap-1">
                <CheckCircle2 size={16} className="text-emerald-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-emerald-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-emerald-700">
                {stats.activeAssetsCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">In storage or operational condition</p>
            </div>
          </Link>

          {/* Card 3: Expired Warranty Assets */}
          <Link
            href="/admin/assets/expired"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-rose-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Expired Assets</span>
              <div className="flex items-center gap-1">
                <ShieldAlert size={16} className="text-rose-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-rose-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-black ${stats.expiredAssetsCount > 0 ? "text-rose-700" : "text-slate-800"}`}>
                {stats.expiredAssetsCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Warranty lapsed & expired</p>
            </div>
          </Link>

          {/* Card 4: Near Warranty Expiry */}
          <Link
            href="/admin/assets/near-warranty-expiry"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Near Warranty Expiry</span>
              <div className="flex items-center gap-1">
                <Clock size={16} className="text-amber-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-black ${stats.warrantyExpiringCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {stats.warrantyExpiringCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Expiring within the next 30 days</p>
            </div>
          </Link>

          {/* Card 5: Useful Life Exceeded */}
          <Link
            href="/admin/assets/useful-life-exceeded"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-indigo-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Useful Life Exceeded</span>
              <div className="flex items-center gap-1">
                <AlertTriangle size={16} className="text-indigo-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-indigo-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-black ${stats.endOfLifeCount > 0 ? "text-indigo-700" : "text-slate-800"}`}>
                {stats.endOfLifeCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Accounting age exceeds useful life</p>
            </div>
          </Link>

          {/* Card 6: Pending Requests */}
          <Link
            href="/pao/asset-requests"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-blue-400 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Pending Requests</span>
              <div className="flex items-center gap-1">
                <FileText size={16} className="text-blue-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-blue-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-black ${stats.pendingRequestsCount > 0 ? "text-blue-700" : "text-slate-800"}`}>
                {stats.pendingRequestsCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Department requests awaiting action</p>
            </div>
          </Link>

          {/* Card 7: Active Maintenance */}
          <Link
            href="/tech/maintenance"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-amber-500 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Maintenance</span>
              <div className="flex items-center gap-1">
                <Wrench size={16} className="text-amber-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-amber-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className={`text-xl font-black ${stats.maintenanceCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
                {stats.maintenanceCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Active or reported repair tasks</p>
            </div>
          </Link>

          {/* Card 8: Assigned Assets */}
          <Link
            href="/pao/assignments"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-sky-500 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Assigned Assets</span>
              <div className="flex items-center gap-1">
                <Users size={16} className="text-sky-700" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-sky-700 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 group-hover:text-sky-700 transition-colors">
                {stats.assignedAssetsCount.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Assigned to university staff</p>
            </div>
          </Link>

          {/* Card 9: Departments */}
          <Link
            href="/admin/departments"
            className="group bg-white p-4 rounded-xl border border-slate-200 hover:border-teal-500 hover:shadow-md hover:-translate-y-0.5 transition-all space-y-2 block relative overflow-hidden"
          >
            <div className="flex justify-between items-center">
              <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Departments</span>
              <div className="flex items-center gap-1">
                <Building2 size={16} className="text-teal-600" />
                <ArrowUpRight size={13} className="text-slate-300 group-hover:text-teal-600 transition-colors" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-black text-slate-800 group-hover:text-teal-700 transition-colors">
                {stats.totalDepartments.toLocaleString()}
              </h3>
              <p className="text-[10px] text-slate-400 font-medium mt-0.5">Faculties and academic units</p>
            </div>
          </Link>
        </div>
      </div>

      {/* Financial Valuation Summary Section */}
      <div className="space-y-3 pt-2">
        <h3 className="text-xs font-black text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
          <DollarSign size={14} className="text-emerald-700" />
          University Capital Valuation & Financial Summary
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 sm:gap-4">
          {/* Total Asset Value */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Value</span>
            <h3 className="text-base font-black text-slate-800">{stats.totalAssetValue.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-medium">Acquisition cost of all items</p>
          </div>

          {/* Current Book Value */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Book Value</span>
            <h3 className="text-base font-black text-emerald-700">{stats.currentBookValue.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-medium">After straight-line depreciation</p>
          </div>

          {/* Total Depreciation */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Depreciation</span>
            <h3 className="text-base font-black text-indigo-700">{stats.totalDepreciation.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-medium">Cumulative book depreciation</p>
          </div>

          {/* Total Maintenance Cost */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Repairs Cost</span>
            <h3 className="text-base font-black text-amber-700">{stats.totalMaintenanceCost.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-medium">Sum of all completed repairs</p>
          </div>

          {/* Total Asset Investment */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-1.5">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Invested</span>
            <h3 className="text-base font-black text-violet-700">{stats.totalAssetInvestment.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-medium">Acquisition + Repairs combined</p>
          </div>
        </div>
      </div>

      {/* 6 Charts Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Chart 1: Asset Value by Department */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <Layers size={14} className="mr-1.5 text-sky-700" /> Asset Value by Department (ETB)
          </h4>
          <div className="h-64 w-full">
            {deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={deptChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Asset Value"]} />
                  <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No department asset values logged yet.</div>
            )}
          </div>
        </div>

        {/* Chart 2: Asset Value by Category */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <Layers size={14} className="mr-1.5 text-emerald-700" /> Asset Value by Category (ETB)
          </h4>
          <div className="h-64 w-full">
            {catChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={catChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Asset Value"]} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No category asset values logged yet.</div>
            )}
          </div>
        </div>

        {/* Chart 3: Funding Source Distribution */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <DollarSign size={14} className="mr-1.5 text-indigo-700" /> Funding Source Distribution
          </h4>
          <div className="h-64 w-full flex items-center justify-center">
            {fundingChartData.length > 0 ? (
              <div className="w-full h-full flex flex-col md:flex-row items-center justify-around">
                <div className="w-48 h-48">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={fundingChartData}
                        cx="50%"
                        cy="50%"
                        innerRadius={50}
                        outerRadius={70}
                        paddingAngle={4}
                        dataKey="value"
                      >
                        {fundingChartData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Total Capital"]} />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
                <div className="flex flex-col space-y-1.5 max-h-full overflow-y-auto">
                  {fundingChartData.map((entry, index) => (
                    <div key={entry.name} className="flex items-center space-x-2 text-[10px]">
                      <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                      <span className="font-bold text-slate-600 uppercase">{entry.name}</span>
                      <span className="text-slate-450">({Number(entry.value).toLocaleString()} ETB)</span>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-xs text-slate-400">No assets funding sources logged yet.</div>
            )}
          </div>
        </div>

        {/* Chart 4: Depreciation Trend */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <Activity size={14} className="mr-1.5 text-violet-700" /> Depreciation Trend over Purchase Years
          </h4>
          <div className="h-64 w-full">
            {depreciationTrendData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={depreciationTrendData} margin={{ top: 10, right: 15, left: -25, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`]} />
                  <Legend wrapperStyle={{ fontSize: 9, fontWeight: "bold" }} />
                  <Line type="monotone" dataKey="bookValue" name="Net Book Value" stroke="#10b981" strokeWidth={2.5} activeDot={{ r: 6 }} />
                  <Line type="monotone" dataKey="accumulatedDepreciation" name="Accumulated Depreciation" stroke="#6366f1" strokeWidth={2.5} />
                </LineChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No assets purchase depreciation schedules available.</div>
            )}
          </div>
        </div>

        {/* Chart 5: Annual Asset Purchases */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <Calendar size={14} className="mr-1.5 text-blue-700" /> Annual Asset Acquisitions (ETB)
          </h4>
          <div className="h-64 w-full">
            {purchaseChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={purchaseChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Acquired Value"]} />
                  <Bar dataKey="value" fill="#0284c7" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No asset purchases logged yet.</div>
            )}
          </div>
        </div>

        {/* Chart 6: Annual Maintenance Cost */}
        <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <h4 className="text-xs font-bold text-slate-800 flex items-center">
            <Clock size={14} className="mr-1.5 text-amber-700" /> Annual Maintenance Expenditures (ETB)
          </h4>
          <div className="h-64 w-full">
            {maintChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={maintChartData} margin={{ top: 10, right: 10, left: -20, bottom: 10 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                  <XAxis dataKey="name" stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <YAxis stroke="#94a3b8" fontSize={9} fontStyle="bold" />
                  <Tooltip formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Maintenance Spend"]} />
                  <Bar dataKey="value" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-slate-400">No completed repairs expenditures registered yet.</div>
            )}
          </div>
        </div>

      </div>

      {/* Reports & Exporters Center */}
      <div className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <h3 className="text-xs font-black text-slate-850 uppercase tracking-widest pb-1 border-b border-slate-100 flex items-center">
          <FileSpreadsheet size={14} className="mr-1.5 text-sky-700" /> Reports & Exporters Center
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 text-xs font-bold">
          {reports.map((r) => (
            <div key={r.type} className="flex justify-between items-center p-3.5 bg-slate-50 border border-slate-150 rounded-xl hover:border-slate-300 transition-colors">
              <span className="text-slate-700 uppercase text-[10px] tracking-wide">{r.name}</span>
              <div className="flex items-center space-x-1">
                <button
                  onClick={() => handleDownloadReport(r.type)}
                  disabled={isPending}
                  className="p-2 text-sky-700 hover:bg-sky-50 rounded bg-white border border-slate-200/60 shadow-sm transition-all"
                  title="Export to CSV Spreadsheet"
                >
                  <FileSpreadsheet size={13} />
                </button>
                <button
                  onClick={() => handlePrint(r.type)}
                  className="p-2 text-slate-600 hover:bg-slate-150 rounded bg-white border border-slate-200/60 shadow-sm transition-all"
                  title="View PDF / Print"
                >
                  <Printer size={13} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
