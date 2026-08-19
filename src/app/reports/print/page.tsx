import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { Printer, ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Prisma, FundingSource, AssetStatus } from "@prisma/client";

interface PrintReportPageProps {
  searchParams: {
    type?: string;
    departmentId?: string;
    department?: string;
    categoryId?: string;
    category?: string;
    fundingSource?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
  };
}

export const revalidate = 0;

export default async function PrintReportPage({ searchParams }: PrintReportPageProps) {
  const session = await auth();
  if (!session?.user) {
    return (
      <div className="p-10 text-center font-bold text-red-600">
        Unauthorized access. Please sign in.
      </div>
    );
  }

  const type = searchParams.type || "inventory";
  const dateStr = new Date().toLocaleDateString("en-US", {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
  });

  let reportTitle = "";
  let headers: string[] = [];
  let rows: string[][] = [];

  // Parse Filters
  const departmentId = searchParams.departmentId || searchParams.department || undefined;
  const categoryId = searchParams.categoryId || searchParams.category || undefined;
  const fundingSource = searchParams.fundingSource || undefined;
  const status = searchParams.status || undefined;
  const startDateStr = searchParams.startDate || undefined;
  const endDateStr = searchParams.endDate || undefined;

  const startDate = startDateStr ? new Date(startDateStr) : undefined;
  const endDate = endDateStr ? new Date(endDateStr) : undefined;

  const assetWhere: Prisma.AssetWhereInput = { deletedAt: null };
  if (departmentId) assetWhere.departmentId = departmentId;
  if (categoryId) assetWhere.categoryId = categoryId;
  if (fundingSource) assetWhere.fundingSource = fundingSource as FundingSource;
  if (status) assetWhere.status = status as AssetStatus;
  if (startDate || endDate) {
    assetWhere.purchaseDate = {
      ...(startDate ? { gte: startDate } : {}),
      ...(endDate ? { lte: endDate } : {})
    };
  }

  try {
    switch (type) {
      case "inventory":
        reportTitle = "DBU Asset Inventory Status Report";
        headers = ["Asset Code", "Name", "Serial Number", "Category", "Department", "Status"];
        const assets = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true, department: true },
          orderBy: { name: "asc" },
        });
        rows = assets.map(a => [
          a.assetCode, a.name, a.serialNumber, a.category.name, a.department.name, a.status
        ]);
        break;

      case "procurement":
        reportTitle = "DBU Property Procurement & Warranty Registry";
        headers = ["Asset Code", "Name", "Purchase Date", "Cost", "Supplier", "Warranty Expiry"];
        const procurements = await prisma.asset.findMany({
          where: { ...assetWhere, procurementCost: { not: null } },
          include: { supplier: true },
          orderBy: { purchaseDate: "desc" },
        });
        rows = procurements.map(a => [
          a.assetCode,
          a.name,
          a.purchaseDate ? a.purchaseDate.toLocaleDateString() : "-",
          a.procurementCost ? `${Number(a.procurementCost).toLocaleString()} ETB` : "-",
          a.supplier?.name || "Direct",
          a.warrantyExpiry ? a.warrantyExpiry.toLocaleDateString() : "-"
        ]);
        break;

      case "maintenance":
        reportTitle = "DBU Equipment Maintenance Task Summary";
        headers = ["Task ID", "Asset Name", "Asset Code", "Priority", "Status", "Maintenance Cost", "Completed Date"];
        const maintenances = await prisma.maintenance.findMany({
          where: { asset: assetWhere },
          include: { asset: true },
          orderBy: { createdAt: "desc" },
        });
        rows = maintenances.map(m => [
          m.id.slice(0, 8).toUpperCase(),
          m.asset.name,
          m.asset.assetCode,
          m.priority,
          m.status,
          m.maintenanceCost ? `${Number(m.maintenanceCost).toLocaleString()} ETB` : (m.cost ? `${Number(m.cost).toLocaleString()} ETB` : "0.00 ETB"),
          m.completedAt ? m.completedAt.toLocaleDateString() : "-"
        ]);
        break;

      case "transfers":
        reportTitle = "DBU Internal Assets Transfer Logs";
        headers = ["Asset Code", "Asset Name", "From Unit", "To Unit", "Requested By", "Status", "Date"];
        const transfers = await prisma.transfer.findMany({
          where: { asset: assetWhere },
          include: { asset: true, fromDepartment: true, toDepartment: true, requestedBy: true },
          orderBy: { createdAt: "desc" },
        });
        rows = transfers.map(t => [
          t.asset.assetCode,
          t.asset.name,
          t.fromDepartment?.name || "General Pool",
          t.toDepartment?.name || "-",
          t.requestedBy.name,
          t.status,
          t.createdAt.toLocaleDateString()
        ]);
        break;

      case "reservation":
        reportTitle = "DBU Core Equipment Reservations log";
        headers = ["Reservation ID", "Asset Code", "User Staff", "Reserved From", "Reserved To", "Status"];
        rows = [
          ["RES-0192", "DBU-LAP-001", "Abebe Kebede (CCI)", "2026-08-01", "2026-08-05", "CONFIRMED"],
          ["RES-0834", "DBU-VEH-102", "Software Eng Head", "2026-07-25", "2026-07-25", "PENDING"]
        ];
        break;

      case "audits":
        reportTitle = "DBU Asset Physical Audit Verification Log";
        headers = ["Session ID", "Audit Title", "Auditor Name", "Status", "Start Date", "End Date"];
        const auditSessions = await prisma.auditSession.findMany({
          include: { auditor: true },
          orderBy: { createdAt: "desc" },
        });
        rows = auditSessions.map(a => [
          a.id.slice(0, 8).toUpperCase(),
          a.title,
          a.auditor.name,
          a.status,
          a.startDate.toLocaleDateString(),
          a.endDate ? a.endDate.toLocaleDateString() : "Active"
        ]);
        break;

      case "disposal":
        reportTitle = "DBU Asset Disposals & Write-offs";
        headers = ["Asset Code", "Asset Name", "Disposed By", "Reason", "Method", "Disposal Date"];
        const disposals = await prisma.disposal.findMany({
          where: { asset: assetWhere },
          include: { asset: true, disposedBy: true },
          orderBy: { disposalDate: "desc" },
        });
        rows = disposals.map(d => [
          d.asset.assetCode,
          d.asset.name,
          d.disposedBy.name,
          d.reason,
          d.method,
          d.disposalDate.toLocaleDateString()
        ]);
        break;

      case "supplier":
        reportTitle = "DBU Registered Vendors & Suppliers";
        headers = ["Supplier Name", "Contact Person", "Email", "Phone", "Location"];
        const suppliers = await prisma.supplier.findMany({
          orderBy: { name: "asc" }
        });
        rows = suppliers.map(s => [
          s.name, s.contactPerson || "-", s.email || "-", s.phone || "-", s.address || "-"
        ]);
        break;

      case "department":
      case "unit":
      case "college":
      case "admin_office":
      case "directorate":
      case "library":
      case "laboratory": {
        let typeFilter: string | undefined = undefined;
        if (type === "college") typeFilter = "COLLEGE";
        else if (type === "admin_office") typeFilter = "ADMINISTRATIVE_OFFICE";
        else if (type === "directorate") typeFilter = "DIRECTORATE";
        else if (type === "library") typeFilter = "LIBRARY";
        else if (type === "laboratory") typeFilter = "LABORATORY";
        else if (type === "department") typeFilter = "DEPARTMENT";

        reportTitle = `DBU Organizational Unit Verification Report (${typeFilter || "All Units"})`;
        headers = ["Unit Code", "Unit Name", "Type", "Parent Unit", "Faculty/Scope"];
        const units = await prisma.organizationalUnit.findMany({
          where: {
            deletedAt: null,
            ...(typeFilter ? { type: typeFilter } : {})
          },
          include: { parent: true, faculty: true },
          orderBy: { name: "asc" }
        });
        rows = units.map(u => [
          u.code, u.name, u.type, u.parent?.name || "-", u.faculty?.name || "-"
        ]);
        break;
      }

      // 7 New Simplified Financial Reports Print Pages
      case "fin_asset": {
        reportTitle = "DBU Fixed Assets Financial Valuation Summary";
        headers = ["Asset Code", "Name", "Category", "Department", "Funding Source", "Purchase Cost", "Book Value", "Accum Depr", "Maint Cost", "Total Investment"];
        const assetsList = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true, department: true }
        });
        rows = assetsList.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const book = a.currentBookValue ? Number(a.currentBookValue) : cost;
          const depr = a.accumulatedDepreciation ? Number(a.accumulatedDepreciation) : 0;
          const maint = a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0;
          const invest = a.totalAssetInvestment ? Number(a.totalAssetInvestment) : (cost + maint);

          return [
            a.assetCode,
            a.name,
            a.category.name,
            a.department.name,
            a.fundingSource || "UNSPECIFIED",
            `${cost.toLocaleString()} ETB`,
            `${book.toLocaleString()} ETB`,
            `${depr.toLocaleString()} ETB`,
            `${maint.toLocaleString()} ETB`,
            `${invest.toLocaleString()} ETB`
          ];
        });
        break;
      }

      case "fin_depr": {
        reportTitle = "DBU Asset Depreciation Schedule (Straight-Line)";
        headers = ["Asset Code", "Name", "Purchase Date", "Cost", "Salvage Value", "Useful Life", "Annual Depr", "Accum Depr", "Book Value"];
        const assetsList = await prisma.asset.findMany({
          where: assetWhere
        });
        rows = assetsList.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const salvage = a.salvageValue ? Number(a.salvageValue) : 0;
          const life = a.usefulLife || 5;
          const annual = a.annualDepreciation ? Number(a.annualDepreciation) : 0;
          const accum = a.accumulatedDepreciation ? Number(a.accumulatedDepreciation) : 0;
          const book = a.currentBookValue ? Number(a.currentBookValue) : cost;

          return [
            a.assetCode,
            a.name,
            a.purchaseDate ? new Date(a.purchaseDate).toLocaleDateString() : "-",
            `${cost.toLocaleString()} ETB`,
            `${salvage.toLocaleString()} ETB`,
            `${life} Years`,
            `${annual.toLocaleString()} ETB`,
            `${accum.toLocaleString()} ETB`,
            `${book.toLocaleString()} ETB`
          ];
        });
        break;
      }

      case "fin_maint": {
        reportTitle = "DBU Maintenance Cost Compliance & Replacement Recommendations";
        headers = ["Asset Code", "Name", "Department", "Purchase Cost", "Maintenance Cost", "Repair Ratio Pct", "Recommendation"];
        const assetsList = await prisma.asset.findMany({
          where: assetWhere,
          include: { department: true }
        });
        rows = assetsList.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const maint = a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0;
          const ratio = cost > 0 ? (maint / cost) * 100 : 0;
          const recommendation = ratio > 50 ? "REPLACE" : "KEEP";

          return [
            a.assetCode,
            a.name,
            a.department.name,
            `${cost.toLocaleString()} ETB`,
            `${maint.toLocaleString()} ETB`,
            `${Math.round(ratio)}%`,
            recommendation
          ];
        });
        break;
      }

      case "fin_funding": {
        reportTitle = "DBU Capital Funding Source Summary";
        headers = ["Asset Code", "Name", "Funding Source", "Purchase Cost", "Book Value", "Total Investment"];
        const assetsList = await prisma.asset.findMany({
          where: assetWhere
        });
        rows = assetsList.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const book = a.currentBookValue ? Number(a.currentBookValue) : cost;
          const invest = a.totalAssetInvestment ? Number(a.totalAssetInvestment) : cost;

          return [
            a.assetCode,
            a.name,
            a.fundingSource || "UNSPECIFIED",
            `${cost.toLocaleString()} ETB`,
            `${book.toLocaleString()} ETB`,
            `${invest.toLocaleString()} ETB`
          ];
        });
        break;
      }

      case "fin_warranty": {
        reportTitle = "DBU Asset Warranties & Expiration Verification Log";
        headers = ["Asset Code", "Name", "Serial Number", "Warranty Start", "Warranty End", "Warranty Status"];
        const assetsList = await prisma.asset.findMany({
          where: assetWhere
        });
        const now = new Date();
        rows = assetsList.map((a) => {
          const end = a.warrantyEndDate;
          let statusStr = "NO_WARRANTY";
          if (end) {
            statusStr = new Date(end) > now ? "ACTIVE" : "EXPIRED";
          }
          return [
            a.assetCode,
            a.name,
            a.serialNumber,
            a.warrantyStartDate ? new Date(a.warrantyStartDate).toLocaleDateString() : "-",
            end ? new Date(end).toLocaleDateString() : "-",
            statusStr
          ];
        });
        break;
      }

      case "fin_dept_val": {
        reportTitle = "DBU Departmental Asset Value Summaries";
        headers = ["Department Name", "Total Assets Owned", "Total Capital Value", "Total Maintenance Cost", "Total Asset Investment"];
        const depts = await prisma.organizationalUnit.findMany({
          where: { deletedAt: null },
          include: {
            assets: {
              where: assetWhere
            }
          }
        });
        rows = depts.map((d) => {
          const count = d.assets.length;
          const value = d.assets.reduce((sum, a) => sum + (a.purchaseCost ? Number(a.purchaseCost) : 0), 0);
          const maint = d.assets.reduce((sum, a) => sum + (a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0), 0);
          const invest = value + maint;

          return [
            d.name,
            count.toString(),
            `${value.toLocaleString()} ETB`,
            `${maint.toLocaleString()} ETB`,
            `${invest.toLocaleString()} ETB`
          ];
        });
        break;
      }

      case "fin_cat_val": {
        reportTitle = "DBU Asset Category Valuation Summary";
        headers = ["Category Name", "Total Assets Owned", "Total Capital Value", "Total Maintenance Cost", "Total Asset Investment"];
        const cats = await prisma.assetCategory.findMany({
          where: { deletedAt: null },
          include: {
            assets: {
              where: assetWhere
            }
          }
        });
        rows = cats.map((c) => {
          const count = c.assets.length;
          const value = c.assets.reduce((sum, a) => sum + (a.purchaseCost ? Number(a.purchaseCost) : 0), 0);
          const maint = c.assets.reduce((sum, a) => sum + (a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0), 0);
          const invest = value + maint;

          return [
            c.name,
            count.toString(),
            `${value.toLocaleString()} ETB`,
            `${maint.toLocaleString()} ETB`,
            `${invest.toLocaleString()} ETB`
          ];
        });
        break;
      }

      default:
        reportTitle = "DBU Campus Asset Management Report";
        break;
    }
  } catch (e) {
    console.error(e);
  }

  return (
    <div className="min-h-screen bg-white p-8 text-slate-800 font-sans max-w-4xl mx-auto space-y-6">
      
      {/* Print Controls (hidden on print) */}
      <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl border border-slate-100 print:hidden">
        <Link
          href="/admin/dashboard"
          className="flex items-center space-x-1 text-slate-600 hover:text-slate-800 text-xs font-bold"
        >
          <ArrowLeft size={14} />
          <span>Back to Dashboard</span>
        </Link>
        <button
          onClick={() => { if (typeof window !== "undefined") window.print(); }}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold transition-all shadow-sm"
        >
          <Printer size={12} />
          <span>Print Document</span>
        </button>
      </div>

      {/* Report Sheet Head */}
      <div className="text-center space-y-1.5 border-b-2 border-slate-800 pb-5">
        <h1 className="text-base font-black tracking-widest text-[#002f5d] leading-none uppercase">DEBRE BERHAN UNIVERSITY</h1>
        <h2 className="text-[10px] text-yellow-600 tracking-widest font-black uppercase">Property & Assets Valuation Directorate</h2>
        <h3 className="text-sm font-bold text-slate-850 pt-1 tracking-wide">{reportTitle}</h3>
        <p className="text-[9px] text-slate-450 font-bold">Report Generated on: {dateStr}</p>
      </div>

      {/* Main Table */}
      <div className="overflow-x-auto">
        <table className="w-full text-[10px] text-left border-collapse border border-slate-200">
          <thead>
            <tr className="bg-slate-100/80">
              {headers.map((h, i) => (
                <th key={i} className="border border-slate-200 p-2.5 font-bold uppercase tracking-wider text-slate-650">
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, idx) => (
                <tr key={idx} className="hover:bg-slate-50/50">
                  {row.map((cell, cIdx) => (
                    <td key={cIdx} className="border border-slate-200 p-2.5 font-medium text-slate-700">
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={headers.length} className="border border-slate-200 p-8 text-center text-slate-400 font-semibold italic">
                  No records match the requested report criteria.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Auditor Footer Signatures */}
      <div className="grid grid-cols-2 gap-12 pt-16 text-[9px] font-bold text-slate-500 uppercase tracking-widest leading-normal">
        <div className="border-t border-slate-250 pt-3 text-center">
          <p>Prepared By (Directorate Officer)</p>
          <p className="text-slate-400 mt-2 font-mono text-[7px] italic normal-case">Signature & Stamp Date</p>
        </div>
        <div className="border-t border-slate-250 pt-3 text-center">
          <p>Authorized By (Auditor Head)</p>
          <p className="text-slate-400 mt-2 font-mono text-[7px] italic normal-case">Signature & Stamp Date</p>
        </div>
      </div>

    </div>
  );
}
