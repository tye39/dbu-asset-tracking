"use client";

import React, { useState, useEffect, useCallback, useTransition } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Bell, Search, Check, Loader2, ChevronDown, User, Lock, LogOut, Settings } from "lucide-react";
import { fetchNotificationsAction, markAllReadAction, markOneReadAction } from "@/app/actions/notification";
import { logoutAction } from "@/app/actions/auth";

interface HeaderProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
  };
}

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  isRead: boolean;
  createdAt: Date | string;
}

export function Header({ user }: HeaderProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isPending, startTransition] = useTransition();

  const getRoleAbbrev = (role: string) => {
    switch (role) {
      case "PROPERTY_ADMINISTRATION_OFFICER": return "PAO";
      case "SYSTEM_ADMINISTRATOR": return "SA";
      case "DEPARTMENT_HEAD": return "DH";
      case "STAFF_MEMBER": return "SM";
      case "TECHNICIAN": return "TECH";
      default: return role.substring(0, 3).toUpperCase();
    }
  };

  const getRoleDisplayName = (role: string) => {
    switch (role) {
      case "PROPERTY_ADMINISTRATION_OFFICER": return "Property Admin Officer";
      case "SYSTEM_ADMINISTRATOR": return "System Administrator";
      case "DEPARTMENT_HEAD": return "Department Head";
      case "STAFF_MEMBER": return "Staff Member";
      case "TECHNICIAN": return "Technician";
      default: return role.replace(/_/g, " ");
    }
  };

  const loadNotifications = useCallback(async () => {
    const res = await fetchNotificationsAction(user.id);
    if (res.success && res.list) {
      const list = res.list as NotificationItem[];
      setNotifications(list);
      setUnreadCount(list.filter((n) => !n.isRead).length);
    }
  }, [user.id]);

  // Fetch notifications on mount & when path changes
  useEffect(() => {
    loadNotifications();
  }, [pathname, loadNotifications]);

  const handleMarkAllRead = () => {
    startTransition(async () => {
      await markAllReadAction(user.id);
      await loadNotifications();
    });
  };

  const handleMarkOneRead = (id: string) => {
    startTransition(async () => {
      await markOneReadAction(id);
      await loadNotifications();
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!searchQuery.trim()) return;

    const baseRedirect = 
      user.role === "PROPERTY_ADMINISTRATION_OFFICER" ? "/pao/assets" :
      user.role === "DEPARTMENT_HEAD" ? "/head/assets" : 
      user.role === "SYSTEM_ADMINISTRATOR" ? "/pao/assets" : "/pao/assets";
      
    router.push(`${baseRedirect}?search=${encodeURIComponent(searchQuery)}`);
  };

  const getBreadcrumbs = () => {
    const parts = pathname.split("/").filter(p => p && p !== "dashboard");
    if (parts.length === 0) return ["Dashboard"];
    return parts.map(part => {
      const decoded = decodeURIComponent(part);
      return decoded.charAt(0).toUpperCase() + decoded.slice(1).replace(/-/g, " ");
    });
  };

  const breadcrumbs = getBreadcrumbs();

  return (
    <header className="h-16 bg-white border-b border-slate-200 px-6 flex items-center justify-between shadow-sm relative z-30 select-none">
      {/* Left side: Breadcrumbs */}
      <div className="flex items-center space-x-2 text-xs font-semibold text-slate-500">
        <span className="hover:text-[#0b4a6e] cursor-pointer" onClick={() => router.push("/")}>DBU</span>
        {breadcrumbs.map((crumb, idx) => (
          <React.Fragment key={idx}>
            <span className="text-slate-300">/</span>
            <span className={idx === breadcrumbs.length - 1 ? "text-slate-800 font-bold" : ""}>
              {crumb}
            </span>
          </React.Fragment>
        ))}
      </div>

      {/* Right side: Search, Notifications, Profile */}
      <div className="flex items-center space-x-6">
        {/* Global Asset Search Form */}
        <form onSubmit={handleSearchSubmit} className="relative hidden md:block">
          <input
            type="text"
            placeholder="Global search assets..."
            className="w-64 pl-9 pr-4 py-1.5 bg-slate-50 border border-slate-200 rounded-lg text-xs placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-600 focus:bg-white transition-all"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
          <Search size={14} className="absolute left-3 top-2.5 text-slate-400" />
        </form>

        {/* Notifications Popover wrapper */}
        <div className="relative">
          <button
            onClick={() => setShowNotifications(!showNotifications)}
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-600 relative transition-colors"
          >
            <Bell size={18} />
            {unreadCount > 0 && (
              <span className="absolute top-0.5 right-0.5 w-4 h-4 bg-red-500 text-white rounded-full text-[9px] font-extrabold flex items-center justify-center border border-white animate-pulse">
                {unreadCount}
              </span>
            )}
          </button>

          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1 z-40">
              <div className="flex items-center justify-between px-4 py-2 border-b border-slate-100 bg-slate-50/50">
                <span className="text-xs font-bold text-slate-700">Notifications</span>
                {unreadCount > 0 && (
                  <button
                    onClick={handleMarkAllRead}
                    disabled={isPending}
                    className="text-[10px] font-bold text-sky-700 hover:text-sky-800 disabled:opacity-50 flex items-center"
                  >
                    {isPending ? (
                      <Loader2 size={10} className="animate-spin mr-1" />
                    ) : (
                      <Check size={10} className="mr-1" />
                    )}
                    Mark all read
                  </button>
                )}
              </div>

              <div className="max-h-64 overflow-y-auto">
                {notifications.length === 0 ? (
                  <div className="p-4 text-center text-xs text-slate-400">No notifications yet.</div>
                ) : (
                  notifications.map((notif) => (
                    <div
                      key={notif.id}
                      className={`p-3 border-b border-slate-50 flex flex-col hover:bg-slate-50 transition-colors ${
                        !notif.isRead ? "bg-sky-50/20" : ""
                      }`}
                    >
                      <div className="flex justify-between items-start">
                        <span className={`text-[10px] font-bold ${!notif.isRead ? "text-slate-800" : "text-slate-500"}`}>
                          {notif.title}
                        </span>
                        {!notif.isRead && (
                          <button
                            onClick={() => handleMarkOneRead(notif.id)}
                            className="text-[9px] font-bold text-sky-600 hover:underline"
                          >
                            Mark read
                          </button>
                        )}
                      </div>
                      <p className="text-[10px] text-slate-500 mt-1 leading-normal">{notif.message}</p>
                      <span className="text-[8px] text-slate-400 mt-1.5">
                        {new Date(notif.createdAt).toLocaleDateString()} at{" "}
                        {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </div>

        {/* Profile Dropdown */}
        <div className="relative">
          <button
            onClick={() => setShowProfileMenu(!showProfileMenu)}
            className="flex items-center space-x-2 border-l border-slate-200 pl-4 focus:outline-none hover:opacity-85 transition-opacity"
          >
            <div className="w-8 h-8 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-700 font-extrabold text-xs">
              {getRoleAbbrev(user.role)}
            </div>
            <div className="hidden sm:flex items-center space-x-1">
              <span className="text-xs font-bold text-slate-700 truncate max-w-[150px]">
                {getRoleDisplayName(user.role)}
              </span>
              <ChevronDown size={14} className="text-slate-400" />
            </div>
          </button>

          {showProfileMenu && (
            <div className="absolute right-0 mt-3 w-48 bg-white border border-slate-200 rounded-xl shadow-2xl overflow-hidden py-1.5 z-45">
              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  router.push("/profile");
                }}
                className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <User size={14} className="text-slate-400" />
                <span>Profile Settings</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  router.push("/profile?tab=security");
                }}
                className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Lock size={14} className="text-slate-400" />
                <span>Change Password</span>
              </button>

              <button
                onClick={() => {
                  setShowProfileMenu(false);
                  router.push("/profile");
                }}
                className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
              >
                <Settings size={14} className="text-slate-400" />
                <span>Preferences</span>
              </button>

              <hr className="border-slate-100 my-1.5" />

              <form action={logoutAction}>
                <button
                  type="submit"
                  className="w-full flex items-center space-x-2.5 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition-colors text-left"
                >
                  <LogOut size={14} className="text-slate-400" />
                  <span>Sign Out</span>
                </button>
              </form>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
