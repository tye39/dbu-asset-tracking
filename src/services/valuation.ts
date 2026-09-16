import { prisma } from "@/lib/db";

interface ValuationResult {
  originalCost: number;
  currentValue: number;
  totalDepreciation: number;
  salvageValue: number;
  lifecycleProgressPercent: number;
}

/**
 * Calculates Straight-Line depreciation metrics for a given asset.
 */
export function calculateDepreciation(
  procurementCost: number | null,
  purchaseDate: Date | null,
  expectedLifecycleYears: number | null,
  salvageValueInput: number | null
): ValuationResult {
  const cost = procurementCost || 0;
  const salvage = salvageValueInput || 0;
  const lifecycleYears = expectedLifecycleYears || 5;

  if (cost === 0 || !purchaseDate) {
    return {
      originalCost: cost,
      currentValue: cost,
      totalDepreciation: 0,
      salvageValue: salvage,
      lifecycleProgressPercent: 0,
    };
  }

  const now = new Date();
  const monthsDiff = (now.getFullYear() - purchaseDate.getFullYear()) * 12 + (now.getMonth() - purchaseDate.getMonth());
  const yearsAge = Math.max(0, monthsDiff / 12);

  const annualDepreciation = Math.max(0, (cost - salvage) / lifecycleYears);
  const totalDepr = Math.min(cost - salvage, annualDepreciation * yearsAge);
  const currentVal = Math.max(salvage, cost - totalDepr);

  const progressPercent = Math.min(100, Math.round((yearsAge / lifecycleYears) * 100));

  return {
    originalCost: cost,
    currentValue: Number(currentVal.toFixed(2)),
    totalDepreciation: Number(totalDepr.toFixed(2)),
    salvageValue: salvage,
    lifecycleProgressPercent: progressPercent,
  };
}

interface ReplacementScoreResult {
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
        select: { cost: true },
      },
    },
  });

  if (!asset) {
    return { score: 0, reason: "Asset not found.", recommendation: "KEEP" };
  }

  const cost = asset.procurementCost ? Number(asset.procurementCost) : 0;
  const purchaseDate = asset.purchaseDate;
  const lifecycleYears = asset.expectedLifecycleYears || 5;

  let ageScore = 0;
  let deprScore = 0;
  let repairScore = 0;
  let conditionScore = 0;

  // 1. Age Factor (Max 30 points)
  if (purchaseDate) {
    const yearsAge = (new Date().getTime() - purchaseDate.getTime()) / (1000 * 60 * 60 * 24 * 365.25);
    const ageRatio = Math.min(1.5, yearsAge / lifecycleYears);
    ageScore = ageRatio * 30; // Max 45, capped later at total
  }

  // 2. Depreciation / Value Factor (Max 20 points)
  if (cost > 0 && purchaseDate) {
    const metrics = calculateDepreciation(cost, purchaseDate, lifecycleYears, asset.salvageValue ? Number(asset.salvageValue) : 0);
    deprScore = (metrics.totalDepreciation / cost) * 20;
  }

  // 3. Repair Costs Factor (Max 25 points)
  const totalRepairCost = asset.maintenances.reduce((acc, curr) => acc + (curr.cost ? Number(curr.cost) : 0), 0);
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
