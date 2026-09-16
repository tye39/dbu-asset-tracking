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
import {
  DollarSign,
  TrendingUp,
  AlertTriangle,
  FileSpreadsheet,
  Printer,
  Package,
  Wrench,
  Activity,
  Layers,
  Calendar,
  Clock,
  ShieldAlert
} from "lucide-react";

interface DashboardFinancialClientProps {
  stats: {
    totalAssetValue: number;
    currentBookValue: number;
    totalDepreciation: number;
    totalMaintenanceCost: number;
    totalAssetInvestment: number;
    warrantyExpiringCount: number;
    endOfLifeCount: number;
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
      {/* 7 Summary Cards Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        
        {/* Card 1: Total Asset Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Asset Value</span>
            <Package size={16} className="text-sky-700" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-800">{stats.totalAssetValue.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Acquisition value of all assets</p>
          </div>
        </div>

        {/* Card 2: Current Book Value */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Current Book Value</span>
            <DollarSign size={16} className="text-emerald-700" />
          </div>
          <div>
            <h3 className="text-lg font-black text-emerald-700">{stats.currentBookValue.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Value after straight-line depreciation</p>
          </div>
        </div>

        {/* Card 3: Total Depreciation */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Depreciation</span>
            <Activity size={16} className="text-indigo-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-indigo-700">{stats.totalDepreciation.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Cumulative accumulated depreciation</p>
          </div>
        </div>

        {/* Card 4: Total Maintenance Cost */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Maintenance Cost</span>
            <Wrench size={16} className="text-amber-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-amber-700">{stats.totalMaintenanceCost.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Sum of completed repairs cost</p>
          </div>
        </div>

        {/* Card 5: Total Asset Investment */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Total Asset Investment</span>
            <TrendingUp size={16} className="text-violet-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-violet-700">{stats.totalAssetInvestment.toLocaleString()} ETB</h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Total Cost + Maintenance Expense</p>
          </div>
        </div>

        {/* Card 6: Assets Near Warranty Expiration */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Near Warranty Expiry</span>
            <ShieldAlert size={16} className="text-rose-600" />
          </div>
          <div>
            <h3 className={`text-lg font-black ${stats.warrantyExpiringCount > 0 ? "text-rose-700" : "text-slate-800"}`}>
              {stats.warrantyExpiringCount} Assets
            </h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Warranties expiring in next 30 days</p>
          </div>
        </div>

        {/* Card 7: Assets Near End of Useful Life */}
        <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-2">
          <div className="flex justify-between items-center">
            <span className="text-[10px] font-extrabold text-slate-400 uppercase tracking-wider">Useful Life Exceeded</span>
            <AlertTriangle size={16} className="text-amber-500" />
          </div>
          <div>
            <h3 className={`text-lg font-black ${stats.endOfLifeCount > 0 ? "text-amber-700" : "text-slate-800"}`}>
              {stats.endOfLifeCount} Assets
            </h3>
            <p className="text-[9px] text-slate-400 font-semibold mt-1">Elapsed age exceeds useful life limit</p>
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
