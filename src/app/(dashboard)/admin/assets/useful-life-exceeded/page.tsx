import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { AdminFilteredAssetsClient, FilteredAssetItem } from "@/components/admin-filtered-assets-client";

export const revalidate = 0;

export default async function UsefulLifeExceededAssetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    redirect("/");
  }

  const now = new Date();

  // Fetch all active/non-deleted assets that have a purchaseDate
  const allAssets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      purchaseDate: { not: null }
    },
    include: {
      category: true,
      department: true
    }
  });

  const matchingAssets: FilteredAssetItem[] = [];

  allAssets.forEach((a) => {
    if (!a.purchaseDate) return;
    const cost = a.purchaseCost ? Number(a.purchaseCost) : (a.procurementCost ? Number(a.procurementCost) : 0);
    if (cost <= 0) return;

    const toSafeDateStr = (val: Date | string | null | undefined) => {
      if (!val) return null;
      try {
        const d = val instanceof Date ? val : new Date(val);
        return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
      } catch {
        return null;
      }
    };

    const useful = a.usefulLife || a.expectedLifecycleYears || 5;
    const pDate = new Date(a.purchaseDate);
    if (isNaN(pDate.getTime())) return;
    const elapsedYears = now.getFullYear() - pDate.getFullYear();
    const elapsedMonths = (now.getMonth() - pDate.getMonth()) + (elapsedYears * 12);

    if (elapsedMonths >= (useful * 12)) {
      const overMonths = elapsedMonths - (useful * 12);
      const overYears = Math.floor(overMonths / 12);
      const remainingMonths = overMonths % 12;

      let highlightDetail = "Useful life limit reached";
      if (overYears > 0 || remainingMonths > 0) {
        highlightDetail = `Exceeded by ${overYears > 0 ? `${overYears} yr ` : ""}${remainingMonths} mo`;
      }

      const wEndDate = a.warrantyEndDate || a.warrantyExpiry;
      const wStartDate = a.warrantyStartDate;

      matchingAssets.push({
        id: a.id,
        assetCode: a.assetCode,
        name: a.name,
        category: a.category?.name || "Uncategorized",
        department: a.department?.name || "Unassigned",
        status: a.status,
        purchaseCost: cost,
        purchaseDate: toSafeDateStr(a.purchaseDate) || "",
        warrantyStartDate: toSafeDateStr(wStartDate),
        warrantyEndDate: toSafeDateStr(wEndDate),
        usefulLifeYears: useful,
        elapsedMonths,
        highlightDetail
      });
    }
  });

  // Sort by most exceeded (highest elapsedMonths) first
  matchingAssets.sort((a, b) => b.elapsedMonths - a.elapsedMonths);

  return (
    <AdminFilteredAssetsClient
      title="Useful Life Exceeded Assets"
      description="University assets whose chronological age has surpassed their defined accounting useful life"
      badgeLabel="Exceeded"
      badgeColor="indigo"
      type="USEFUL_LIFE_EXCEEDED"
      assets={matchingAssets}
    />
  );
}
