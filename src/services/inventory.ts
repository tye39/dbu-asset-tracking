import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";

export async function startInventorySession(data: {
  sessionNumber: string;
  departmentId: string;
  inventoryPersonId: string;
  startDate: Date;
  dueDate: Date;
  notes?: string;
}, assignedById: string) {
  // Validate department exists
  const dept = await prisma.organizationalUnit.findUnique({
    where: { id: data.departmentId, deletedAt: null }
  });
  if (!dept) throw new Error("Department not found.");

  // Validate inventory person exists and is active
  const person = await prisma.inventoryPerson.findUnique({
    where: { id: data.inventoryPersonId, isActive: true },
    include: { user: true }
  });
  if (!person) throw new Error("Inventory Person not found or is currently inactive.");

  const session = await prisma.inventorySession.create({
    data: {
      sessionNumber: data.sessionNumber,
      departmentId: data.departmentId,
      inventoryPersonId: data.inventoryPersonId,
      assignedById,
      status: "ASSIGNED",
      notes: data.notes || null,
      startDate: data.startDate,
      dueDate: data.dueDate
    },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      assignedBy: true
    }
  });

  // Create audit log
  await createAuditLog(assignedById, "CREATE_INVENTORY_ASSIGNMENT", "InventorySession", session.id, null, {
    sessionNumber: session.sessionNumber,
    departmentName: dept.name,
    inventoryPersonName: person.user.name,
    status: session.status
  });

  return session;
}

export async function getActiveSessions() {
  return await prisma.inventorySession.findMany({
    where: {
      status: {
        in: ["ASSIGNED", "IN_PROGRESS", "REOPENED"]
      }
    },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      assignedBy: true
    },
    orderBy: { createdAt: "desc" }
  });
}

export async function getCompletedSessions() {
  return await prisma.inventorySession.findMany({
    where: {
      status: {
        in: ["COMPLETED", "CANCELLED"]
      }
    },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      assignedBy: true,
      completedBy: true
    },
    orderBy: { completedAt: "desc" }
  });
}

export async function getInventorySessionDetails(id: string) {
  return await prisma.inventorySession.findUnique({
    where: { id },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      assignedBy: true,
      completedBy: true,
      verifications: {
        include: {
          asset: {
            include: {
              category: true,
              assetType: true
            }
          },
          scannedBy: true
        }
      }
    }
  });
}

export async function scanAssetInSession(inventorySessionId: string, assetCodeOrTag: string, scannedById: string) {
  // Find session
  const session = await prisma.inventorySession.findUnique({
    where: { id: inventorySessionId },
    include: { department: true }
  });
  if (!session) throw new Error("Inventory session not found.");
  
  if (session.status !== "IN_PROGRESS" && session.status !== "ASSIGNED" && session.status !== "REOPENED") {
    throw new Error("A completed or cancelled inventory cannot receive new scans.");
  }

  // Extract identifier if a full QR verification URL was scanned
  let cleanTag = assetCodeOrTag.trim();
  if (cleanTag.includes("/asset/verify/")) {
    cleanTag = cleanTag.substring(cleanTag.lastIndexOf("/asset/verify/") + "/asset/verify/".length).split(/[?#]/)[0];
  } else if (cleanTag.includes("/assets/")) {
    cleanTag = cleanTag.substring(cleanTag.lastIndexOf("/assets/") + "/assets/".length).split(/[?#]/)[0];
  }

  const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(cleanTag);

  // Find asset (searching by code, publicId, or id)
  const asset = await prisma.asset.findFirst({
    where: {
      OR: [
        { assetCode: cleanTag },
        { publicId: cleanTag },
        ...(isUuid ? [{ id: cleanTag }] : []),
      ],
      deletedAt: null,
    },
    include: {
      department: true,
      category: true,
      assetType: true,
      images: true,
      assignments: {
        where: { status: "ACTIVE" },
        include: { assignedTo: true }
      }
    }
  });

  if (!asset) {
    // Record invalid scan attempt in audit log
    await createAuditLog(scannedById, "SCAN_INVALID", "InventorySession", inventorySessionId, null, {
      scannedTag: assetCodeOrTag,
      reason: "Asset Not Found"
    });
    throw new Error("Asset Not Found");
  }

  // Verify department match
  if (asset.departmentId !== session.departmentId) {
    // Record wrong department scan in audit log
    await createAuditLog(scannedById, "SCAN_WRONG_DEPT", "Asset", asset.id, null, {
      assetCode: asset.assetCode,
      assetName: asset.name,
      registeredDepartment: asset.department.name,
      sessionDepartment: session.department.name
    });
    throw new Error(`Wrong Department: This asset belongs to "${asset.department.name}".`);
  }

  // Verify unique duplicate verification constraint
  const existingVerification = await prisma.inventoryVerification.findUnique({
    where: {
      inventorySessionId_assetId: {
        inventorySessionId,
        assetId: asset.id
      }
    }
  });

  if (existingVerification) {
    // Record duplicate scan attempt in audit log
    await createAuditLog(scannedById, "SCAN_DUPLICATE", "Asset", asset.id, null, {
      assetCode: asset.assetCode,
      assetName: asset.name,
      inventorySessionId
    });
    throw new Error("Already Counted");
  }

  // If status is ASSIGNED or REOPENED, transit to IN_PROGRESS
  if (session.status === "ASSIGNED" || session.status === "REOPENED") {
    await prisma.inventorySession.update({
      where: { id: inventorySessionId },
      data: { status: "IN_PROGRESS" }
    });
    // Create Audit Log for starting
    await createAuditLog(scannedById, "INVENTORY_ASSIGNMENT_STARTED", "InventorySession", inventorySessionId, { status: session.status }, { status: "IN_PROGRESS" });
  }

  // Create verification entry
  const verification = await prisma.inventoryVerification.create({
    data: {
      inventorySessionId,
      assetId: asset.id,
      scannedById,
      verificationStatus: "VERIFIED"
    },
    include: {
      asset: {
        include: {
          category: true,
          assetType: true
        }
      },
      scannedBy: true
    }
  });

  // Record successful scan in audit log
  await createAuditLog(scannedById, "SCAN_VERIFIED", "Asset", asset.id, null, {
    assetCode: asset.assetCode,
    assetName: asset.name,
    inventorySessionId
  });

  return { verification, asset };
}

export async function completeInventorySession(id: string, completedById: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id }
  });
  if (!session) throw new Error("Inventory session not found.");
  if (session.status !== "IN_PROGRESS" && session.status !== "ASSIGNED" && session.status !== "REOPENED") {
    throw new Error("Inventory session is not active.");
  }

  const updatedSession = await prisma.inventorySession.update({
    where: { id },
    data: {
      status: "COMPLETED",
      completedById,
      completedAt: new Date()
    },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      completedBy: true
    }
  });

  // Record completed in audit log
  await createAuditLog(completedById, "INVENTORY_SUBMITTED", "InventorySession", id, null, {
    sessionNumber: updatedSession.sessionNumber,
    status: updatedSession.status
  });

  return updatedSession;
}

export async function cancelInventorySession(id: string, completedById: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id }
  });
  if (!session) throw new Error("Inventory session not found.");

  const updatedSession = await prisma.inventorySession.update({
    where: { id },
    data: {
      status: "CANCELLED",
      completedById,
      completedAt: new Date()
    },
    include: {
      department: true,
      inventoryPerson: { include: { user: true } },
      completedBy: true
    }
  });

  // Record completed in audit log
  await createAuditLog(completedById, "INVENTORY_CANCELLED", "InventorySession", id, null, {
    sessionNumber: updatedSession.sessionNumber,
    status: updatedSession.status
  });

  return updatedSession;
}

export async function approveInventorySession(id: string, actorId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id }
  });
  if (!session) throw new Error("Inventory session not found.");
  if (session.status !== "COMPLETED") throw new Error("Only completed inventory sessions can be approved.");

  const updatedSession = await prisma.inventorySession.update({
    where: { id },
    data: {
      notes: session.notes ? `${session.notes}\n[Approved by PAO]` : "[Approved by PAO]"
    }
  });

  await createAuditLog(actorId, "INVENTORY_APPROVED", "InventorySession", id, null, {
    sessionNumber: session.sessionNumber,
    status: "APPROVED"
  });

  return updatedSession;
}

export async function reopenInventorySession(id: string, reason: string, actorId: string) {
  const session = await prisma.inventorySession.findUnique({
    where: { id }
  });
  if (!session) throw new Error("Inventory session not found.");
  if (session.status !== "COMPLETED") throw new Error("Only completed inventory sessions can be reopened.");

  const updatedSession = await prisma.inventorySession.update({
    where: { id },
    data: {
      status: "REOPENED",
      notes: session.notes ? `${session.notes}\n[Reopened reason: ${reason}]` : `[Reopened reason: ${reason}]`
    }
  });

  await createAuditLog(actorId, "INVENTORY_REOPENED", "InventorySession", id, null, {
    sessionNumber: session.sessionNumber,
    status: "REOPENED",
    reason
  });

  return updatedSession;
}

export async function getInventoryExpectedAssets(departmentId: string) {
  return await prisma.asset.findMany({
    where: { departmentId, deletedAt: null },
    include: {
      category: true,
      assetType: true,
      images: true,
      assignments: {
        where: { status: "ACTIVE" },
        include: { assignedTo: true }
      }
    },
    orderBy: { name: "asc" }
  });
}
