import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { getPaoAssetRequests } from "@/services/asset-request";
import { PaoAssetRequestsClient } from "@/components/pao-asset-requests-client";
import { AssetStatus } from "@prisma/client";

export const revalidate = 0;

export default async function PaoAssetRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (
    session.user.role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER &&
    session.user.role !== ROLES.SYSTEM_ADMINISTRATOR
  ) {
    redirect("/unauthorized");
  }

  const [requests, availableAssets, departments] = await Promise.all([
    getPaoAssetRequests(),
    prisma.asset.findMany({
      where: {
        status: AssetStatus.ACTIVE,
        deletedAt: null,
      },
      select: {
        id: true,
        name: true,
        assetCode: true,
        serialNumber: true,
        categoryId: true,
        category: { select: { name: true, code: true } },
        condition: true,
        department: { select: { name: true } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PaoAssetRequestsClient
        requests={requests as unknown as React.ComponentProps<typeof PaoAssetRequestsClient>["requests"]}
        availableAssets={availableAssets as unknown as React.ComponentProps<typeof PaoAssetRequestsClient>["availableAssets"]}
        departments={departments}
      />
    </div>
  );
}
