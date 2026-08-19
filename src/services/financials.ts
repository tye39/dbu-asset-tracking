import { PrismaClient, RoleName, Prisma } from "@prisma/client";

type PrismaTx = Omit<
  PrismaClient,
  "$connect" | "$disconnect" | "$on" | "$transaction" | "$use" | "$extends"
>;

/**
 * Automatically recalculates financial statistics for a specific asset (Depreciation, Maintenance, Investment)
 * Runs within a Prisma Transaction context.
 */
export async function calculateAssetFinancials(tx: PrismaTx, assetId: string) {
  const asset = await tx.asset.findUnique({
    where: { id: assetId },
    include: {
      maintenances: true
    }
  });

  if (!asset) return null;

  // 1. Calculate Total Maintenance Cost
  const totalMaint = asset.maintenances.reduce((sum, record) => {
    const costNum = record.maintenanceCost ? Number(record.maintenanceCost) : (record.cost ? Number(record.cost) : 0);
    return sum + costNum;
  }, 0);

  const purchaseCostNum = asset.purchaseCost ? Number(asset.purchaseCost) : (asset.procurementCost ? Number(asset.procurementCost) : 0);
  const salvageValueNum = asset.salvageValue ? Number(asset.salvageValue) : 0;
  const usefulLifeNum = asset.usefulLife ? Number(asset.usefulLife) : (asset.expectedLifecycleYears ? Number(asset.expectedLifecycleYears) : 5);
  const purchaseDate = asset.purchaseDate;

  let annualDep = new Prisma.Decimal(0);
  let monthlyDep = new Prisma.Decimal(0);
  let accumDep = new Prisma.Decimal(0);
  let bookValue = new Prisma.Decimal(purchaseCostNum);

  // 2. Calculate Straight-Line Depreciation
  if (purchaseCostNum > 0 && usefulLifeNum > 0 && purchaseDate) {
    const rawAnnual = (purchaseCostNum - salvageValueNum) / usefulLifeNum;
    const rawMonthly = rawAnnual / 12;

    const now = new Date();
    const elapsedYears = now.getFullYear() - purchaseDate.getFullYear();
    const elapsedMonths = (now.getMonth() - purchaseDate.getMonth()) + (elapsedYears * 12);

    // Clamp elapsed months to [0, usefulLife * 12]
    const clampedMonths = Math.max(0, Math.min(elapsedMonths, usefulLifeNum * 12));

    const rawAccum = rawMonthly * clampedMonths;
    const rawBook = purchaseCostNum - rawAccum;

    annualDep = new Prisma.Decimal(rawAnnual);
    monthlyDep = new Prisma.Decimal(rawMonthly);
    accumDep = new Prisma.Decimal(rawAccum);
    bookValue = new Prisma.Decimal(Math.max(salvageValueNum, rawBook));

    // 3. Proactive Alerts: End of useful life reached
    if (elapsedMonths >= (usefulLifeNum * 12)) {
      await createFinancialNotification(
        tx,
        `Asset ${asset.assetCode} End of Useful Life`,
        `Asset "${asset.name}" (${asset.assetCode}) has reached the end of its useful life of ${usefulLifeNum} years.`
      );
    }
  }

  // 4. Proactive Alerts: Warranty Expiration Check
  if (asset.warrantyEndDate) {
    const now = new Date();
    const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    if (asset.warrantyEndDate > now && asset.warrantyEndDate <= thirtyDaysFromNow) {
      await createFinancialNotification(
        tx,
        `Warranty Expiring Soon: ${asset.assetCode}`,
        `Warranty for asset "${asset.name}" (${asset.assetCode}) expires on ${asset.warrantyEndDate.toLocaleDateString()}.`
      );
    }
  }

  const totalInvestment = purchaseCostNum + totalMaint;

  // 5. Save updated financial values back to Asset table
  const updatedAsset = await tx.asset.update({
    where: { id: assetId },
    data: {
      annualDepreciation: annualDep,
      monthlyDepreciation: monthlyDep,
      accumulatedDepreciation: accumDep,
      currentBookValue: bookValue,
      totalMaintenanceCost: new Prisma.Decimal(totalMaint),
      totalAssetInvestment: new Prisma.Decimal(totalInvestment)
    }
  });

  return updatedAsset;
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
      purchaseCost: { gt: 0 },
      purchaseDate: { not: null }
    }
  });

  for (const asset of activeAssets) {
    const cost = Number(asset.purchaseCost);
    const salvage = Number(asset.salvageValue || 0);
    const life = asset.usefulLife || asset.expectedLifecycleYears || 5;
    const purchaseDate = asset.purchaseDate!;

    const elapsedYears = now.getFullYear() - purchaseDate.getFullYear();
    const elapsedMonths = (now.getMonth() - purchaseDate.getMonth()) + (elapsedYears * 12);

    if (elapsedMonths >= (life * 12)) {
      await createFinancialNotification(
        tx,
        `Asset ${asset.assetCode} End of Useful Life`,
        `Asset "${asset.name}" (${asset.assetCode}) has reached the end of its useful life of ${life} years.`
      );
    }

    const monthlyDep = ((cost - salvage) / life) / 12;
    const finalElapsedMonths = Math.max(0, Math.min(elapsedMonths, life * 12));
    const rawBookValue = cost - (finalElapsedMonths * monthlyDep);

    if (rawBookValue <= salvage) {
      await createFinancialNotification(
        tx,
        `Asset ${asset.assetCode} Fully Depreciated`,
        `Asset "${asset.name}" (${asset.assetCode}) has reached its salvage value and is now fully depreciated.`
      );
    }
  }
}
