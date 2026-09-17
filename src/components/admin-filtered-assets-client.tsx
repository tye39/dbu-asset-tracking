"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  ArrowLeft, 
  Search, 
  Download, 
  ExternalLink, 
  AlertTriangle, 
  ShieldAlert, 
  Clock, 
  PackageOpen,
  Calendar,
  Layers,
  Building
} from "lucide-react";

export interface FilteredAssetItem {
  id: string;
  assetCode: string;
  name: string;
  category: string;
  department: string;
  status: string;
  purchaseCost: number;
  purchaseDate: string | null;
  warrantyStartDate: string | null;
  warrantyEndDate: string | null;
  usefulLifeYears: number;
  elapsedMonths: number;
  highlightDetail: string;
}

interface AdminFilteredAssetsClientProps {
  title: string;
  description: string;
  badgeLabel: string;
  badgeColor: "rose" | "amber" | "indigo" | "sky";
  type: "EXPIRED" | "NEAR_WARRANTY_EXPIRY" | "USEFUL_LIFE_EXCEEDED";
  assets: FilteredAssetItem[];
}

export function AdminFilteredAssetsClient({
  title,
  description,
  badgeLabel,
  badgeColor,
  type,
  assets,
}: AdminFilteredAssetsClientProps) {
  const router = useRouter();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");

  const filteredAssets = useMemo(() => {
    return assets.filter((asset) => {
      const matchesSearch =
        asset.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.assetCode.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        asset.department.toLowerCase().includes(searchTerm.toLowerCase());

      const matchesStatus =
        statusFilter === "ALL" || asset.status === statusFilter;

      return matchesSearch && matchesStatus;
    });
  }, [assets, searchTerm, statusFilter]);

  const uniqueStatuses = useMemo(() => {
    return Array.from(new Set(assets.map((a) => a.status)));
  }, [assets]);

  const handleExportCSV = () => {
    const headers = [
      "Asset Code",
      "Asset Name",
      "Category",
      "Department",
      "Status",
      "Purchase Cost (ETB)",
      "Purchase Date",
      "Warranty End Date",
      "Useful Life (Years)",
      "Criteria Detail"
    ];

    const rows = filteredAssets.map((a) => [
      `"${a.assetCode}"`,
      `"${a.name}"`,
      `"${a.category}"`,
      `"${a.department}"`,
      `"${a.status}"`,
      a.purchaseCost,
      `"${a.purchaseDate || "N/A"}"`,
      `"${a.warrantyEndDate || "N/A"}"`,
      a.usefulLifeYears,
      `"${a.highlightDetail}"`
    ]);

    const csvContent = [headers.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `DBU_${type}_Assets_${new Date().toISOString().split("T")[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const badgeStyles = {
    rose: "bg-rose-100 text-rose-800 border-rose-200",
    amber: "bg-amber-100 text-amber-800 border-amber-200",
    indigo: "bg-indigo-100 text-indigo-800 border-indigo-200",
    sky: "bg-sky-100 text-sky-800 border-sky-200",
  }[badgeColor];

  const typeIcon = {
    EXPIRED: <ShieldAlert className="text-rose-600" size={24} />,
    NEAR_WARRANTY_EXPIRY: <Clock className="text-amber-600" size={24} />,
    USEFUL_LIFE_EXCEEDED: <AlertTriangle className="text-indigo-600" size={24} />,
  }[type];

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/admin/dashboard")}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
            title="Back to Dashboard"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Dashboard</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              {typeIcon}
              <h1 className="text-xl font-black text-slate-800 tracking-tight">
                {title}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-xs font-black border ${badgeStyles}`}>
                {assets.length} {badgeLabel}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{description}</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={handleExportCSV}
            disabled={filteredAssets.length === 0}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-bold transition-all disabled:opacity-50"
          >
            <Download size={14} />
            Export CSV
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by code, name, dept, category..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <label className="text-xs font-bold text-slate-500 whitespace-nowrap">Status:</label>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-700"
          >
            <option value="ALL">All Statuses ({assets.length})</option>
            {uniqueStatuses.map((st) => (
              <option key={st} value={st}>
                {st}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Assets Table */}
      {filteredAssets.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-14 h-14 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <PackageOpen size={28} />
          </div>
          <h3 className="text-base font-bold text-slate-700">No Assets Matching Criteria</h3>
          <p className="text-xs text-slate-400 max-w-md mx-auto mt-1">
            {searchTerm || statusFilter !== "ALL"
              ? "No assets match your search or status filter. Try clearing filters."
              : `Great news! No university assets are currently flagged under "${title}".`}
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[10px] font-extrabold uppercase text-slate-500 tracking-wider">
                  <th className="py-3 px-4">Asset Code</th>
                  <th className="py-3 px-4">Asset Name</th>
                  <th className="py-3 px-4">Category & Department</th>
                  <th className="py-3 px-4">Acquisition</th>
                  <th className="py-3 px-4">
                    {type === "USEFUL_LIFE_EXCEEDED" ? "Useful Life Analysis" : "Warranty Timeline"}
                  </th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs">
                {filteredAssets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-3 px-4 font-mono font-bold text-sky-700">
                      {asset.assetCode}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-slate-800">{asset.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">
                        {asset.highlightDetail}
                      </div>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700">
                        <Layers size={11} className="text-slate-400" />
                        {asset.category}
                      </div>
                      <div className="flex items-center gap-1 text-[10px] text-slate-500">
                        <Building size={10} className="text-slate-400" />
                        {asset.department}
                      </div>
                    </td>
                    <td className="py-3 px-4 space-y-0.5">
                      <div className="font-bold text-slate-700">
                        {asset.purchaseCost > 0 ? `${asset.purchaseCost.toLocaleString()} ETB` : "N/A"}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <Calendar size={10} />
                        {asset.purchaseDate || "Unknown date"}
                      </div>
                    </td>
                    <td className="py-3 px-4">
                      {type === "USEFUL_LIFE_EXCEEDED" ? (
                        <div className="space-y-0.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            Age: {Math.floor(asset.elapsedMonths / 12)} yrs {asset.elapsedMonths % 12} mos
                          </span>
                          <div className="text-[10px] text-slate-400">
                            Limit: {asset.usefulLifeYears} years
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-0.5">
                          <div className="text-[11px] font-semibold text-slate-700">
                            End: {asset.warrantyEndDate || "N/A"}
                          </div>
                          <div className="text-[10px] text-slate-400">
                            Start: {asset.warrantyStartDate || "N/A"}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700 border border-slate-200 uppercase">
                        {asset.status.replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <Link
                        href={`/pao/assets?search=${encodeURIComponent(asset.assetCode)}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-slate-100 hover:bg-sky-50 text-slate-700 hover:text-sky-700 rounded-lg text-xs font-bold transition-all border border-slate-200 hover:border-sky-200"
                        title="View Asset Details"
                      >
                        <span>View</span>
                        <ExternalLink size={12} />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
