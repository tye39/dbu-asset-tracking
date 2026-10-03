"use client";

import React, { useTransition } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Wrench,
  Clock,
  Landmark,
  Banknote,
  Percent,
  Layers,
  Tags,
  Building2,
} from "lucide-react";

interface DashboardFinancialClientProps {
  stats: {
    totalAssetValue: number;
    currentBookValue: number;
    totalDepreciation: number;
    totalSalvageValue?: number;
    totalMaintenanceCost: number;
    totalAssetInvestment: number;
    financiallyValuedCount?: number;
    warrantyExpiringCount: number;
    expiredAssetsCount?: number;
    endOfLifeCount: number;
    totalAssetsCount?: number;
    activeAssetsCount?: number;
    assignedAssetsCount?: number;
    pendingRequestsCount?: number;
    maintenanceCount?: number;
    totalUsers?: number;
    totalDepartments?: number;
  };
  deptChartData: { name: string; value: number }[];
  catChartData: { name: string; value: number }[];
  fundingChartData?: { name: string; value: number }[];
  maintChartData?: { name: string; value: number }[];
  purchaseChartData?: { name: string; value: number }[];
  depreciationTrendData?: { name: string; bookValue: number; accumulatedDepreciation: number }[];
}

export function DashboardFinancialClient({
  stats,
  deptChartData,
  catChartData,
}: DashboardFinancialClientProps) {
  const [isPending, startTransition] = useTransition();

  const reports = [
    { name: "Asset Financial Report", type: "fin_asset" },
    { name: "Depreciation Report", type: "fin_depr" },
    { name: "Maintenance Cost Report", type: "fin_maint" },
    { name: "Funding Source Report", type: "fin_funding" },
    { name: "Warranty Report", type: "fin_warranty" },
    { name: "Asset Value by Department", type: "fin_dept_val" },
    { name: "Asset Value by Category", type: "fin_cat_val" },
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

  // Safe number formatters
  const formatCurrency = (val: number | undefined | null) => {
    return `${(val ?? 0).toLocaleString()} ETB`;
  };

  const formatCount = (val: number | undefined | null) => {
    return `${(val ?? 0).toLocaleString()} Assets`;
  };

  const truncateLabel = (label: string, maxLen = 14) => {
    if (!label) return "";
    return label.length > maxLen ? `${label.substring(0, maxLen)}...` : label;
  };

  const formatYAxisTick = (val: number | string) => {
    const num = Number(val);
    if (isNaN(num)) return String(val);
    if (num >= 1_000_000) return `${(num / 1_000_000).toFixed(1)}M`;
    if (num >= 1_000) return `${(num / 1_000).toFixed(0)}k`;
    return String(num);
  };

  return (
    <div className="space-y-5">
      {/* =========================================================================
          ROW 1: 4 FINANCIAL SUMMARY CARDS (DISPLAY-ONLY)
          1. TOTAL ASSET VALUE
          2. CURRENT BOOK VALUE
          3. TOTAL DEPRECIATION
          4. TOTAL MAINTENANCE COST
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* CARD 1: TOTAL ASSET VALUE */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL ASSET VALUE
            </span>
            <div className="p-1.5 rounded-lg bg-sky-50 text-sky-700">
              <Landmark size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-slate-800">
              {formatCurrency(stats.totalAssetValue)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Acquisition value of all assets
            </p>
          </div>
        </div>

        {/* CARD 2: CURRENT BOOK VALUE */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              CURRENT BOOK VALUE
            </span>
            <div className="p-1.5 rounded-lg bg-emerald-50 text-emerald-700">
              <Banknote size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-emerald-700">
              {formatCurrency(stats.currentBookValue)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Value after straight-line depreciation
            </p>
          </div>
        </div>

        {/* CARD 3: TOTAL DEPRECIATION */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL DEPRECIATION
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <Percent size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-indigo-700">
              {formatCurrency(stats.totalDepreciation)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Cumulative accumulated depreciation
            </p>
          </div>
        </div>

        {/* CARD 4: TOTAL MAINTENANCE COST */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL MAINTENANCE COST
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Wrench size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-amber-700">
              {formatCurrency(stats.totalMaintenanceCost)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Service and parts maintenance total
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          ROW 2: 3 CARDS (DISPLAY-ONLY)
          5. TOTAL ASSET INVESTMENT
          6. NEAR WARRANTY EXPIRY
          7. USEFUL LIFE EXCEEDED
          ========================================================================= */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
        {/* CARD 5: TOTAL ASSET INVESTMENT */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              TOTAL ASSET INVESTMENT
            </span>
            <div className="p-1.5 rounded-lg bg-violet-50 text-violet-700">
              <Layers size={16} />
            </div>
          </div>
          <div>
            <h3 className="text-lg sm:text-xl font-black text-violet-700">
              {formatCurrency(stats.totalAssetInvestment)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Total Cost + Maintenance Expense
            </p>
          </div>
        </div>

        {/* CARD 6: NEAR WARRANTY EXPIRY */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              NEAR WARRANTY EXPIRY
            </span>
            <div className="p-1.5 rounded-lg bg-amber-50 text-amber-700">
              <Clock size={16} />
            </div>
          </div>
          <div>
            <h3 className={`text-lg sm:text-xl font-black ${(stats.warrantyExpiringCount ?? 0) > 0 ? "text-amber-700" : "text-slate-800"}`}>
              {formatCount(stats.warrantyExpiringCount)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Warranties expiring in the next 30 days
            </p>
          </div>
        </div>

        {/* CARD 7: USEFUL LIFE EXCEEDED */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2 select-text">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">
              USEFUL LIFE EXCEEDED
            </span>
            <div className="p-1.5 rounded-lg bg-indigo-50 text-indigo-700">
              <AlertTriangle size={16} />
            </div>
          </div>
          <div>
            <h3 className={`text-lg sm:text-xl font-black ${(stats.endOfLifeCount ?? 0) > 0 ? "text-indigo-700" : "text-slate-800"}`}>
              {formatCount(stats.endOfLifeCount)}
            </h3>
            <p className="text-[10px] text-slate-400 font-medium mt-0.5">
              Elapsed age exceeds useful life limit
            </p>
          </div>
        </div>
      </div>

      {/* =========================================================================
          TWO CHARTS (TWO-COLUMN RESPONSIVE LAYOUT)
          8. ASSET VALUE BY DEPARTMENT (ETB)
          9. ASSET VALUE BY CATEGORY (ETB)
          ========================================================================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* CHART 1: ASSET VALUE BY DEPARTMENT (ETB) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Building2 size={15} className="text-sky-700" />
              ASSET VALUE BY DEPARTMENT (ETB)
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              {deptChartData?.length || 0} Units
            </span>
          </div>

          <div className="h-64 w-full">
            {deptChartData && deptChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={deptChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={9}
                    fontStyle="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tickFormatter={truncateLabel}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    fontStyle="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Asset Value"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "6px 10px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", marginBottom: "2px" }}
                    itemStyle={{ color: "#38bdf8", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#0284c7"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Building2 size={24} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-500">No department asset values logged yet.</p>
              </div>
            )}
          </div>
        </div>

        {/* CHART 2: ASSET VALUE BY CATEGORY (ETB) */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
          <div className="flex items-center justify-between pb-2 border-b border-slate-100">
            <h4 className="text-xs font-bold text-slate-800 uppercase flex items-center gap-1.5">
              <Tags size={15} className="text-emerald-700" />
              ASSET VALUE BY CATEGORY (ETB)
            </h4>
            <span className="text-[10px] text-slate-400 font-semibold">
              {catChartData?.length || 0} Categories
            </span>
          </div>

          <div className="h-64 w-full">
            {catChartData && catChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={catChartData}
                  margin={{ top: 10, right: 10, left: -15, bottom: 20 }}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                  <XAxis
                    dataKey="name"
                    stroke="#94a3b8"
                    fontSize={9}
                    fontStyle="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    interval={0}
                    angle={-20}
                    textAnchor="end"
                    tickFormatter={truncateLabel}
                  />
                  <YAxis
                    stroke="#94a3b8"
                    fontSize={9}
                    fontStyle="bold"
                    tickLine={false}
                    axisLine={{ stroke: "#e2e8f0" }}
                    tickFormatter={formatYAxisTick}
                  />
                  <Tooltip
                    formatter={(value) => [`${Number(value).toLocaleString()} ETB`, "Asset Value"]}
                    contentStyle={{
                      backgroundColor: "#0f172a",
                      borderRadius: "8px",
                      border: "none",
                      color: "#fff",
                      fontSize: "11px",
                      padding: "6px 10px",
                      boxShadow: "0 10px 15px -3px rgba(0, 0, 0, 0.1)",
                    }}
                    labelStyle={{ color: "#94a3b8", fontWeight: "bold", marginBottom: "2px" }}
                    itemStyle={{ color: "#34d399", fontWeight: "bold" }}
                  />
                  <Bar
                    dataKey="value"
                    fill="#10b981"
                    radius={[4, 4, 0, 0]}
                    maxBarSize={40}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex flex-col items-center justify-center text-center p-4 bg-slate-50/50 rounded-xl border border-dashed border-slate-200">
                <Tags size={24} className="text-slate-300 mb-1.5" />
                <p className="text-xs font-semibold text-slate-500">No category asset values logged yet.</p>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* =========================================================================
          REPORTS & EXPORTERS CENTER
          Preserves export CSV & print reports functionality
          ========================================================================= */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-3">
        <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest pb-1.5 border-b border-slate-100 flex items-center">
          <FileSpreadsheet size={14} className="mr-1.5 text-sky-700" /> Reports & Exporters Center
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-bold">
          {reports.map((r) => (
            <div
              key={r.type}
              className="flex justify-between items-center p-3 bg-slate-50 border border-slate-200/70 rounded-xl hover:border-slate-300 transition-colors"
            >
              <span className="text-slate-700 uppercase text-[10px] tracking-wide font-extrabold">{r.name}</span>
              <div className="flex items-center space-x-1">
                <button
                  type="button"
                  onClick={() => handleDownloadReport(r.type)}
                  disabled={isPending}
                  className="p-1.5 text-sky-700 hover:bg-sky-50 rounded bg-white border border-slate-200 shadow-sm transition-all disabled:opacity-50"
                  title="Export to CSV Spreadsheet"
                >
                  <FileSpreadsheet size={12} />
                </button>
                <button
                  type="button"
                  onClick={() => handlePrint(r.type)}
                  className="p-1.5 text-slate-600 hover:bg-slate-100 rounded bg-white border border-slate-200 shadow-sm transition-all"
                  title="View PDF / Print"
                >
                  <Printer size={12} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
