"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createAssetRequest,
  headReviewAssetRequest,
  paoFulfillAssetRequest,
  paoRejectAssetRequest,
  cancelAssetRequest,
} from "@/services/asset-request";
import { ROLES } from "@/lib/rbac";

export async function createAssetRequestAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.STAFF_MEMBER) {
    return { error: "Only staff members can create asset requests." };
  }

  const categoryId = formData.get("categoryId") as string;
  const assetTypeId = (formData.get("assetTypeId") as string) || undefined;
  const quantity = Number(formData.get("quantity")) || 1;
  const reason = formData.get("reason") as string;
  const priority = (formData.get("priority") as string) || "MEDIUM";

  if (!categoryId) {
    return { error: "Please select an asset category." };
  }
  if (!reason || !reason.trim()) {
    return { error: "Please provide a reason / justification for the asset request." };
  }

  try {
    const request = await createAssetRequest({
      userId: session.user.id,
      categoryId,
      assetTypeId,
      quantity,
      reason: reason.trim(),
      priority,
    });

    revalidatePath("/staff/requests");
    revalidatePath("/staff/dashboard");
    revalidatePath("/head/asset-requests");
    revalidatePath("/head/dashboard");

    return { success: true, requestId: request.id, requestNumber: request.requestNumber };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to submit asset request." };
  }
}

export async function headReviewAssetRequestAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.DEPARTMENT_HEAD) {
    return { error: "Only Department Heads can review departmental requests." };
  }
  if (!session.user.departmentId) {
    return { error: "Department assignment missing from your profile." };
  }

  const requestId = formData.get("requestId") as string;
  const decision = formData.get("decision") as "APPROVE" | "REJECT";
  const reason = formData.get("reason") as string;

  if (!requestId) return { error: "Request ID missing." };
  if (decision !== "APPROVE" && decision !== "REJECT") {
    return { error: "Invalid review decision." };
  }
  if (decision === "REJECT" && (!reason || !reason.trim())) {
    return { error: "A rejection reason is mandatory." };
  }

  try {
    await headReviewAssetRequest(
      requestId,
      session.user.id,
      session.user.departmentId,
      decision,
      reason
    );

    revalidatePath("/head/asset-requests");
    revalidatePath("/head/dashboard");
    revalidatePath("/staff/requests");
    revalidatePath("/pao/asset-requests");

    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to process review." };
  }
}

export async function paoFulfillAssetRequestAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER && session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    return { error: "Only Property Administration Officers can fulfill asset requests." };
  }

  const requestId = formData.get("requestId") as string;
  const assetId = formData.get("assetId") as string;
  const notes = (formData.get("notes") as string) || undefined;

  if (!requestId) return { error: "Request ID missing." };
  if (!assetId) return { error: "Please select an available inventory asset to fulfill this request." };

  try {
    await paoFulfillAssetRequest(requestId, session.user.id, assetId, notes);

    revalidatePath("/pao/asset-requests");
    revalidatePath("/pao/assignments");
    revalidatePath("/head/asset-requests");
    revalidatePath("/staff/requests");
    revalidatePath("/staff/dashboard");

    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to fulfill asset request." };
  }
}

export async function paoRejectAssetRequestAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER && session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    return { error: "Only Property Administration Officers can reject asset requests." };
  }

  const requestId = formData.get("requestId") as string;
  const reason = formData.get("reason") as string;

  if (!requestId) return { error: "Request ID missing." };
  if (!reason || !reason.trim()) {
    return { error: "Please provide a rejection reason." };
  }

  try {
    await paoRejectAssetRequest(requestId, session.user.id, reason.trim());

    revalidatePath("/pao/asset-requests");
    revalidatePath("/head/asset-requests");
    revalidatePath("/staff/requests");

    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to reject asset request." };
  }
}

export async function cancelAssetRequestAction(requestId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }

  try {
    await cancelAssetRequest(requestId, session.user.id);
    revalidatePath("/staff/requests");
    revalidatePath("/head/asset-requests");
    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to cancel request." };
  }
}
