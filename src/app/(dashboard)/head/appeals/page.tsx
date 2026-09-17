import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { getDepartmentAppeals } from "@/services/appeal";
import { HeadAppealsClient } from "@/components/head-appeals-client";

export const revalidate = 0;

export default async function HeadAppealsPage() {
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

  const [department, appeals, departmentRequests, departmentAssets] = await Promise.all([
    prisma.organizationalUnit.findUnique({
      where: { id: deptId },
      select: { name: true }
    }),
    getDepartmentAppeals(deptId),
    prisma.assetRequest.findMany({
      where: { departmentId: deptId },
      select: { id: true, requestNumber: true, reason: true, status: true },
      orderBy: { createdAt: "desc" },
      take: 20,
    }),
    prisma.asset.findMany({
      where: { departmentId: deptId, deletedAt: null },
      select: { id: true, name: true, assetCode: true },
      orderBy: { name: "asc" },
      take: 50,
    }),
  ]);

  const serializedAppeals = appeals.map((a) => ({
    id: a.id,
    appealNumber: a.appealNumber,
    subject: a.subject,
    reason: a.reason,
    description: a.description,
    supportingInfo: a.supportingInfo,
    status: a.status,
    responseDate: a.responseDate ? a.responseDate.toISOString() : null,
    responseComment: a.responseComment,
    createdAt: a.createdAt.toISOString(),
    department: a.department,
    departmentHead: a.departmentHead,
    request: a.request,
    asset: a.asset,
    responder: a.responder,
    history: a.history.map((h) => ({
      id: h.id,
      fromStatus: h.fromStatus,
      toStatus: h.toStatus,
      comment: h.comment,
      createdAt: h.createdAt.toISOString(),
      actor: h.actor,
    })),
  }));

  const requestOptions = departmentRequests.map((r) => ({
    id: r.id,
    label: `${r.requestNumber} (${r.status.replace(/_/g, " ")}) - ${r.reason.slice(0, 30)}...`,
  }));

  const assetOptions = departmentAssets.map((a) => ({
    id: a.id,
    label: `${a.assetCode} - ${a.name}`,
  }));

  return (
    <HeadAppealsClient
      appeals={serializedAppeals}
      departmentName={department?.name || "Department"}
      departmentRequests={requestOptions}
      departmentAssets={assetOptions}
    />
  );
}
