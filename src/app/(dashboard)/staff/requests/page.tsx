import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getStaffAssetRequests } from "@/services/asset-request";
import { StaffRequestsClient } from "@/components/staff-requests-client";

export const revalidate = 0;

export default async function StaffRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [requests, categories, assetTypes] = await Promise.all([
    getStaffAssetRequests(session.user.id),
    prisma.assetCategory.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" }
    }),
    prisma.assetType.findMany({
      where: { isActive: true },
      select: { id: true, name: true, categoryId: true },
      orderBy: { name: "asc" }
    })
  ]);

  return (
    <div className="space-y-6">
      <StaffRequestsClient
        requests={requests}
        categories={categories}
        assetTypes={assetTypes}
        userName={session.user.name || "Staff Member"}
      />
    </div>
  );
}
