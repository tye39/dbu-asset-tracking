import React from "react";
import { getAssets } from "@/services/asset";
import { prisma } from "@/lib/db";
import { Search, ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";
import { AssetStatus } from "@prisma/client";
import { auth } from "@/auth";
import { PaoAssetActions } from "@/components/pao-asset-actions";

export const revalidate = 0;

interface AssetsPageProps {
  searchParams: {
    search?: string;
    status?: string;
    category?: string;
    department?: string;
    unitType?: string;
    officeLocation?: string;
    page?: string;
  };
}

export default async function PaoAssetsPage({ searchParams }: AssetsPageProps) {
  const session = await auth();
  const userRole = session?.user?.role || "";

  const page = Number(searchParams.page) || 1;
  const limit = 10;
  const searchQuery = searchParams.search || "";
  const filterStatus = (searchParams.status as AssetStatus) || undefined;
  const filterCategory = searchParams.category || undefined;
  const filterDepartment = searchParams.department || undefined;
  const filterUnitType = searchParams.unitType || undefined;
  const filterLocation = searchParams.officeLocation || undefined;

  // 1. Fetch filtered assets
  const { assets, total, totalPages } = await getAssets({
    search: searchQuery,
    status: filterStatus,
    categoryId: filterCategory,
    departmentId: filterDepartment,
    unitType: filterUnitType,
    officeLocation: filterLocation,
    page,
    limit,
  });

  // 2. Fetch filter options
  const [categories, departments] = await Promise.all([
    prisma.assetCategory.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    prisma.organizationalUnit.findMany({ where: { deletedAt: null }, select: { id: true, name: true, code: true } }),
  ]);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "ACTIVE":
        return "bg-green-50 text-green-700 border-green-200";
      case "ASSIGNED":
        return "bg-blue-50 text-blue-700 border-blue-200";
      case "UNDER_MAINTENANCE":
        return "bg-orange-50 text-orange-700 border-orange-200 animate-pulse";
      case "DISPOSED":
        return "bg-red-50 text-red-700 border-red-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 bg-sky-900/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-sky-900">Asset Inventory</h2>
          <p className="text-xs text-sky-600 font-semibold mt-1">Full database records, state logging, and tracking details</p>
        </div>
        <Link
          href="/pao/assets/new"
          className="px-4 py-2 bg-[#0b4a6e] hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-all shadow-md"
        >
          Register Asset
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="bg-white p-4 rounded-xl border border-slate-100 shadow-sm">
        <form method="GET" className="flex flex-wrap items-center gap-3">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px]">
            <input
              type="text"
              name="search"
              defaultValue={searchQuery}
              placeholder="Search by name, code or serial..."
              className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-600"
            />
            <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
          </div>

          {/* Status filter */}
          <select
            name="status"
            defaultValue={filterStatus || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none"
          >
            <option value="">-- All Statuses --</option>
            <option value="ACTIVE">Active</option>
            <option value="ASSIGNED">Assigned</option>
            <option value="UNDER_MAINTENANCE">Under Maintenance</option>
            <option value="DISPOSED">Disposed</option>
          </select>

          {/* Category filter */}
          <select
            name="category"
            defaultValue={filterCategory || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none max-w-[150px]"
          >
            <option value="">-- All Categories --</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>{c.name}</option>
            ))}
          </select>

          {/* Department / Org Unit filter */}
          <select
            name="department"
            defaultValue={filterDepartment || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none max-w-[150px]"
          >
            <option value="">-- All Org Units --</option>
            {departments.map((d) => (
              <option key={d.id} value={d.id}>{d.name} ({d.code})</option>
            ))}
          </select>

          {/* Unit Type filter */}
          <select
            name="unitType"
            defaultValue={filterUnitType || ""}
            className="p-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none max-w-[150px]"
          >
            <option value="">-- All Unit Types --</option>
            <option value="COLLEGE">Colleges</option>
            <option value="DEPARTMENT">Departments</option>
            <option value="DIRECTORATE">Directorates</option>
            <option value="ADMINISTRATIVE_OFFICE">Admin Offices</option>
            <option value="LIBRARY">Libraries</option>
            <option value="LABORATORY">Laboratories</option>
            <option value="STORE">Central Store</option>
            <option value="WAREHOUSE">Warehouse</option>
            <option value="CAFETRIA">Cafeterias</option>
            <option value="CLINIC">Clinics</option>
          </select>

          {/* Location Search Input */}
          <input
            type="text"
            name="officeLocation"
            defaultValue={filterLocation || ""}
            placeholder="Bldg / Floor / Room..."
            className="pl-3 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-sky-600 w-36"
          />

          <button
            type="submit"
            className="px-4 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold transition-all"
          >
            Apply Filters
          </button>

          {(searchQuery || filterStatus || filterCategory || filterDepartment || filterUnitType || filterLocation) && (
            <Link
              href="/pao/assets"
              className="px-3 py-1.5 border border-slate-200 text-slate-500 rounded-lg text-xs font-bold hover:bg-slate-50"
            >
              Clear
            </Link>
          )}
        </form>
      </div>

      {/* Assets Table */}
      <div className="bg-white p-5 rounded-2xl border border-slate-100 shadow-sm space-y-4">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-100 text-[10px] text-slate-400 font-bold uppercase">
                <th className="py-2.5">Asset Code</th>
                <th className="py-2.5">Asset Name</th>
                <th className="py-2.5">Category</th>
                <th className="py-2.5">Department</th>
                <th className="py-2.5">Status</th>
                <th className="py-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50 text-xs">
              {assets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-6 text-center text-slate-400 font-semibold">
                    No asset records found matching criteria.
                  </td>
                </tr>
              ) : (
                assets.map((asset) => (
                  <tr key={asset.id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="py-3 font-mono font-bold text-sky-700">{asset.assetCode}</td>
                    <td className="py-3 font-semibold text-slate-800">
                      {asset.name}
                      <span className="block text-[10px] text-slate-400 font-normal">SN: {asset.serialNumber}</span>
                    </td>
                    <td className="py-3 text-slate-500">{asset.category.name}</td>
                    <td className="py-3 text-slate-500">{asset.department.name}</td>
                    <td className="py-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${getStatusBadge(asset.status)}`}>
                        {asset.status.replace(/_/g, " ").toLowerCase()}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <PaoAssetActions
                        assetId={asset.id}
                        assetName={asset.name}
                        assetCode={asset.assetCode}
                        assetTypeName={asset.assetType?.name || "General Equipment"}
                        status={asset.status}
                        userRole={userRole}
                      />
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
              <span className="font-bold text-slate-700">{totalPages}</span> ({total} records)
            </span>
            <div className="flex space-x-1">
              <Link
                href={page > 1 ? `/pao/assets?page=${page - 1}&search=${searchQuery}&status=${filterStatus || ""}&category=${filterCategory || ""}&department=${filterDepartment || ""}` : "#"}
                className={`p-1.5 border border-slate-200 rounded hover:bg-slate-50 ${page <= 1 ? "opacity-35 cursor-not-allowed" : ""}`}
              >
                <ChevronLeft size={14} />
              </Link>
              <Link
                href={page < totalPages ? `/pao/assets?page=${page + 1}&search=${searchQuery}&status=${filterStatus || ""}&category=${filterCategory || ""}&department=${filterDepartment || ""}` : "#"}
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
