import { prisma } from "@/lib/db";
import { calculateSingleAssetFinancials } from "@/services/financials";

export interface ValuationResult {
  originalCost: number;
  currentValue: number;
  totalDepreciation: number;
  salvageValue: number;
  lifecycleProgressPercent: number;
}

/**
 * Calculates Straight-Line depreciation metrics for a given asset.
 * Delegates directly to calculateSingleAssetFinancials as the single source of truth.
 */
export function calculateDepreciation(
  procurementCost: number | null,
  purchaseDate: Date | null,
  expectedLifecycleYears: number | null,
  salvageValueInput: number | null
): ValuationResult {
  const result = calculateSingleAssetFinancials({
    purchaseCost: procurementCost,
    procurementCost,
    salvageValue: salvageValueInput,
    expectedLifecycleYears,
    purchaseDate,
  });

  return {
    originalCost: result.cost,
    currentValue: result.currentBookValue,
    totalDepreciation: result.accumulatedDepreciation,
    salvageValue: result.salvageValue,
    lifecycleProgressPercent: result.depreciationProgressPercent,
  };
}

export interface ReplacementScoreResult {
  score: number; // 0 to 100
  reason: string;
  recommendation: "KEEP" | "MONITOR" | "REPLACE";
}

/**
 * Calculates replacement planning priority score based on age, depreciation, repair cost, and condition.
 */
export async function calculateReplacementScore(assetId: string): Promise<ReplacementScoreResult> {
  const asset = await prisma.asset.findUnique({
    where: { id: assetId },
    include: {
      maintenances: {
        where: { status: "COMPLETED" },
        select: { cost: true, maintenanceCost: true },
      },
    },
  });

  if (!asset) {
    return { score: 0, reason: "Asset not found.", recommendation: "KEEP" };
  }

  const cost = asset.purchaseCost ? Number(asset.purchaseCost) : (asset.procurementCost ? Number(asset.procurementCost) : 0);
  const purchaseDate = asset.purchaseDate;
  const lifecycleYears = asset.usefulLife || asset.expectedLifecycleYears || 5;

  let ageScore = 0;
  let deprScore = 0;
  let repairScore = 0;
  let conditionScore = 0;

  // 1. Age Factor (Max 30 points)
  const isValidPurchaseDate = purchaseDate instanceof Date && !isNaN(purchaseDate.getTime());
  if (isValidPurchaseDate) {
    const yearsAge = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const ageRatio = lifecycleYears > 0 ? Math.min(1.5, Math.max(0, yearsAge) / lifecycleYears) : 0;
    ageScore = ageRatio * 30;
  }

  // 2. Depreciation / Value Factor (Max 20 points)
  if (cost > 0 && isValidPurchaseDate) {
    const metrics = calculateSingleAssetFinancials(asset);
    deprScore = cost > 0 ? (metrics.accumulatedDepreciation / cost) * 20 : 0;
  }

  // 3. Repair Costs Factor (Max 25 points)
  const totalRepairCost = asset.maintenances.reduce((acc, curr) => {
    const c = curr.maintenanceCost ? Number(curr.maintenanceCost) : (curr.cost ? Number(curr.cost) : 0);
    return acc + c;
  }, 0);
  if (cost > 0 && totalRepairCost > 0) {
    const repairRatio = totalRepairCost / cost;
    repairScore = Math.min(1.0, repairRatio) * 25;
  }

  // 4. Condition Factor (Max 25 points)
  if (asset.status === "UNDER_MAINTENANCE") {
    conditionScore = 20;
  } else if (asset.status === "DISPOSED") {
    conditionScore = 25;
  }

  const totalScore = Math.min(100, Math.round(ageScore + deprScore + repairScore + conditionScore));

  let recommendation: "KEEP" | "MONITOR" | "REPLACE" = "KEEP";
  let reason = "Asset is in good condition and within its standard operational lifecycle.";

  if (totalScore >= 75) {
    recommendation = "REPLACE";
    reason = "Critical replacement recommended: high cumulative repair costs and/or exceeded operational lifecycle.";
  } else if (totalScore >= 45) {
    recommendation = "MONITOR";
    reason = "Monitor condition: asset is showing moderate depreciation and wear.";
  }

  return {
    score: totalScore,
    reason,
    recommendation,
  };
}
