"use server";

import { assignAsset, acceptAssignment, rejectAssignment, approveReturnRequest, cancelAssignment } from "@/services/assignment";
import { requestTransfer, approveTransfer, rejectTransfer } from "@/services/transfer";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function assignAssetAction(prevState: unknown, data: {
  assetId: string;
  assignedToId?: string;
  departmentId?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const assignment = await assignAsset(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, assignment };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to assign asset.";
    return { error: msg };
  }
}

export async function requestTransferAction(prevState: unknown, data: {
  assetId: string;
  toDepartmentId?: string;
  toUserId?: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const transfer = await requestTransfer(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, transfer };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to request transfer.";
    return { error: msg };
  }
}

export async function approveTransferAction(prevState: unknown, transferId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const approved = await approveTransfer(transferId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, approved };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve transfer.";
    return { error: msg };
  }
}

export async function rejectTransferAction(prevState: unknown, data: { transferId: string; reason?: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const rejected = await rejectTransfer(data.transferId, session.user.id, data.reason);
    revalidatePath("/", "layout");
    return { success: true, rejected };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reject transfer.";
    return { error: msg };
  }
}

export async function acceptAssignmentAction(prevState: unknown, assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const assignment = await acceptAssignment(assignmentId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, assignment };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to accept assignment.";
    return { error: msg };
  }
}

export async function rejectAssignmentAction(prevState: unknown, data: { assignmentId: string; reason: string }) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const assignment = await rejectAssignment(data.assignmentId, session.user.id, data.reason);
    revalidatePath("/", "layout");
    return { success: true, assignment };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to reject/return assignment.";
    return { error: msg };
  }
}

export async function approveReturnRequestAction(prevState: unknown, assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await approveReturnRequest(assignmentId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to approve return request.";
    return { error: msg };
  }
}

export async function cancelAssignmentAction(prevState: unknown, assignmentId: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await cancelAssignment(assignmentId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to cancel assignment.";
    return { error: msg };
  }
}
