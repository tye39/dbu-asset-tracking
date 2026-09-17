import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDepartmentAssetRequests } from "@/services/asset-request";
import { HeadAssetRequestsClient } from "@/components/head-asset-requests-client";

export const revalidate = 0;

export default async function HeadAssetRequestsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const deptId = session.user.departmentId;
  if (!deptId) {
    return (
      <div className="p-6 text-center text-xs text-red-500 font-semibold bg-red-50 rounded-xl border border-red-200">
        You are not assigned to any faculty department. Contact System Administrator.
      </div>
    );
  }

  const [department, requests] = await Promise.all([
    prisma.organizationalUnit.findUnique({
      where: { id: deptId },
      select: { name: true }
    }),
    getDepartmentAssetRequests(deptId),
  ]);

  // Serialize dates for client
  const serializedRequests = requests.map((r) => ({
    id: r.id,
    requestNumber: r.requestNumber,
    quantity: r.quantity,
    reason: r.reason,
    priority: r.priority,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    headReviewDate: r.headReviewDate ? r.headReviewDate.toISOString() : null,
    headResponseReason: r.headResponseReason,
    paoReviewDate: r.paoReviewDate ? r.paoReviewDate.toISOString() : null,
    paoResponseReason: r.paoResponseReason,
    user: r.user,
    category: r.category,
    assetType: r.assetType,
    department: r.department,
    reviewedByHead: r.reviewedByHead,
    reviewedByPao: r.reviewedByPao,
    fulfilledAsset: r.fulfilledAsset,
    assignment: r.assignment,
    history: r.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      comment: h.comment,
      createdAt: h.createdAt.toISOString(),
      actor: h.actor,
    })),
  }));

  return (
    <HeadAssetRequestsClient
      requests={serializedRequests}
      departmentName={department?.name || "Department"}
    />
  );
}
