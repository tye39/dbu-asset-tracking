"use server";

import { createMaintenanceRequest, updateMaintenanceStatus } from "@/services/maintenance";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { MaintenanceStatus, MaintenancePriority } from "@prisma/client";

export async function createMaintenanceAction(prevState: unknown, data: {
  assetId: string;
  description: string;
  priority: MaintenancePriority;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const request = await createMaintenanceRequest(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, request };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create maintenance request.";
    return { error: msg };
  }
}

export async function updateMaintenanceAction(prevState: unknown, data: {
  id: string;
  status: MaintenanceStatus;
  assignedToId?: string;
  cost?: number;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const updated = await updateMaintenanceStatus(data.id, data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, updated };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update maintenance task.";
    return { error: msg };
  }
}
