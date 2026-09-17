"use server";

import { auth } from "@/auth";
import { getNotifications, markAllAsRead, markAsRead, deleteNotification } from "@/services/notification";
import { revalidatePath } from "next/cache";

export async function fetchNotificationsAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    const list = await getNotifications(session.user.id);
    return { success: true, list };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch notifications.";
    return { error: msg };
  }
}

export async function markAllReadAction() {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    await markAllAsRead(session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark notifications read.";
    return { error: msg };
  }
}

export async function markOneReadAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    await markAsRead(notificationId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark notification read.";
    return { error: msg };
  }
}

export async function deleteNotificationAction(notificationId: string) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized." };
  }

  try {
    await deleteNotification(notificationId, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete notification.";
    return { error: msg };
  }
}
