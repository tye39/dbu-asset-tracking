"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import {
  startInventorySession,
  scanAssetInSession,
  completeInventorySession,
  cancelInventorySession,
  approveInventorySession,
  reopenInventorySession
} from "@/services/inventory";

export async function startInventoryAction(data: {
  sessionNumber: string;
  departmentId: string;
  inventoryPersonId: string;
  startDate: string;
  dueDate: string;
  notes?: string;
}) {
  const session = await auth();
  const role = session?.user?.role;
  
  if (!session?.user?.id) {
    return { error: "Unauthorized access. Please login." };
  }

  // RBAC check: only PROPERTY_ADMINISTRATION_OFFICER and SYSTEM_ADMINISTRATOR can create assignments
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied. Only Property Administration Officers or System Administrators can manage inventory assignments." };
  }

  try {
    const s = await startInventorySession({
      sessionNumber: data.sessionNumber,
      departmentId: data.departmentId,
      inventoryPersonId: data.inventoryPersonId,
      startDate: new Date(data.startDate),
      dueDate: new Date(data.dueDate),
      notes: data.notes
    }, session.user.id);
    revalidatePath("/pao/inventory");
    return { success: true, session: s };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to start inventory session." };
  }
}

export async function scanAssetAction(inventorySessionId: string, assetCodeOrTag: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const dbSession = await prisma.inventorySession.findUnique({
    where: { id: inventorySessionId },
    include: { inventoryPerson: true }
  });
  if (!dbSession) return { error: "Inventory session not found." };

  // Security Check: PAO/Admin can scan. Otherwise, user must be the assigned Inventory Person and be active!
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    const inventoryPersonProfile = await prisma.inventoryPerson.findUnique({
      where: { userId: session.user.id }
    });
    if (!inventoryPersonProfile || !inventoryPersonProfile.isActive || dbSession.inventoryPersonId !== inventoryPersonProfile.id) {
      return { error: "Access denied. You are not assigned to perform this inventory counting task." };
    }
  }

  try {
    const result = await scanAssetInSession(inventorySessionId, assetCodeOrTag, session.user.id);
    revalidatePath(`/pao/inventory/${inventorySessionId}`);
    revalidatePath("/pao/inventory");
    return {
      success: true,
      verification: {
        id: result.verification.id,
        scannedAt: result.verification.scannedAt.toISOString(),
        verificationStatus: result.verification.verificationStatus
      },
      asset: {
        id: result.asset.id,
        name: result.asset.name,
        assetCode: result.asset.assetCode,
        serialNumber: result.asset.serialNumber,
        categoryName: result.asset.category.name,
        typeName: result.asset.assetType?.name || "N/A",
        status: result.asset.status,
        imageUrl: result.asset.images?.[0]?.url || null,
        assignedTo: result.asset.assignments?.[0]?.assignedTo?.name || "Unassigned"
      }
    };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to scan asset." };
  }
}

export async function completeInventoryAction(id: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  const dbSession = await prisma.inventorySession.findUnique({
    where: { id },
    include: { inventoryPerson: true }
  });
  if (!dbSession) return { error: "Inventory session not found." };

  // Security Check: PAO/Admin can complete. Otherwise, user must be the assigned Inventory Person and be active!
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    const inventoryPersonProfile = await prisma.inventoryPerson.findUnique({
      where: { userId: session.user.id }
    });
    if (!inventoryPersonProfile || !inventoryPersonProfile.isActive || dbSession.inventoryPersonId !== inventoryPersonProfile.id) {
      return { error: "Access denied. You are not assigned to complete this inventory." };
    }
  }

  try {
    const s = await completeInventorySession(id, session.user.id);
    revalidatePath("/pao/inventory");
    revalidatePath(`/pao/inventory/${id}`);
    return { success: true, session: s };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to complete inventory session." };
  }
}

export async function cancelInventoryAction(id: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  try {
    const s = await cancelInventorySession(id, session.user.id);
    revalidatePath("/pao/inventory");
    revalidatePath(`/pao/inventory/${id}`);
    return { success: true, session: s };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to cancel inventory session." };
  }
}

export async function approveInventoryAction(id: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  try {
    const s = await approveInventorySession(id, session.user.id);
    revalidatePath("/pao/inventory");
    revalidatePath(`/pao/inventory/${id}`);
    return { success: true, session: s };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to approve inventory session." };
  }
}

export async function reopenInventoryAction(id: string, reason: string) {
  const session = await auth();
  const role = session?.user?.role;

  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  if (!reason.trim()) {
    return { error: "Reopen reason is required." };
  }

  try {
    const s = await reopenInventorySession(id, reason, session.user.id);
    revalidatePath("/pao/inventory");
    revalidatePath(`/pao/inventory/${id}`);
    return { success: true, session: s };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to reopen inventory session." };
  }
}
