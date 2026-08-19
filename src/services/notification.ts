import { prisma } from "@/lib/db";
import { Prisma } from "@prisma/client";

export async function createNotification(userId: string, title: string, message: string) {
  return await prisma.notification.create({
    data: {
      userId,
      title,
      message,
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

export async function markAsRead(notificationId: string) {
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

export async function getUnreadCount(userId: string): Promise<number> {
  return await prisma.notification.count({
    where: { userId, isRead: false },
  });
}
