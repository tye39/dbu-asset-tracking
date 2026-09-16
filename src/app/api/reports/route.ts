import { prisma } from "@/lib/db";
import { NextRequest } from "next/server";
import { auth } from "@/auth";
import { Prisma, FundingSource, AssetStatus } from "@prisma/client";

// Helper to escape CSV fields
function escapeCSV(val: unknown): string {
  if (val === null || val === undefined) return "";
  const str = String(val).replace(/"/g, '""');
  if (str.includes(",") || str.includes("\n") || str.includes('"')) {
    return `"${str}"`;
  }
  return str;
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { searchParams } = new URL(req.url);
  const type = searchParams.get("type") || "inventory";
  const timestamp = new Date().toISOString().slice(0, 10);

  let csvContent = "";
  const filename = `${type}_report_${timestamp}.csv`;

  // Parse Filters
  const departmentId = searchParams.get("departmentId") || searchParams.get("department") || undefined;
  const categoryId = searchParams.get("categoryId") || searchParams.get("category") || undefined;
  const fundingSource = searchParams.get("fundingSource") || undefined;
  const status = searchParams.get("status") || undefined;
  const startDateStr = searchParams.get("startDate") || undefined;
  const endDateStr = searchParams.get("endDate") || undefined;

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
      case "inventory": {
        const data = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true, department: true },
          orderBy: { name: "asc" },
        });
        const headers = ["Asset Code", "Name", "Serial Number", "Category", "Department", "Status", "Created At"];
        const rows = data.map((a) => [
          a.assetCode,
          a.name,
          a.serialNumber,
          a.category.name,
          a.department.name,
          a.status,
          a.createdAt.toLocaleDateString(),
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "procurement": {
        const data = await prisma.asset.findMany({
          where: { ...assetWhere, procurementCost: { not: null } },
          include: { supplier: true, category: true },
          orderBy: { purchaseDate: "desc" },
        });
        const headers = ["Asset Code", "Name", "Purchase Date", "Procurement Cost", "Supplier", "Warranty Expiry"];
        const rows = data.map((a) => [
          a.assetCode,
          a.name,
          a.purchaseDate ? a.purchaseDate.toLocaleDateString() : "-",
          a.procurementCost ? Number(a.procurementCost).toString() : "0",
          a.supplier?.name || "Direct / Internal",
          a.warrantyExpiry ? a.warrantyExpiry.toLocaleDateString() : "-",
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "maintenance": {
        const data = await prisma.maintenance.findMany({
          where: {
            asset: assetWhere
          },
          include: { asset: true, reportedBy: true, assignedTo: true },
          orderBy: { createdAt: "desc" },
        });
        const headers = ["Task ID", "Asset Name", "Asset Code", "Reported By", "Technician", "Priority", "Status", "Cost", "Date"];
        const rows = data.map((m) => [
          m.id.slice(0, 8),
          m.asset.name,
          m.asset.assetCode,
          m.reportedBy.name,
          m.assignedTo?.name || "Unassigned",
          m.priority,
          m.status,
          m.cost ? Number(m.cost).toString() : "0.00",
          m.createdAt.toLocaleDateString(),
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "transfers": {
        const data = await prisma.transfer.findMany({
          where: {
            asset: assetWhere
          },
          include: { asset: true, fromDepartment: true, toDepartment: true, requestedBy: true },
          orderBy: { createdAt: "desc" },
        });
        const headers = ["Asset Code", "Asset Name", "From Department", "To Department", "Requested By", "Status", "Date"];
        const rows = data.map((t) => [
          t.asset.assetCode,
          t.asset.name,
          t.fromDepartment?.name || "General Pool",
          t.toDepartment?.name || "N/A",
          t.requestedBy.name,
          t.status,
          t.createdAt.toLocaleDateString(),
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "reservation": {
        const headers = ["Reservation ID", "Asset Code", "User", "Department", "Reserved From", "Reserved To", "Status"];
        const rows = [
          ["RES-0192", "DBU-LAP-001", "Abebe Kebede", "Software Engineering", "2026-08-01", "2026-08-05", "CONFIRMED"],
          ["RES-0834", "DBU-VEH-102", "Software Eng Head", "Software Engineering", "2026-07-25", "2026-07-25", "PENDING"],
        ];
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "audits": {
        const data = await prisma.auditSession.findMany({
          include: { auditor: true, _count: { select: { items: true } } },
          orderBy: { createdAt: "desc" },
        });
        const headers = ["Session ID", "Audit Title", "Auditor Name", "Scope Assets", "Status", "Start Date", "End Date"];
        const rows = data.map((a) => [
          a.id.slice(0, 8),
          a.title,
          a.auditor.name,
          a._count.items.toString(),
          a.status,
          a.startDate.toLocaleDateString(),
          a.endDate ? a.endDate.toLocaleDateString() : "Active",
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "disposal": {
        const data = await prisma.disposal.findMany({
          where: {
            asset: assetWhere
          },
          include: { asset: true, disposedBy: true },
          orderBy: { disposalDate: "desc" },
        });
        const headers = ["Asset Code", "Asset Name", "Disposed By", "Reason", "Method", "Date", "Remarks"];
        const rows = data.map((d) => [
          d.asset.assetCode,
          d.asset.name,
          d.disposedBy.name,
          d.reason,
          d.method,
          d.disposalDate.toLocaleDateString(),
          d.notes || "-",
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "supplier": {
        const data = await prisma.supplier.findMany({
          include: { _count: { select: { assets: { where: assetWhere } } } },
          orderBy: { name: "asc" },
        });
        const headers = ["Supplier Name", "Contact Person", "Email", "Phone", "Location", "Total Provided Assets"];
        const rows = data.map((s) => [
          s.name,
          s.contactPerson || "-",
          s.email || "-",
          s.phone || "-",
          s.address || "-",
          s._count.assets.toString(),
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

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

        const data = await prisma.organizationalUnit.findMany({
          where: {
            deletedAt: null,
            ...(typeFilter ? { type: typeFilter } : {}),
          },
          include: {
            _count: { select: { assets: { where: assetWhere } } },
            faculty: true,
            parent: true,
          },
          orderBy: { name: "asc" },
        });
        const headers = ["Unit Code", "Unit Name", "Type", "Parent Unit", "Faculty/Scope", "Total Registered Assets"];
        const rows = data.map((d) => [
          d.code,
          d.name,
          d.type,
          d.parent?.name || "-",
          d.faculty?.name || "-",
          d._count.assets.toString(),
        ]);
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      // New Simplified Financial Exporters Cases
      case "fin_asset": {
        const assets = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true, department: true }
        });
        const headers = ["Asset Code", "Name", "Category", "Department", "Funding Source", "Purchase Cost (ETB)", "Current Book Value (ETB)", "Accumulated Depreciation (ETB)", "Total Maintenance Cost (ETB)", "Total Asset Investment (ETB)"];
        const rows = assets.map((a) => {
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
            cost.toString(),
            book.toString(),
            depr.toString(),
            maint.toString(),
            invest.toString()
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_depr": {
        const assets = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true }
        });
        const headers = ["Asset Code", "Name", "Category", "Purchase Date", "Cost (ETB)", "Salvage Value (ETB)", "Useful Life (Yrs)", "Annual Depreciation (ETB)", "Monthly Depreciation (ETB)", "Accumulated Depreciation (ETB)", "Current Book Value (ETB)"];
        const rows = assets.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const salvage = a.salvageValue ? Number(a.salvageValue) : 0;
          const life = a.usefulLife || 5;
          const annual = a.annualDepreciation ? Number(a.annualDepreciation) : 0;
          const monthly = a.monthlyDepreciation ? Number(a.monthlyDepreciation) : 0;
          const accum = a.accumulatedDepreciation ? Number(a.accumulatedDepreciation) : 0;
          const book = a.currentBookValue ? Number(a.currentBookValue) : cost;

          return [
            a.assetCode,
            a.name,
            a.category.name,
            a.purchaseDate ? a.purchaseDate.toLocaleDateString() : "-",
            cost.toString(),
            salvage.toString(),
            life.toString(),
            annual.toString(),
            monthly.toString(),
            accum.toString(),
            book.toString()
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_maint": {
        const assets = await prisma.asset.findMany({
          where: assetWhere,
          include: { department: true }
        });
        const headers = ["Asset Code", "Name", "Department", "Purchase Price (ETB)", "Total Maintenance Cost (ETB)", "Repair Ratio Pct", "Replacement Recommendation"];
        const rows = assets.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const maint = a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0;
          const ratio = cost > 0 ? (maint / cost) * 100 : 0;
          const recommendation = ratio > 50 ? "REPLACE" : "KEEP";

          return [
            a.assetCode,
            a.name,
            a.department.name,
            cost.toString(),
            maint.toString(),
            `${Math.round(ratio)}%`,
            recommendation
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_funding": {
        const assets = await prisma.asset.findMany({
          where: assetWhere,
          include: { category: true }
        });
        const headers = ["Asset Code", "Name", "Category", "Funding Source", "Purchase Cost (ETB)", "Current Book Value (ETB)", "Total Maintenance (ETB)", "Total Investment (ETB)"];
        const rows = assets.map((a) => {
          const cost = a.purchaseCost ? Number(a.purchaseCost) : 0;
          const book = a.currentBookValue ? Number(a.currentBookValue) : cost;
          const maint = a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0;
          const invest = cost + maint;

          return [
            a.assetCode,
            a.name,
            a.category.name,
            a.fundingSource || "UNSPECIFIED",
            cost.toString(),
            book.toString(),
            maint.toString(),
            invest.toString()
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_warranty": {
        const assets = await prisma.asset.findMany({
          where: assetWhere
        });
        const now = new Date();
        const headers = ["Asset Code", "Name", "Serial Number", "Warranty Start", "Warranty End", "Warranty Status"];
        const rows = assets.map((a) => {
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
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_dept_val": {
        const depts = await prisma.organizationalUnit.findMany({
          where: { deletedAt: null },
          include: {
            assets: {
              where: assetWhere
            }
          }
        });
        const headers = ["Department Name", "Total Assets Owned", "Total Capital Value (ETB)", "Total Maintenance Cost (ETB)", "Total Asset Investment (ETB)"];
        const rows = depts.map((d) => {
          const count = d.assets.length;
          const value = d.assets.reduce((sum, a) => sum + (a.purchaseCost ? Number(a.purchaseCost) : 0), 0);
          const maint = d.assets.reduce((sum, a) => sum + (a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0), 0);
          const invest = value + maint;

          return [
            d.name,
            count.toString(),
            value.toFixed(2),
            maint.toFixed(2),
            invest.toFixed(2)
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      case "fin_cat_val": {
        const cats = await prisma.assetCategory.findMany({
          where: { deletedAt: null },
          include: {
            assets: {
              where: assetWhere
            }
          }
        });
        const headers = ["Category Name", "Total Assets Owned", "Total Capital Value (ETB)", "Total Maintenance Cost (ETB)", "Total Asset Investment (ETB)"];
        const rows = cats.map((c) => {
          const count = c.assets.length;
          const value = c.assets.reduce((sum, a) => sum + (a.purchaseCost ? Number(a.purchaseCost) : 0), 0);
          const maint = c.assets.reduce((sum, a) => sum + (a.totalMaintenanceCost ? Number(a.totalMaintenanceCost) : 0), 0);
          const invest = value + maint;

          return [
            c.name,
            count.toString(),
            value.toFixed(2),
            maint.toFixed(2),
            invest.toFixed(2)
          ];
        });
        csvContent = [headers, ...rows].map((r) => r.map(escapeCSV).join(",")).join("\n");
        break;
      }

      default: {
        return new Response("Unknown report type", { status: 400 });
      }
    }

    return new Response(csvContent, {
      status: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${filename}"`,
      },
    });
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Error generating CSV.";
    return new Response(msg, { status: 500 });
  }
}
