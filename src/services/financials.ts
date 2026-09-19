import { PrismaClient, RoleName, Prisma } from "@prisma/client";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

export type DepreciationStatus =
  | "NOT_STARTED"
  | "DEPRECIATING"
  | "FULLY_DEPRECIATED"
  | "NO_COST"
  | "NO_PURCHASE_DATE"
  | "NO_USEFUL_LIFE"
  | "FUTURE_PURCHASE";

export interface AssetFinancialInput {
  id?: string;
  purchaseCost?: unknown;
  procurementCost?: unknown;
  salvageValue?: unknown;
  usefulLife?: unknown;
  expectedLifecycleYears?: unknown;
  purchaseDate?: Date | string | null;
  status?: string | null;
  maintenances?: Array<{
    cost?: unknown;
    maintenanceCost?: unknown;
    status?: string;
  }> | null;
}

export interface AssetFinancialResult {
  cost: number;
  salvageValue: number;
  depreciableBase: number;
  usefulLifeYears: number;
  usefulLifeMonths: number;
  annualDepreciation: number;
  monthlyDepreciation: number;
  elapsedMonths: number;
  clampedMonths: number;
  accumulatedDepreciation: number;
  currentBookValue: number;
  depreciationProgressPercent: number;
  depreciationStatus: DepreciationStatus;
  statusLabel: string;
  totalMaintenanceCost: number;
  totalAssetInvestment: number;
  isFullyDepreciated: boolean;
  isFinanciallyValued: boolean;
}

/**
 * Defensive number sanitizer that protects against NaN, Infinity, -0, and non-numeric values.
 */
export function safeNumber(val: unknown, defaultVal = 0): number {
  if (val === null || val === undefined) return defaultVal;
  if (typeof val === "object" && val !== null && "toNumber" in val && typeof (val as { toNumber: () => number }).toNumber === "function") {
    try {
      const num = (val as { toNumber: () => number }).toNumber();
      return isNaN(num) || !isFinite(num) ? defaultVal : num;
    } catch {
      return defaultVal;
    }
  }
  const n = Number(val);
  return isNaN(n) || !isFinite(n) ? defaultVal : n;
}

/**
 * Consistent Ethiopian Birr (ETB) currency formatter
 */
export function formatCurrencyETB(amount: unknown): string {
  const n = safeNumber(amount, 0);
  return `ETB ${n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
}

/**
 * Pure calculation function for single asset financial metrics.
 * Single source of truth for Straight-Line Depreciation and Carrying Value.
 */
export function calculateSingleAssetFinancials(
  asset: AssetFinancialInput,
  asOfDate: Date = new Date()
): AssetFinancialResult {
  // 1. Resolve Acquisition Cost (Priority: purchaseCost -> procurementCost)
  let rawCost = 0;
  if (asset.purchaseCost !== undefined && asset.purchaseCost !== null) {
    rawCost = safeNumber(asset.purchaseCost, 0);
  } else if (asset.procurementCost !== undefined && asset.procurementCost !== null) {
    rawCost = safeNumber(asset.procurementCost, 0);
  }
  const cost = Math.max(0, Math.round(rawCost * 100) / 100);

  // 2. Resolve Salvage Value (Must be positive and never exceed Purchase Cost)
  let rawSalvage = safeNumber(asset.salvageValue, 0);
  rawSalvage = Math.max(0, Math.round(rawSalvage * 100) / 100);
  const salvageValue = Math.min(cost, rawSalvage);

  // 3. Depreciable Base = max(0, Purchase Cost - Salvage Value)
  const depreciableBase = Math.max(0, Math.round((cost - salvageValue) * 100) / 100);

  // 4. Resolve Useful Life (Priority: usefulLife -> expectedLifecycleYears)
  let usefulLifeYears = 0;
  if (asset.usefulLife !== undefined && asset.usefulLife !== null && safeNumber(asset.usefulLife, 0) > 0) {
    usefulLifeYears = safeNumber(asset.usefulLife, 0);
  } else if (asset.expectedLifecycleYears !== undefined && asset.expectedLifecycleYears !== null && safeNumber(asset.expectedLifecycleYears, 0) > 0) {
    usefulLifeYears = safeNumber(asset.expectedLifecycleYears, 0);
  }
  const usefulLifeMonths = usefulLifeYears > 0 ? Math.max(1, Math.round(usefulLifeYears * 12)) : 0;

  // 5. Total Maintenance Cost
  const totalMaintenanceCost = (asset.maintenances || []).reduce((sum, record) => {
    const c = record.maintenanceCost !== undefined && record.maintenanceCost !== null
      ? safeNumber(record.maintenanceCost, 0)
      : safeNumber(record.cost, 0);
    return sum + c;
  }, 0);
  const totalAssetInvestment = Math.round((cost + totalMaintenanceCost) * 100) / 100;

  // Check if asset has valid financial acquisition cost
  const isFinanciallyValued = cost > 0;

  // 6. Resolve Purchase Date
  let purchaseDateObj: Date | null = null;
  if (asset.purchaseDate) {
    const candidate = asset.purchaseDate instanceof Date ? asset.purchaseDate : new Date(asset.purchaseDate);
    if (!isNaN(candidate.getTime())) {
      purchaseDateObj = candidate;
    }
  }

  // Edge Case A: Cost is zero or not set
  if (cost === 0) {
    return {
      cost: 0,
      salvageValue: 0,
      depreciableBase: 0,
      usefulLifeYears,
      usefulLifeMonths,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      elapsedMonths: 0,
      clampedMonths: 0,
      accumulatedDepreciation: 0,
      currentBookValue: 0,
      depreciationProgressPercent: 0,
      depreciationStatus: "NO_COST",
      statusLabel: "No Cost Logged",
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalAssetInvestment: Math.round(totalMaintenanceCost * 100) / 100,
      isFullyDepreciated: false,
      isFinanciallyValued: false,
    };
  }

  // Edge Case B: Missing or invalid useful life (null, 0, or negative)
  if (usefulLifeYears <= 0) {
    return {
      cost,
      salvageValue,
      depreciableBase,
      usefulLifeYears: 0,
      usefulLifeMonths: 0,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      elapsedMonths: 0,
      clampedMonths: 0,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      depreciationProgressPercent: 0,
      depreciationStatus: "NO_USEFUL_LIFE",
      statusLabel: "No Useful Life",
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalAssetInvestment,
      isFullyDepreciated: false,
      isFinanciallyValued,
    };
  }

  // Edge Case B: Missing or invalid purchase date
  if (!purchaseDateObj) {
    return {
      cost,
      salvageValue,
      depreciableBase,
      usefulLifeYears,
      usefulLifeMonths,
      annualDepreciation: 0,
      monthlyDepreciation: 0,
      elapsedMonths: 0,
      clampedMonths: 0,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      depreciationProgressPercent: 0,
      depreciationStatus: "NO_PURCHASE_DATE",
      statusLabel: "No Purchase Date",
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalAssetInvestment,
      isFullyDepreciated: false,
      isFinanciallyValued: true,
    };
  }

  // Edge Case C: Future purchase date
  if (purchaseDateObj > asOfDate) {
    return {
      cost,
      salvageValue,
      depreciableBase,
      usefulLifeYears,
      usefulLifeMonths,
      annualDepreciation: Math.round((depreciableBase / usefulLifeYears) * 100) / 100,
      monthlyDepreciation: Math.round((depreciableBase / usefulLifeMonths) * 100) / 100,
      elapsedMonths: 0,
      clampedMonths: 0,
      accumulatedDepreciation: 0,
      currentBookValue: cost,
      depreciationProgressPercent: 0,
      depreciationStatus: "FUTURE_PURCHASE",
      statusLabel: "Future Acquisition",
      totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
      totalAssetInvestment,
      isFullyDepreciated: false,
      isFinanciallyValued: true,
    };
  }

  // 7. Calculate Elapsed Time (Month granularity)
  const elapsedYears = asOfDate.getFullYear() - purchaseDateObj.getFullYear();
  const rawMonths = (asOfDate.getMonth() - purchaseDateObj.getMonth()) + (elapsedYears * 12);
  const elapsedMonths = Math.max(0, rawMonths);

  // Clamp elapsed months to [0, usefulLifeMonths]
  const clampedMonths = Math.min(elapsedMonths, usefulLifeMonths);

  // 8. Straight-Line Calculations
  const rawAnnual = depreciableBase / usefulLifeYears;
  const rawMonthly = depreciableBase / usefulLifeMonths;
  const annualDepreciation = Math.round(rawAnnual * 100) / 100;
  const monthlyDepreciation = Math.round(rawMonthly * 100) / 100;

  // Accumulated depreciation strictly capped at depreciableBase
  const rawAccumulated = rawMonthly * clampedMonths;
  let accumulatedDepreciation = Math.min(depreciableBase, Math.round(rawAccumulated * 100) / 100);
  if (clampedMonths >= usefulLifeMonths) {
    accumulatedDepreciation = depreciableBase; // Exact match at end of life
  }

  // Current Book Value strictly floored at salvageValue and capped at cost
  const rawBookValue = cost - accumulatedDepreciation;
  const currentBookValue = Math.max(salvageValue, Math.min(cost, Math.round(rawBookValue * 100) / 100));

  // Progress percentage [0 - 100%]
  const depreciationProgressPercent = usefulLifeMonths > 0
    ? Math.min(100, Math.round((clampedMonths / usefulLifeMonths) * 100))
    : 0;

  // Determine depreciation status
  let depreciationStatus: DepreciationStatus = "DEPRECIATING";
  let statusLabel = "Depreciating";

  if (clampedMonths >= usefulLifeMonths || currentBookValue <= salvageValue) {
    depreciationStatus = "FULLY_DEPRECIATED";
    statusLabel = "Fully Depreciated";
  } else if (clampedMonths === 0) {
    depreciationStatus = "NOT_STARTED";
    statusLabel = "Not Started";
  }

  const isFullyDepreciated = depreciationStatus === "FULLY_DEPRECIATED";

  return {
    cost,
    salvageValue,
    depreciableBase,
    usefulLifeYears,
    usefulLifeMonths,
    annualDepreciation,
    monthlyDepreciation,
    elapsedMonths,
    clampedMonths,
    accumulatedDepreciation,
    currentBookValue,
    depreciationProgressPercent,
    depreciationStatus,
    statusLabel,
    totalMaintenanceCost: Math.round(totalMaintenanceCost * 100) / 100,
    totalAssetInvestment,
    isFullyDepreciated,
    isFinanciallyValued: true,
  };
}

/**
 * Automatically recalculates and persists financial statistics for a specific asset
 * Runs within a Prisma Transaction context.
 */
export async function calculateAssetFinancials(
  tx: PrismaTx,
  assetId: string,
  asOfDate: Date = new Date()
) {
  const asset = await tx.asset.findUnique({
    where: { id: assetId },
    include: {
      maintenances: true
    }
  });

  if (!asset) return null;

  // Use the single source of truth calculation
  const metrics = calculateSingleAssetFinancials(asset, asOfDate);

  // Proactive Alerts: End of useful life reached
  if (metrics.isFullyDepreciated && metrics.cost > 0) {
    await createFinancialNotification(
      tx,
      `Asset ${asset.assetCode} End of Useful Life`,
      `Asset "${asset.name}" (${asset.assetCode}) has reached the end of its useful life of ${metrics.usefulLifeYears} years.`
    );
  }

  // Proactive Alerts: Warranty Expiration Check
  if (asset.warrantyEndDate) {
    const thirtyDaysFromNow = new Date(asOfDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (asset.warrantyEndDate > asOfDate && asset.warrantyEndDate <= thirtyDaysFromNow) {
      await createFinancialNotification(
        tx,
        `Warranty Expiring Soon: ${asset.assetCode}`,
        `Warranty for asset "${asset.name}" (${asset.assetCode}) expires on ${asset.warrantyEndDate.toLocaleDateString()}.`
      );
    }
  }

  // Save updated financial values back to Asset table as valid Prisma.Decimal
  const updatedAsset = await tx.asset.update({
    where: { id: assetId },
    data: {
      annualDepreciation: new Prisma.Decimal(metrics.annualDepreciation.toFixed(2)),
      monthlyDepreciation: new Prisma.Decimal(metrics.monthlyDepreciation.toFixed(2)),
      accumulatedDepreciation: new Prisma.Decimal(metrics.accumulatedDepreciation.toFixed(2)),
      currentBookValue: new Prisma.Decimal(metrics.currentBookValue.toFixed(2)),
      totalMaintenanceCost: new Prisma.Decimal(metrics.totalMaintenanceCost.toFixed(2)),
      totalAssetInvestment: new Prisma.Decimal(metrics.totalAssetInvestment.toFixed(2))
    }
  });

  return updatedAsset;
}

/**
 * Batch synchronization to heal and recalculate all active/non-deleted assets in the database.
 * Completely eliminates any stored 'NaN' or null financial values without deleting or resetting records.
 */
export async function syncAllAssetsFinancials(tx: PrismaTx, asOfDate: Date = new Date()) {
  const assets = await tx.asset.findMany({
    where: { deletedAt: null },
    include: {
      maintenances: true
    }
  });

  const updatedAssets = [];
  for (const asset of assets) {
    const metrics = calculateSingleAssetFinancials(asset, asOfDate);
    const updated = await tx.asset.update({
      where: { id: asset.id },
      data: {
        annualDepreciation: new Prisma.Decimal(metrics.annualDepreciation.toFixed(2)),
        monthlyDepreciation: new Prisma.Decimal(metrics.monthlyDepreciation.toFixed(2)),
        accumulatedDepreciation: new Prisma.Decimal(metrics.accumulatedDepreciation.toFixed(2)),
        currentBookValue: new Prisma.Decimal(metrics.currentBookValue.toFixed(2)),
        totalMaintenanceCost: new Prisma.Decimal(metrics.totalMaintenanceCost.toFixed(2)),
        totalAssetInvestment: new Prisma.Decimal(metrics.totalAssetInvestment.toFixed(2))
      }
    });
    updatedAssets.push(updated);
  }

  return updatedAssets;
}

/**
 * Creates financial alert notifications for System Administrators & Asset Managers
 */
async function createFinancialNotification(tx: PrismaTx, title: string, message: string) {
  // Prevent duplicate notifications in the last 24 hours
  const recent = await tx.notification.findFirst({
    where: {
      title,
      createdAt: {
        gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
      }
    }
  });

  if (recent) return;

  const admins = await tx.user.findMany({
    where: {
      role: {
        name: {
          in: [RoleName.SYSTEM_ADMINISTRATOR, RoleName.PROPERTY_ADMINISTRATION_OFFICER]
        }
      }
    }
  });

  for (const admin of admins) {
    await tx.notification.create({
      data: {
        userId: admin.id,
        title,
        message,
        isRead: false
      }
    });
  }
}

/**
 * Scans all assets for expiring warranties and end of useful lives, generating system alerts
 */
export async function scanAndGenerateFinancialAlerts(tx: PrismaTx) {
  const now = new Date();
  const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  // 1. Scan Expiring Warranties (ending in next 30 days)
  const expiringWarranties = await tx.asset.findMany({
    where: {
      deletedAt: null,
      warrantyEndDate: {
        gt: now,
        lte: thirtyDaysFromNow
      }
    }
  });

  for (const asset of expiringWarranties) {
    await createFinancialNotification(
      tx,
      `Warranty Expiring Soon: ${asset.assetCode}`,
      `Warranty for asset "${asset.name}" (${asset.assetCode}) expires on ${asset.warrantyEndDate?.toLocaleDateString()}.`
    );
  }

  // 2. Scan Fully Depreciated / End of Useful Life Assets
  const activeAssets = await tx.asset.findMany({
    where: {
      deletedAt: null,
      OR: [
        { purchaseCost: { gt: 0 } },
        { procurementCost: { gt: 0 } }
      ],
      purchaseDate: { not: null }
    }
  });

  for (const asset of activeAssets) {
    const metrics = calculateSingleAssetFinancials(asset, now);

    if (metrics.isFullyDepreciated) {
      await createFinancialNotification(
        tx,
        `Asset ${asset.assetCode} End of Useful Life`,
        `Asset "${asset.name}" (${asset.assetCode}) has reached the end of its useful life of ${metrics.usefulLifeYears} years.`
      );

      if (metrics.currentBookValue <= metrics.salvageValue) {
        await createFinancialNotification(
          tx,
          `Asset ${asset.assetCode} Fully Depreciated`,
          `Asset "${asset.name}" (${asset.assetCode}) has reached its salvage value (${formatCurrencyETB(metrics.salvageValue)}) and is now fully depreciated.`
        );
      }
    }
  }
}
