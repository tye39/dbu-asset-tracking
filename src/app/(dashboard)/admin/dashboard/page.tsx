import React from "react";
import { prisma } from "@/lib/db";
import { DashboardFinancialClient } from "@/components/dashboard-financial-client";
import { scanAndGenerateFinancialAlerts } from "@/services/financials";

export const revalidate = 0;

export default async function AdminDashboardPage() {
  // Trigger scan & generate alerts in background
  prisma.$transaction(async (tx) => {
    await scanAndGenerateFinancialAlerts(tx);
  }).catch((err) => {
    console.error("Failed to run financial alert scans:", err);
  });

  // 1. Fetch count stats
  const [totalUsers, totalDepartments] = await Promise.all([
    prisma.user.count({ where: { deletedAt: null } }),
    prisma.organizationalUnit.count({ where: { deletedAt: null } }),
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
  let totalMaintenanceCostVal = 0;
  let totalAssetInvestment = 0;
  let warrantyExpiringCount = 0;
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
    const cost = a.purchaseCost ? Number(a.purchaseCost) : (a.procurementCost ? Number(a.procurementCost) : 0);
    totalAssetValue += cost;

    const book = a.currentBookValue ? Number(a.currentBookValue) : cost;
    currentBookValue += book;

    const dep = a.accumulatedDepreciation ? Number(a.accumulatedDepreciation) : 0;
    totalDepreciation += dep;

    const maint = a.maintenances.reduce((sum, m) => {
      const c = m.maintenanceCost ? Number(m.maintenanceCost) : (m.cost ? Number(m.cost) : 0);
      return sum + c;
    }, 0);
    totalMaintenanceCostVal += maint;

    const invest = cost + maint;
    totalAssetInvestment += invest;

    // Check warranty status
    if (a.warrantyEndDate && a.warrantyEndDate > now && a.warrantyEndDate <= thirtyDaysFromNow) {
      warrantyExpiringCount++;
    }

    // Check useful life limit
    if (a.purchaseDate && cost > 0) {
      const useful = a.usefulLife || a.expectedLifecycleYears || 5;
      const elapsedYears = now.getFullYear() - a.purchaseDate.getFullYear();
      const elapsedMonths = (now.getMonth() - a.purchaseDate.getMonth()) + (elapsedYears * 12);
      if (elapsedMonths >= (useful * 12)) {
        endOfLifeCount++;
      }
    }

    // Grouping by department
    const deptName = a.department.name || "Unknown";
    deptValueMap[deptName] = (deptValueMap[deptName] || 0) + cost;

    // Grouping by category
    const catName = a.category.name || "Unknown";
    catValueMap[catName] = (catValueMap[catName] || 0) + cost;

    // Grouping by funding source
    if (a.fundingSource) {
      const sourceStr = String(a.fundingSource).replace(/_/g, " ");
      fundingSourceMap[sourceStr] = (fundingSourceMap[sourceStr] || 0) + cost;
    } else {
      fundingSourceMap["UNSPECIFIED"] = (fundingSourceMap["UNSPECIFIED"] || 0) + cost;
    }

    // Grouping annual purchases by purchaseDate year
    if (a.purchaseDate) {
      const pYear = a.purchaseDate.getFullYear().toString();
      annualPurchaseMap[pYear] = (annualPurchaseMap[pYear] || 0) + cost;

      // Depreciation trend over purchase years
      if (!deprTrendMap[pYear]) {
        deprTrendMap[pYear] = { bookValue: 0, accumDep: 0, count: 0 };
      }
      deprTrendMap[pYear].bookValue += book;
      deprTrendMap[pYear].accumDep += dep;
      deprTrendMap[pYear].count += 1;
    }

    // Grouping annual maintenance cost by maintenance date/createdAt year
    a.maintenances.forEach((m) => {
      const mDate = m.completedAt || m.createdAt;
      const mYear = new Date(mDate).getFullYear().toString();
      const c = m.maintenanceCost ? Number(m.maintenanceCost) : (m.cost ? Number(m.cost) : 0);
      annualMaintMap[mYear] = (annualMaintMap[mYear] || 0) + c;
    });
  });

  // Format charts datasets
  const deptChartData = Object.entries(deptValueMap).map(([name, value]) => ({ name, value }));
  const catChartData = Object.entries(catValueMap).map(([name, value]) => ({ name, value }));
  const fundingChartData = Object.entries(fundingSourceMap).map(([name, value]) => ({ name, value }));
  const purchaseChartData = Object.entries(annualPurchaseMap)
    .map(([year, value]) => ({ name: year, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const maintChartData = Object.entries(annualMaintMap)
    .map(([year, value]) => ({ name: year, value }))
    .sort((a, b) => a.name.localeCompare(b.name));
  const depreciationTrendData = Object.entries(deprTrendMap)
    .map(([year, data]) => ({
      name: year,
      bookValue: data.bookValue,
      accumulatedDepreciation: data.accumDep
    }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const stats = {
    totalAssetValue,
    currentBookValue,
    totalDepreciation,
    totalMaintenanceCost: totalMaintenanceCostVal,
    totalAssetInvestment,
    warrantyExpiringCount,
    endOfLifeCount,
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
