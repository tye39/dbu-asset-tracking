import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getNotifications } from "@/services/notification";
import { NotificationsClient } from "@/components/notifications-client";

export const revalidate = 0;

export default async function NotificationsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const rawNotifications = await getNotifications(session.user.id);

  const notifications = rawNotifications.map((n) => ({
    id: n.id,
    userId: n.userId,
    title: n.title,
    message: n.message,
    type: n.type,
    link: n.link,
    entityType: n.entityType,
    entityId: n.entityId,
    isRead: n.isRead,
    createdAt: n.createdAt && !isNaN(new Date(n.createdAt).getTime()) 
      ? new Date(n.createdAt).toISOString() 
      : new Date().toISOString(),
  }));

  return <NotificationsClient notifications={notifications} />;
}
