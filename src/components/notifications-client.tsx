"use client";

import React, { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { 
  Bell, 
  Check, 
  CheckCheck, 
  Trash2, 
  ArrowLeft, 
  ExternalLink, 
  Clock, 
  Tag, 
  Inbox 
} from "lucide-react";
import { 
  markAllReadAction, 
  markOneReadAction, 
  deleteNotificationAction 
} from "@/app/actions/notification";

export interface NotificationItem {
  id: string;
  userId: string;
  title: string;
  message: string;
  type?: string | null;
  link?: string | null;
  entityType?: string | null;
  entityId?: string | null;
  isRead: boolean;
  createdAt: Date | string;
}

interface NotificationsClientProps {
  notifications: NotificationItem[];
}

export function NotificationsClient({ notifications: initialNotifications }: NotificationsClientProps) {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>(initialNotifications);
  const [filter, setFilter] = useState<"ALL" | "UNREAD" | "READ">("ALL");
  const [isPending, startTransition] = useTransition();

  const unreadCount = notifications.filter((n) => !n.isRead).length;

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "UNREAD") return !n.isRead;
    if (filter === "READ") return n.isRead;
    return true;
  });

  const handleMarkAllRead = () => {
    startTransition(async () => {
      const res = await markAllReadAction();
      if (res.success) {
        setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
        router.refresh();
      }
    });
  };

  const handleMarkOneRead = (id: string) => {
    startTransition(async () => {
      const res = await markOneReadAction(id);
      if (res.success) {
        setNotifications((prev) =>
          prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
        );
        router.refresh();
      }
    });
  };

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const res = await deleteNotificationAction(id);
      if (res.success) {
        setNotifications((prev) => prev.filter((n) => n.id !== id));
        router.refresh();
      }
    });
  };

  const formatTimestamp = (dateInput: Date | string) => {
    const d = new Date(dateInput);
    if (isNaN(d.getTime())) return "Unknown date";
    return `${d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    })} at ${d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
    })}`;
  };

  return (
    <div className="space-y-6 max-w-5xl mx-auto pb-12">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.back()}
            className="p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center gap-1.5 text-xs font-semibold"
            title="Go back"
          >
            <ArrowLeft size={16} />
            <span className="hidden sm:inline">Back</span>
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-black text-slate-800 tracking-tight flex items-center gap-2">
                <Bell className="text-sky-700" size={22} />
                Notification Center
              </h1>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full text-xs font-black bg-red-100 text-red-700 border border-red-200">
                  {unreadCount} new
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Review system alerts, asset requests, approvals, and operational updates
            </p>
          </div>
        </div>

        {/* Top Actions */}
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={handleMarkAllRead}
              disabled={isPending}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-700 hover:bg-sky-800 text-white rounded-lg text-xs font-bold shadow-sm transition-all disabled:opacity-50"
            >
              <CheckCheck size={14} />
              Mark All as Read
            </button>
          )}
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setFilter("ALL")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            filter === "ALL"
              ? "border-sky-700 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          All ({notifications.length})
        </button>
        <button
          onClick={() => setFilter("UNREAD")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            filter === "UNREAD"
              ? "border-sky-700 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Unread ({unreadCount})
        </button>
        <button
          onClick={() => setFilter("READ")}
          className={`px-4 py-2 text-xs font-bold border-b-2 transition-colors ${
            filter === "READ"
              ? "border-sky-700 text-sky-700"
              : "border-transparent text-slate-500 hover:text-slate-700"
          }`}
        >
          Read ({notifications.length - unreadCount})
        </button>
      </div>

      {/* Notifications List */}
      {filteredNotifications.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-12 text-center shadow-sm">
          <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-3 text-slate-400">
            <Inbox size={24} />
          </div>
          <h3 className="text-sm font-bold text-slate-700">No notifications found</h3>
          <p className="text-xs text-slate-400 mt-1">
            {filter === "UNREAD"
              ? "You are all caught up! No unread notifications."
              : "You don't have any notifications in this view."}
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredNotifications.map((notif) => (
            <div
              key={notif.id}
              className={`bg-white rounded-xl border p-4 sm:p-5 transition-all shadow-sm ${
                !notif.isRead
                  ? "border-sky-200 bg-sky-50/20 ring-1 ring-sky-100"
                  : "border-slate-200 hover:border-slate-300"
              }`}
            >
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                <div className="space-y-1.5 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span
                      className={`text-xs font-extrabold uppercase px-2 py-0.5 rounded ${
                        !notif.isRead
                          ? "bg-sky-100 text-sky-800"
                          : "bg-slate-100 text-slate-600"
                      }`}
                    >
                      {!notif.isRead ? "Unread" : "Read"}
                    </span>

                    {notif.type && (
                      <span className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 bg-slate-100 text-slate-700 rounded border border-slate-200 uppercase">
                        <Tag size={10} />
                        {notif.type.replace(/_/g, " ")}
                      </span>
                    )}

                    <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                      <Clock size={12} />
                      {formatTimestamp(notif.createdAt)}
                    </span>
                  </div>

                  <h3
                    className={`text-sm font-bold leading-snug ${
                      !notif.isRead ? "text-slate-900" : "text-slate-700"
                    }`}
                  >
                    {notif.title}
                  </h3>

                  {/* Complete message without truncation */}
                  <div className="text-xs text-slate-600 whitespace-pre-wrap leading-relaxed">
                    {notif.message}
                  </div>
                </div>

                {/* Right side actions */}
                <div className="flex items-center gap-2 shrink-0 self-end sm:self-start pt-2 sm:pt-0">
                  {notif.link && (
                    <Link
                      href={notif.link}
                      className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-bold text-sky-700 hover:text-sky-800 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors"
                    >
                      View Details
                      <ExternalLink size={12} />
                    </Link>
                  )}

                  {!notif.isRead && (
                    <button
                      onClick={() => handleMarkOneRead(notif.id)}
                      disabled={isPending}
                      className="p-1.5 text-slate-500 hover:text-sky-700 hover:bg-slate-100 rounded-lg transition-colors"
                      title="Mark as read"
                    >
                      <Check size={16} />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(notif.id)}
                    disabled={isPending}
                    className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                    title="Delete notification"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
