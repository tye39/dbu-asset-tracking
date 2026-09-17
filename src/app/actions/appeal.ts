"use server";

import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import {
  createPropertyAppeal,
  respondToPropertyAppeal,
} from "@/services/appeal";
import { ROLES } from "@/lib/rbac";

export async function createPropertyAppealAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.DEPARTMENT_HEAD) {
    return { error: "Only Department Heads can submit appeals to Property Management." };
  }
  if (!session.user.departmentId) {
    return { error: "Department assignment missing from your profile." };
  }

  const subject = formData.get("subject") as string;
  const reason = formData.get("reason") as string;
  const description = formData.get("description") as string;
  const supportingInfo = (formData.get("supportingInfo") as string) || undefined;
  const requestId = (formData.get("requestId") as string) || undefined;
  const assetId = (formData.get("assetId") as string) || undefined;

  if (!subject || !subject.trim()) {
    return { error: "Please provide an appeal subject." };
  }
  if (!reason || !reason.trim()) {
    return { error: "Please select an appeal reason category." };
  }
  if (!description || !description.trim()) {
    return { error: "Please provide a detailed explanation of your appeal." };
  }

  try {
    const appeal = await createPropertyAppeal({
      departmentHeadId: session.user.id,
      requestId,
      assetId,
      subject: subject.trim(),
      reason: reason.trim(),
      description: description.trim(),
      supportingInfo,
    });

    revalidatePath("/head/appeals");
    revalidatePath("/head/dashboard");
    revalidatePath("/pao/appeals");

    return { success: true, appealId: appeal.id, appealNumber: appeal.appealNumber };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to submit appeal." };
  }
}

export async function respondToPropertyAppealAction(prevState: unknown, formData: FormData) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Authentication required." };
  }
  if (session.user.role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER && session.user.role !== ROLES.SYSTEM_ADMINISTRATOR) {
    return { error: "Only Property Administration Officers can respond to appeals." };
  }

  const appealId = formData.get("appealId") as string;
  const action = formData.get("action") as "UNDER_REVIEW" | "REQUEST_INFO" | "RESOLVE" | "REJECT" | "CLOSE";
  const comment = formData.get("comment") as string;

  if (!appealId) return { error: "Appeal ID missing." };
  if (!action) return { error: "Action is required." };
  if (!comment || !comment.trim()) {
    return { error: "A response comment / resolution explanation is required." };
  }

  try {
    await respondToPropertyAppeal({
      appealId,
      responderId: session.user.id,
      action,
      comment: comment.trim(),
    });

    revalidatePath("/pao/appeals");
    revalidatePath("/head/appeals");
    revalidatePath("/head/dashboard");

    return { success: true };
  } catch (err: unknown) {
    return { error: (err as Error).message || "Failed to respond to appeal." };
  }
}
