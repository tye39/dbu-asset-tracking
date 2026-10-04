import React from "react";
import { prisma } from "@/lib/db";
import { DashboardFinancialClient } from "@/components/dashboard-financial-client";
import { scanAndGenerateFinancialAlerts, calculateSingleAssetFinancials } from "@/services/financials";

import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { ROLES, getRoleDashboard, isValidRole } from "@/lib/rbac";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default async function AdminDashboardPage() {
  const session = await auth();
  if (!session?.user || !isValidRole(session.user.role)) {
    redirect("/");
  }
  if (session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    redirect(getRoleDashboard(session.user.role));
  }

  // Trigger scan & generate alerts in background
  prisma.$transaction(async (tx) => {
    await scanAndGenerateFinancialAlerts(tx);
  }).catch((err) => {
    console.error("Failed to run financial alert scans:", err);
  });

  // 1. Fetch count stats
  const [totalUsers, totalDepartments, pendingRequestsCount, maintenanceCount] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.organizationalUnit.count({ where: { deletedAt: null } }),
    prisma.assetRequest.count({ where: { status: { in: ["PENDING_DEPARTMENT_HEAD", "APPROVED_BY_DEPARTMENT_HEAD"] } } }),
    prisma.maintenance.count({ where: { status: { in: ["PENDING", "IN_PROGRESS"] } } }),
  ]);

  // 2. Fetch Assets and Maintenance logs for calculations
  const allAssets = await prisma.asset.findMany({
    where: { deletedAt: null },
    include: {
      category: true,
      department: true,
      maintenances: {
        select: {
          cost: true,
          maintenanceCost: true,
          completedAt: true,
          createdAt: true
        }
      }
    }
  });

  let totalAssetValue = 0;
  let currentBookValue = 0;
  let totalDepreciation = 0;
  let totalSalvageValue = 0;
  let totalMaintenanceCostVal = 0;
  let totalAssetInvestment = 0;
  let financiallyValuedCount = 0;
  let warrantyExpiringCount = 0;
  let expiredAssetsCount = 0;
  let endOfLifeCount = 0;

  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // Group maps for charts
  const deptValueMap: Record<string, number> = {};
  const catValueMap: Record<string, number> = {};
  const fundingSourceMap: Record<string, number> = {};
  const annualPurchaseMap: Record<string, number> = {};
  const annualMaintMap: Record<string, number> = {};
  const deprTrendMap: Record<string, { bookValue: number; accumDep: number; count: number }> = {};

  allAssets.forEach((a) => {
    // Single source of truth calculation for live as-of-date valuation
    const fin = calculateSingleAssetFinancials(a, now);

    // Maintenance costs are tracked across all completed records
    totalMaintenanceCostVal += fin.totalMaintenanceCost;

    // Disposed assets are derecognized from the active capital balance sheet
    const isDisposed = a.status === "DISPOSED";

    if (!isDisposed) {
      totalAssetValue += fin.cost;
      currentBookValue += fin.currentBookValue;
      totalDepreciation += fin.accumulatedDepreciation;
      totalSalvageValue += fin.salvageValue;
      if (fin.isFinanciallyValued) {
        financiallyValuedCount++;
      }

      // Grouping by department
      const deptName = a.department?.name || "Unknown";
      deptValueMap[deptName] = (deptValueMap[deptName] || 0) + fin.cost;

      // Grouping by category
      const catName = a.category?.name || "Unknown";
      catValueMap[catName] = (catValueMap[catName] || 0) + fin.cost;

      // Grouping by funding source
      if (a.fundingSource) {
        const sourceStr = String(a.fundingSource).replace(/_/g, " ");
        fundingSourceMap[sourceStr] = (fundingSourceMap[sourceStr] || 0) + fin.cost;
      } else {
        fundingSourceMap["UNSPECIFIED"] = (fundingSourceMap["UNSPECIFIED"] || 0) + fin.cost;
      }

      // Grouping annual purchases by purchaseDate year
      if (a.purchaseDate) {
        const pDate = a.purchaseDate instanceof Date ? a.purchaseDate : new Date(a.purchaseDate);
        if (!isNaN(pDate.getTime())) {
          const pYear = pDate.getFullYear().toString();
          annualPurchaseMap[pYear] = (annualPurchaseMap[pYear] || 0) + fin.cost;

          // Depreciation trend over purchase years
          if (!deprTrendMap[pYear]) {
            deprTrendMap[pYear] = { bookValue: 0, accumDep: 0, count: 0 };
          }
          deprTrendMap[pYear].bookValue += fin.currentBookValue;
          deprTrendMap[pYear].accumDep += fin.accumulatedDepreciation;
          deprTrendMap[pYear].count += 1;
        }
      }
    }

    // Check warranty status
    const isExpired = (a.warrantyEndDate && a.warrantyEndDate <= now) || (a.warrantyExpiry && a.warrantyExpiry <= now);
    if (isExpired) {
      expiredAssetsCount++;
    } else if ((a.warrantyEndDate && a.warrantyEndDate > now && a.warrantyEndDate <= thirtyDaysFromNow) || 
               (a.warrantyExpiry && a.warrantyExpiry > now && a.warrantyExpiry <= thirtyDaysFromNow)) {
      warrantyExpiringCount++;
    }

    // Check useful life limit (end of useful life reached)
    if (fin.isFullyDepreciated && fin.cost > 0 && !isDisposed) {
      endOfLifeCount++;
    }

    // Grouping annual maintenance cost by maintenance date/createdAt year
    a.maintenances.forEach((m) => {
      const mDate = m.completedAt || m.createdAt;
      const mYear = new Date(mDate).getFullYear().toString();
      const c = m.maintenanceCost ? Number(m.maintenanceCost) : (m.cost ? Number(m.cost) : 0);
      annualMaintMap[mYear] = (annualMaintMap[mYear] || 0) + c;
    });
  });

  // Total Capital Investment = Acquisition Cost of Active Inventory + Maintenance
  totalAssetInvestment = Math.round((totalAssetValue + totalMaintenanceCostVal) * 100) / 100;
  totalAssetValue = Math.round(totalAssetValue * 100) / 100;
  currentBookValue = Math.round(currentBookValue * 100) / 100;
  totalDepreciation = Math.round(totalDepreciation * 100) / 100;
  totalSalvageValue = Math.round(totalSalvageValue * 100) / 100;
  totalMaintenanceCostVal = Math.round(totalMaintenanceCostVal * 100) / 100;

  // Format charts datasets (sorted descending by value)
  const deptChartData = Object.entries(deptValueMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
  const catChartData = Object.entries(catValueMap)
    .map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => b.value - a.value);
  const fundingChartData = Object.entries(fundingSourceMap).map(([name, value]) => ({ name, value: Math.round(value * 100) / 100 }));
  const purchaseChartData = Object.entries(annualPurchaseMap)
    .map(([year, value]) => ({ name: year, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const maintChartData = Object.entries(annualMaintMap)
    .map(([year, value]) => ({ name: year, value: Math.round(value * 100) / 100 }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const depreciationTrendData = Object.entries(deprTrendMap)
    .map(([year, data]) => ({
      name: year,
      bookValue: Math.round(data.bookValue * 100) / 100,
      accumulatedDepreciation: Math.round(data.accumDep * 100) / 100
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    totalAssetValue,
    currentBookValue,
    totalDepreciation,
    totalSalvageValue,
    totalMaintenanceCost: totalMaintenanceCostVal,
    totalAssetInvestment,
    financiallyValuedCount,
    warrantyExpiringCount,
    expiredAssetsCount,
    endOfLifeCount,
    totalAssetsCount: allAssets.length,
    activeAssetsCount: allAssets.filter((a) => a.status === "ACTIVE").length,
    assignedAssetsCount: allAssets.filter((a) => a.status === "ASSIGNED").length,
    pendingRequestsCount,
    maintenanceCount,
    totalUsers,
    totalDepartments
  };

  return (
    <div className="space-y-6">
      {/* Header section */}
      <div className="flex items-center justify-between border-b border-sky-100 pb-4 bg-sky-950/5 -mx-6 -mt-6 p-6">
        <div>
          <h2 className="text-xl font-bold text-sky-900">FINANCIAL CONTROL TOWER</h2>
          <p className="text-xs text-sky-650 font-semibold mt-1">University Assets Valuation, Depreciations & Maintenance Summary</p>
        </div>
      </div>

      <DashboardFinancialClient
        stats={stats}
        deptChartData={deptChartData}
        catChartData={catChartData}
        fundingChartData={fundingChartData}
        purchaseChartData={purchaseChartData}
        maintChartData={maintChartData}
        depreciationTrendData={depreciationTrendData}
      />
    </div>
  );
}
