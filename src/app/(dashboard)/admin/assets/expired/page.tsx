import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { AdminFilteredAssetsClient, FilteredAssetItem } from "@/components/admin-filtered-assets-client";

export const revalidate = 0;

export default async function ExpiredAssetsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    redirect("/");
  }

  const now = new Date();

  const allAssets = await prisma.asset.findMany({
    where: {
      deletedAt: null,
      OR: [
        { warrantyEndDate: { lte: now } },
        { warrantyExpiry: { lte: now } }
      ]
    },
    include: {
      category: true,
      department: true
    },
    orderBy: {
      warrantyEndDate: "desc"
    }
  });

  const toSafeDateStr = (val: Date | string | null | undefined) => {
    if (!val) return null;
    try {
      const d = val instanceof Date ? val : new Date(val);
      return isNaN(d.getTime()) ? null : d.toISOString().split("T")[0];
    } catch {
      return null;
    }
  };

  const assets: FilteredAssetItem[] = allAssets.map((a) => {
    const cost = a.purchaseCost ? Number(a.purchaseCost) : (a.procurementCost ? Number(a.procurementCost) : 0);
    const wEndDate = a.warrantyEndDate || a.warrantyExpiry;
    const wStartDate = a.warrantyStartDate;

    let highlightDetail = "Warranty expired";
    if (wEndDate) {
      const endDateObj = new Date(wEndDate);
      if (!isNaN(endDateObj.getTime())) {
        const daysAgo = Math.floor((now.getTime() - endDateObj.getTime()) / (1000 * 60 * 60 * 24));
        highlightDetail = daysAgo >= 0 ? `Expired ${daysAgo} day${daysAgo === 1 ? "" : "s"} ago` : "Warranty expired";
      }
    }

    const useful = a.usefulLife || a.expectedLifecycleYears || 5;
    let elapsedMonths = 0;
    if (a.purchaseDate && !isNaN(new Date(a.purchaseDate).getTime())) {
      const pDate = new Date(a.purchaseDate);
      const elapsedYears = now.getFullYear() - pDate.getFullYear();
      elapsedMonths = (now.getMonth() - pDate.getMonth()) + (elapsedYears * 12);
    }

    return {
      id: a.id,
      assetCode: a.assetCode,
      name: a.name,
      category: a.category?.name || "Uncategorized",
      department: a.department?.name || "Unassigned",
      status: a.status,
      purchaseCost: cost,
      purchaseDate: toSafeDateStr(a.purchaseDate),
      warrantyStartDate: toSafeDateStr(wStartDate),
      warrantyEndDate: toSafeDateStr(wEndDate),
      usefulLifeYears: useful,
      elapsedMonths,
      highlightDetail
    };
  });

  return (
    <AdminFilteredAssetsClient
      title="Expired Warranty Assets"
      description="University equipment and assets whose manufacturer or supplier warranty period has lapsed"
      badgeLabel="Expired"
      badgeColor="rose"
      type="EXPIRED"
      assets={assets}
    />
  );
}
