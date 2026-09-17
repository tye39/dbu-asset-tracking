import { prisma } from "@/lib/db";
import { PropertyAppealStatus, RoleName, Prisma } from "@prisma/client";
import { createAuditLog } from "./audit";
import { createNotification } from "./notification";

export interface CreateAppealInput {
  departmentHeadId: string;
  requestId?: string;
  assetId?: string;
  subject: string;
  reason: string;
  description: string;
  supportingInfo?: string;
}

export async function createPropertyAppeal(input: CreateAppealInput) {
  const head = await prisma.user.findUnique({
    where: { id: input.departmentHeadId, deletedAt: null },
    include: { department: true }
  });

  if (!head) {
    throw new Error("Department Head user not found.");
  }
  if (!head.departmentId) {
    throw new Error("You are not assigned to any faculty department.");
  }
  if (!input.subject || !input.subject.trim()) {
    throw new Error("Appeal subject is required.");
  }
  if (!input.reason || !input.reason.trim()) {
    throw new Error("Appeal reason category is required.");
  }
  if (!input.description || !input.description.trim()) {
    throw new Error("Appeal detailed description is required.");
  }

  // Generate appeal number: APP-XXXXXX
  const appealNumber = `APP-${Date.now().toString().slice(-6)}`;

  const appeal = await prisma.$transaction(async (tx) => {
    const newAppeal = await tx.propertyAppeal.create({
      data: {
        appealNumber,
        departmentId: head.departmentId!,
        departmentHeadId: head.id,
        requestId: input.requestId || null,
        assetId: input.assetId || null,
        subject: input.subject.trim(),
        reason: input.reason.trim(),
        description: input.description.trim(),
        supportingInfo: input.supportingInfo ? input.supportingInfo.trim() : null,
        status: PropertyAppealStatus.PENDING_PROPERTY_MANAGEMENT,
      },
      include: {
        department: true,
        departmentHead: true,
        request: true,
        asset: true,
      }
    });

    await tx.propertyAppealHistory.create({
      data: {
        appealId: newAppeal.id,
        actorId: head.id,
        fromStatus: null,
        toStatus: PropertyAppealStatus.PENDING_PROPERTY_MANAGEMENT,
        comment: "Appeal submitted by Department Head.",
      }
    });

    return newAppeal;
  });

  // Audit log
  await createAuditLog(
    head.id,
    "DEPARTMENT_HEAD_CREATED_APPEAL",
    "PropertyAppeal",
    appeal.id,
    null,
    {
      appealNumber: appeal.appealNumber,
      departmentId: head.departmentId,
      departmentName: head.department?.name,
      subject: appeal.subject,
      reason: appeal.reason,
      requestId: input.requestId,
      assetId: input.assetId,
    }
  );

  // Notify PAOs
  const paoUsers = await prisma.user.findMany({
    where: {
      role: { name: RoleName.PROPERTY_ADMINISTRATION_OFFICER },
      deletedAt: null,
    }
  });

  for (const pao of paoUsers) {
    await createNotification(
      pao.id,
      "New Property Management Appeal",
      `Department Head ${head.name} (${head.department?.name}) submitted appeal ${appeal.appealNumber}: "${appeal.subject}".\n\nReason: ${appeal.reason}`
    );
  }

  return appeal;
}

export async function getDepartmentAppeals(departmentId: string, status?: PropertyAppealStatus) {
  const where: Prisma.PropertyAppealWhereInput = { departmentId };
  if (status) {
    where.status = status;
  }

  return await prisma.propertyAppeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { name: true, code: true } },
      departmentHead: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, requestNumber: true, status: true } },
      asset: { select: { id: true, name: true, assetCode: true } },
      responder: { select: { id: true, name: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: { select: { name: true } } } } }
      }
    }
  });
}

export async function getAllAppeals(status?: PropertyAppealStatus, departmentId?: string) {
  const where: Prisma.PropertyAppealWhereInput = {};
  if (status) {
    where.status = status;
  }
  if (departmentId) {
    where.departmentId = departmentId;
  }

  return await prisma.propertyAppeal.findMany({
    where,
    orderBy: { createdAt: "desc" },
    include: {
      department: { select: { id: true, name: true, code: true } },
      departmentHead: { select: { id: true, name: true, email: true } },
      request: { select: { id: true, requestNumber: true, status: true, reason: true } },
      asset: { select: { id: true, name: true, assetCode: true, status: true } },
      responder: { select: { id: true, name: true } },
      history: {
        orderBy: { createdAt: "asc" },
        include: { actor: { select: { name: true, role: { select: { name: true } } } } }
      }
    }
  });
}

export async function respondToPropertyAppeal(data: {
  appealId: string;
  responderId: string;
  action: "UNDER_REVIEW" | "REQUEST_INFO" | "RESOLVE" | "REJECT" | "CLOSE";
  comment: string;
}) {
  if (!data.comment || !data.comment.trim()) {
    throw new Error("A response comment / resolution explanation is required.");
  }

  const appeal = await prisma.propertyAppeal.findUnique({
    where: { id: data.appealId },
    include: {
      department: true,
      departmentHead: true,
    }
  });

  if (!appeal) {
    throw new Error("Appeal not found.");
  }

  let nextStatus: PropertyAppealStatus;
  switch (data.action) {
    case "UNDER_REVIEW":
      nextStatus = PropertyAppealStatus.UNDER_REVIEW;
      break;
    case "REQUEST_INFO":
      nextStatus = PropertyAppealStatus.ADDITIONAL_INFORMATION_REQUIRED;
      break;
    case "RESOLVE":
      nextStatus = PropertyAppealStatus.RESOLVED;
      break;
    case "REJECT":
      nextStatus = PropertyAppealStatus.REJECTED;
      break;
    case "CLOSE":
      nextStatus = PropertyAppealStatus.CLOSED;
      break;
    default:
      throw new Error("Invalid appeal response action.");
  }

  const updatedAppeal = await prisma.$transaction(async (tx) => {
    const updated = await tx.propertyAppeal.update({
      where: { id: data.appealId },
      data: {
        status: nextStatus,
        responderId: data.responderId,
        responseDate: new Date(),
        responseComment: data.comment.trim(),
      },
      include: {
        department: true,
        departmentHead: true,
        responder: true,
      }
    });

    await tx.propertyAppealHistory.create({
      data: {
        appealId: data.appealId,
        actorId: data.responderId,
        fromStatus: appeal.status,
        toStatus: nextStatus,
        comment: data.comment.trim(),
      }
    });

    return updated;
  });

  // Audit logs
  let auditAction = "PROPERTY_MANAGEMENT_RESPONDED_TO_APPEAL";
  if (data.action === "RESOLVE") auditAction = "APPEAL_RESOLVED";
  if (data.action === "REJECT") auditAction = "APPEAL_REJECTED";

  await createAuditLog(
    data.responderId,
    auditAction,
    "PropertyAppeal",
    appeal.id,
    { status: appeal.status },
    { status: nextStatus, action: data.action, comment: data.comment.trim() }
  );

  // Notify Department Head
  await createNotification(
    appeal.departmentHeadId,
    "Property Appeal Status Update",
    `Your appeal ${appeal.appealNumber} ("${appeal.subject}") status has been updated to: ${nextStatus.replace(/_/g, " ")}.\n\nResponse from Property Administration:\n${data.comment.trim()}`
  );

  return updatedAppeal;
}
