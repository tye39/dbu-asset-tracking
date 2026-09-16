"use server";

import { getNotifications, markAllAsRead, markAsRead } from "@/services/notification";
import { revalidatePath } from "next/cache";

export async function fetchNotificationsAction(userId: string) {
  try {
    const list = await getNotifications(userId);
    return { success: true, list };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to fetch notifications.";
    return { error: msg };
  }
}

export async function markAllReadAction(userId: string) {
  try {
    await markAllAsRead(userId);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark notifications read.";
    return { error: msg };
  }
}

export async function markOneReadAction(notificationId: string) {
  try {
    await markAsRead(notificationId);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to mark notification read.";
    return { error: msg };
  }
}
