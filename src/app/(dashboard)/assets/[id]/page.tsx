import React from "react";
import { prisma } from "@/lib/db";
import { AssetDetailsClient } from "@/components/asset-details-client";
import { auth } from "@/auth";
import { RoleName } from "@prisma/client";

export const revalidate = 0;

interface AssetDetailPageProps {
  params: {
    id: string;
  };
}

export default async function AssetDetailPage({ params }: AssetDetailPageProps) {
  const session = await auth();

  // Find asset by ID
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [
        { id: params.id },
        { assetCode: params.id } // Support barcode/QR scans with code representation directly!
      ],
      deletedAt: null
    },
    include: {
      category: true,
      assetType: true,
      department: { include: { faculty: true } },
      images: true,
      qrCode: true,
      supplier: true,
      fieldValues: {
        include: { field: true }
      },
      assignments: {
        where: { status: "ACTIVE" },
        include: { assignedTo: true, department: true }
      },
      maintenances: {
        orderBy: { createdAt: "desc" },
        include: { reportedBy: true, assignedTo: true }
      },
      transfers: {
        orderBy: { createdAt: "desc" },
        include: { requestedBy: true, approvedBy: true, fromDepartment: true, toDepartment: true, fromUser: true, toUser: true }
      }
    }
  });

  if (!asset) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
        Asset not found. Please verify the QR code or asset identifier.
      </div>
    );
  }

  // Load active configurations for the AssetType (Section 9)
  const activeConfigs = asset.assetTypeId ? await prisma.assetTypeField.findMany({
    where: { assetTypeId: asset.assetTypeId, isEnabled: true },
    include: { field: true }
  }) : [];
  const enabledFields = activeConfigs.map((cfg) => cfg.field.name);

  // Fetch dropdown collections for quick action panels
  const departments = await prisma.organizationalUnit.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  const staffUsers = await prisma.user.findMany({
    where: { role: { name: RoleName.STAFF_MEMBER }, deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" }
  });

  return (
    <AssetDetailsClient
      asset={asset}
      session={session}
      departments={departments}
      staffUsers={staffUsers}
      enabledFields={enabledFields}
    />
  );
}
