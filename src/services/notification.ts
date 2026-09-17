import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export interface CreateNotificationInput {
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
}

export async function createNotification(
  inputOrUserId: string | CreateNotificationInput,
  titleArg?: string,
  messageArg?: string
) {
  if (typeof inputOrUserId === "string") {
    return await prisma.notification.create({
      data: {
        userId: inputOrUserId,
        title: titleArg || "",
        message: messageArg || "",
      },
    });
  }

  return await prisma.notification.create({
    data: {
      userId: inputOrUserId.userId,
      title: inputOrUserId.title,
      message: inputOrUserId.message,
      type: inputOrUserId.type || null,
      link: inputOrUserId.link || null,
      entityType: inputOrUserId.entityType || null,
      entityId: inputOrUserId.entityId || null,
    },
  });
}

export async function getNotifications(userId: string, unreadOnly = false) {
  const where: Prisma.NotificationWhereInput = { userId };
  if (unreadOnly) {
    where.isRead = false;
  }
  return await prisma.notification.findMany({
    where,
    orderBy: { createdAt: "desc" },
  });
}

export async function markAsRead(notificationId: string, userId?: string) {
  if (userId) {
    return await prisma.notification.updateMany({
      where: { id: notificationId, userId },
      data: { isRead: true },
    });
  }
  return await prisma.notification.update({
    where: { id: notificationId },
    data: { isRead: true },
  });
}

export async function markAllAsRead(userId: string) {
  return await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true },
  });
}

export async function deleteNotification(notificationId: string, userId: string) {
  return await prisma.notification.deleteMany({
    where: { id: notificationId, userId },
  });
}

export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}
