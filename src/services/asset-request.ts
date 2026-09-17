import { prisma } from "@/lib/db";
import { AssetRequestStatus, RoleName, AssetStatus, Prisma } from "@prisma/client";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";
import { assignAsset } from "./assignment";

export interface CreateAssetRequestInput {
  userId: string;
  categoryId: string;
  assetTypeId?: string;
  quantity?: number;
  reason: string;
  priority?: string;
}

export async function createAssetRequest(input: CreateAssetRequestInput) {
  const staff = await prisma.user.findUnique({
    where: { id: input.userId, deletedAt: null },
    include: { department: true }
  });

  if (!staff) {
    throw new Error("Staff member not found.");
  }
  if (!staff.departmentId) {
    throw new Error("You are not assigned to any faculty department. Contact System Administrator.");
  }

  const category = await prisma.assetCategory.findUnique({
    where: { id: input.categoryId, deletedAt: null }
  });
  if (!category) {
    throw new Error("Selected asset category not found.");
  }

  // Generate human-readable request number: REQ-XXXXXX
  const requestNumber = `REQ-${Date.now().toString().slice(-6)}`;

  const request = await prisma.$transaction(async (tx) => {
    const newReq = await tx.assetRequest.create({
      data: {
        requestNumber,
        userId: staff.id,
        departmentId: staff.departmentId!,
        categoryId: category.id,
        assetTypeId: input.assetTypeId || null,
        quantity: Math.max(1, Number(input.quantity) || 1),
        reason: input.reason.trim(),
        priority: input.priority || "MEDIUM",
        status: AssetRequestStatus.PENDING_DEPARTMENT_HEAD,
      },
      include: {
        category: true,
        assetType: true,
        department: true,
        user: true,
      }
    });

    await tx.assetRequestHistory.create({
      data: {
        requestId: newReq.id,
        actorId: staff.id,
        fromStatus: null,
        toStatus: AssetRequestStatus.PENDING_DEPARTMENT_HEAD,
        comment: "Asset request submitted by staff member.",
      }
    });

    return newReq;
  });

  // Audit log
  await createAuditLog(
    staff.id,
    "STAFF_MEMBER_REQUESTED_ASSET",
    "AssetRequest",
    request.id,
    null,
    {
      requestNumber: request.requestNumber,
      categoryId: category.id,
      categoryName: category.name,
      departmentId: staff.departmentId,
      departmentName: staff.department?.name,
      quantity: request.quantity,
      priority: request.priority,
    }
  );

  // Notify Department Head
  const deptHead = await prisma.user.findFirst({
    where: {
      departmentId: staff.departmentId,
      role: { name: RoleName.DEPARTMENT_HEAD },
      deletedAt: null,
    }
  });

  if (deptHead) {
    await createNotification(
      deptHead.id,
      "New Staff Asset Request",
      `${staff.name} has submitted an asset request (${request.requestNumber}) for ${category.name}.\n\nReason: ${request.reason}`
    );
  }

  return request;
}

export async function getStaffAssetRequests(userId: string) {
  return await prisma.assetRequest.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    include: {
      category: { select: { name: true, code: true } },
      assetType: { select: { name: true } },
      department: { select: { name: true, code: true } },
      fulfilledAsset: { select: { id: true, name: true, assetCode: true, serialNumber: true } },
      assignment: { select: { id: true, status: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: { select: { name: true } } } } }
      }
    }
  });
}

export async function getDepartmentAssetRequests(departmentId: string, status?: AssetRequestStatus) {
  const where: Prisma.AssetRequestWhereInput = { departmentId };
  if (status) {
    where.status = status;
  }

  return await prisma.assetRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, employeeId: true } },
      category: { select: { name: true, code: true } },
      assetType: { select: { name: true } },
      department: { select: { name: true, code: true } },
      reviewedByHead: { select: { name: true } },
      reviewedByPao: { select: { name: true } },
      fulfilledAsset: { select: { id: true, name: true, assetCode: true, serialNumber: true, status: true } },
      assignment: { select: { id: true, status: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: { select: { name: true } } } } }
      }
    }
  });
}

export async function headReviewAssetRequest(
  requestId: string,
  headUserId: string,
  headDepartmentId: string,
  decision: "APPROVE" | "REJECT",
  reason?: string
) {
  const request = await prisma.assetRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      department: true,
      category: true,
    }
  });

  if (!request) {
    throw new Error("Asset request not found.");
  }
  if (request.departmentId !== headDepartmentId) {
    throw new Error("Unauthorized: You can only review requests for your own department.");
  }
  if (request.status !== AssetRequestStatus.PENDING_DEPARTMENT_HEAD) {
    throw new Error(`This request is already ${request.status.replace(/_/g, " ")}.`);
  }

  if (decision === "REJECT" && (!reason || !reason.trim())) {
    throw new Error("A rejection reason is mandatory.");
  }

  const nextStatus = decision === "APPROVE"
    ? AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD
    : AssetRequestStatus.REJECTED_BY_DEPARTMENT_HEAD;

  const updated = await prisma.$transaction(async (tx) => {
    const updatedReq = await tx.assetRequest.update({
      where: { id: requestId },
      data: {
        status: nextStatus,
        reviewedByHeadId: headUserId,
        headReviewDate: new Date(),
        headResponseReason: reason ? reason.trim() : null,
      },
      include: {
        user: true,
        department: true,
        category: true,
      }
    });

    await tx.assetRequestHistory.create({
      data: {
        requestId,
        actorId: headUserId,
        fromStatus: AssetRequestStatus.PENDING_DEPARTMENT_HEAD,
        toStatus: nextStatus,
        comment: reason ? reason.trim() : (decision === "APPROVE" ? "Approved by Department Head and forwarded to Property Administration." : "Rejected by Department Head."),
      }
    });

    return updatedReq;
  });

  const auditAction = decision === "APPROVE" ? "DEPARTMENT_HEAD_APPROVED_REQUEST" : "DEPARTMENT_HEAD_REJECTED_REQUEST";
  await createAuditLog(
    headUserId,
    auditAction,
    "AssetRequest",
    request.id,
    { status: AssetRequestStatus.PENDING_DEPARTMENT_HEAD },
    { status: nextStatus, reason: reason?.trim() }
  );

  // Notify Staff Member
  if (decision === "APPROVE") {
    await createNotification(
      request.userId,
      "Asset Request Approved",
      `Your asset request (${request.requestNumber}) was approved by your Department Head and forwarded to Property Administration for fulfillment.`
    );

    // Notify all active PAOs
    const paoUsers = await prisma.user.findMany({
      where: {
        role: { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER },
        deletedAt: null,
      }
    });
    for (const pao of paoUsers) {
      await createNotification(
        pao.id,
        "New Approved Asset Request",
        `Department Head of ${request.department.name} approved request ${request.requestNumber} for staff ${request.user.name} (${request.category.name}) requiring fulfillment.`
      );
    }
  } else {
    await createNotification(
      request.userId,
      "Asset Request Rejected",
      `Your asset request (${request.requestNumber}) was rejected by your Department Head.\n\nReason: ${reason?.trim()}`
    );
  }

  return updated;
}

export async function getPaoAssetRequests(status?: AssetRequestStatus, departmentId?: string) {
  const where: Prisma.AssetRequestWhereInput = {};
  if (status) {
    where.status = status;
  }
  if (departmentId) {
    where.departmentId = departmentId;
  }

  return await prisma.assetRequest.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      user: { select: { id: true, name: true, email: true, employeeId: true } },
      category: { select: { id: true, name: true, code: true } },
      assetType: { select: { id: true, name: true } },
      department: { select: { id: true, name: true, code: true } },
      reviewedByHead: { select: { name: true } },
      reviewedByPao: { select: { name: true } },
      fulfilledAsset: { select: { id: true, name: true, assetCode: true, serialNumber: true, status: true } },
      assignment: { select: { id: true, status: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: { select: { name: true } } } } }
      }
    }
  });
}

export async function paoFulfillAssetRequest(
  requestId: string,
  paoUserId: string,
  assetId: string,
  notes?: string
) {
  const request = await prisma.assetRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      department: true,
      category: true,
    }
  });

  if (!request) {
    throw new Error("Asset request not found.");
  }
  if (request.status !== AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD) {
    throw new Error(`Cannot fulfill request in current status: ${request.status.replace(/_/g, " ")}.`);
  }

  // Verify asset exists and is ACTIVE
  const asset = await prisma.asset.findUnique({
    where: { id: assetId, deletedAt: null }
  });
  if (!asset) {
    throw new Error("Selected asset not found.");
  }
  if (asset.status !== AssetStatus.ACTIVE) {
    throw new Error(`Selected asset is currently ${asset.status.replace(/_/g, " ")} and cannot be assigned.`);
  }

  // 1. Invoke existing assignment workflow!
  const assignment = await assignAsset({
    assetId: asset.id,
    assignedToId: request.userId,
    departmentId: request.departmentId,
    notes: `Fulfilled for request ${request.requestNumber}.${notes ? " Note: " + notes.trim() : ""}`,
  }, paoUserId);

  // 2. Update AssetRequest status to FULFILLED
  const updatedReq = await prisma.$transaction(async (tx) => {
    const updated = await tx.assetRequest.update({
      where: { id: requestId },
      data: {
        status: AssetRequestStatus.FULFILLED,
        reviewedByPaoId: paoUserId,
        paoReviewDate: new Date(),
        paoResponseReason: notes ? notes.trim() : "Fulfilled by Property Administration.",
        fulfilledAssetId: asset.id,
        assignmentId: assignment.id,
      },
      include: {
        user: true,
        department: true,
        category: true,
        fulfilledAsset: true,
      }
    });

    await tx.assetRequestHistory.create({
      data: {
        requestId,
        actorId: paoUserId,
        fromStatus: AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD,
        toStatus: AssetRequestStatus.FULFILLED,
        comment: `Fulfilled with asset ${asset.name} (${asset.assetCode}). ${notes ? "Notes: " + notes.trim() : ""}`,
      }
    });

    return updated;
  });

  // 3. Audit log
  await createAuditLog(
    paoUserId,
    "ASSET_REQUEST_FULFILLED",
    "AssetRequest",
    request.id,
    { status: request.status },
    { status: AssetRequestStatus.FULFILLED, assetId: asset.id, assetCode: asset.assetCode, assignmentId: assignment.id }
  );

  // 4. Notify Staff Member
  await createNotification(
    request.userId,
    "Asset Request Fulfilled",
    `Your asset request (${request.requestNumber}) has been fulfilled with asset '${asset.name}' (${asset.assetCode}). Please navigate to your dashboard to review and accept the assignment.`
  );

  // 5. Notify Department Head
  const deptHead = await prisma.user.findFirst({
    where: {
      departmentId: request.departmentId,
      role: { name: RoleName.DEPARTMENT_HEAD },
      deletedAt: null,
    }
  });
  if (deptHead) {
    await createNotification(
      deptHead.id,
      "Asset Request Fulfilled",
      `Request (${request.requestNumber}) for ${request.user.name} has been fulfilled with asset ${asset.assetCode} by Property Administration.`
    );
  }

  return updatedReq;
}

export async function paoRejectAssetRequest(
  requestId: string,
  paoUserId: string,
  reason: string
) {
  if (!reason || !reason.trim()) {
    throw new Error("A rejection reason is mandatory.");
  }

  const request = await prisma.assetRequest.findUnique({
    where: { id: requestId },
    include: {
      user: true,
      department: true,
      category: true,
    }
  });

  if (!request) {
    throw new Error("Asset request not found.");
  }
  if (request.status !== AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD) {
    throw new Error(`Cannot reject request in status ${request.status.replace(/_/g, " ")}.`);
  }

  const updatedReq = await prisma.$transaction(async (tx) => {
    const updated = await tx.assetRequest.update({
      where: { id: requestId },
      data: {
        status: AssetRequestStatus.REJECTED_BY_PROPERTY_MANAGEMENT,
        reviewedByPaoId: paoUserId,
        paoReviewDate: new Date(),
        paoResponseReason: reason.trim(),
      },
      include: {
        user: true,
        department: true,
        category: true,
      }
    });

    await tx.assetRequestHistory.create({
      data: {
        requestId,
        actorId: paoUserId,
        fromStatus: AssetRequestStatus.APPROVED_BY_DEPARTMENT_HEAD,
        toStatus: AssetRequestStatus.REJECTED_BY_PROPERTY_MANAGEMENT,
        comment: `Rejected by Property Management: ${reason.trim()}`,
      }
    });

    return updated;
  });

  // Audit log
  await createAuditLog(
    paoUserId,
    "PROPERTY_MANAGEMENT_REJECTED_REQUEST",
    "AssetRequest",
    request.id,
    { status: request.status },
    { status: AssetRequestStatus.REJECTED_BY_PROPERTY_MANAGEMENT, reason: reason.trim() }
  );

  // Notify Staff
  await createNotification(
    request.userId,
    "Asset Request Rejected by Property Administration",
    `Your asset request (${request.requestNumber}) was rejected by Property Administration.\n\nReason: ${reason.trim()}`
  );

  // Notify Department Head
  const deptHead = await prisma.user.findFirst({
    where: {
      departmentId: request.departmentId,
      role: { name: RoleName.DEPARTMENT_HEAD },
      deletedAt: null,
    }
  });
  if (deptHead) {
    await createNotification(
      deptHead.id,
      "Asset Request Rejected by Property Administration",
      `Asset request (${request.requestNumber}) for ${request.user.name} was rejected by Property Administration.\n\nReason: ${reason.trim()}\n\nYou can file an appeal with Property Management if needed.`
    );
  }

  return updatedReq;
}

export async function cancelAssetRequest(requestId: string, userId: string) {
  const request = await prisma.assetRequest.findUnique({
    where: { id: requestId }
  });

  if (!request) {
    throw new Error("Asset request not found.");
  }
  if (request.userId !== userId) {
    throw new Error("Unauthorized to cancel this request.");
  }
  if (request.status !== AssetRequestStatus.PENDING_DEPARTMENT_HEAD) {
    throw new Error("Only pending requests awaiting Department Head review can be cancelled.");
  }

  return await prisma.$transaction(async (tx) => {
    const updated = await tx.assetRequest.update({
      where: { id: requestId },
      data: { status: AssetRequestStatus.CANCELLED }
    });

    await tx.assetRequestHistory.create({
      data: {
        requestId,
        actorId: userId,
        fromStatus: AssetRequestStatus.PENDING_DEPARTMENT_HEAD,
        toStatus: AssetRequestStatus.CANCELLED,
        comment: "Cancelled by requesting staff member."
      }
    });

    return updated;
  });
}
