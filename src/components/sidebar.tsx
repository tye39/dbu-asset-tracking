"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { DbuLogo } from "./dbu-logo";
import {
  LayoutDashboard,
  PlusCircle,
  List,
  Users,
  Building,
  Tags,
  Wrench,
  FolderTree,
  History,
  Settings,
  ClipboardList,
  UserCheck,
  LucideIcon,
  X
} from "lucide-react";

interface SidebarProps {
  user: {
    name: string;
    email: string;
    role: string;
    departmentName?: string | null;
    isInventoryPerson?: boolean;
  };
  isMobileOpen?: boolean;
  onClose?: () => void;
}

export function Sidebar({ user, isMobileOpen = false, onClose }: SidebarProps) {
  const pathname = usePathname();

  const getNavItems = () => {
    let items: { name: string; href: string; icon: LucideIcon }[] = [];
    switch (user.role) {
      case "SYSTEM_ADMINISTRATOR":
        items = [
          { name: "Dashboard", href: "/admin/dashboard", icon: LayoutDashboard },
          { name: "Manage Users", href: "/admin/users", icon: Users },
          { name: "Faculties & Depts", href: "/admin/departments", icon: Building },
          { name: "Asset Categories", href: "/admin/categories", icon: Tags },
          { name: "Form Builder", href: "/admin/asset-form-builder", icon: Settings },
          { name: "System Audit Logs", href: "/admin/audit-logs", icon: History },
        ];
        break;
      case "PROPERTY_ADMINISTRATION_OFFICER":
        items = [
          { name: "Dashboard", href: "/pao/dashboard", icon: LayoutDashboard },
          { name: "Register Asset", href: "/pao/assets/new", icon: PlusCircle },
          { name: "Asset Inventory", href: "/pao/assets", icon: List },
          { name: "Assignments", href: "/pao/assignments", icon: FolderTree },
          { name: "Inventory Persons", href: "/pao/inventory-persons", icon: UserCheck },
          { name: "Inventory", href: "/pao/inventory", icon: ClipboardList },
        ];
        break;
      case "DEPARTMENT_HEAD":
        items = [
          { name: "Dashboard", href: "/head/dashboard", icon: LayoutDashboard },
          { name: "Department Assets", href: "/head/assets", icon: List },
        ];
        break;
      case "STAFF_MEMBER":
        items = [
          { name: "Dashboard", href: "/staff/dashboard", icon: LayoutDashboard },
          { name: "My Assets", href: "/staff/assets", icon: List },
        ];
        break;
      case "MAINTENANCE_TECHNICIAN":
        items = [
          { name: "Dashboard", href: "/tech/dashboard", icon: LayoutDashboard },
          { name: "Maintenance Tasks", href: "/tech/maintenance", icon: Wrench },
        ];
        break;
      case "INTERNAL_AUDITOR":
        items = [
          { name: "Audit Dashboard", href: "/auditor/dashboard", icon: LayoutDashboard },
        ];
        break;
      case "INVENTORY_PERSON":
        items = [
          { name: "My Inventory Tasks", href: "/inventory", icon: ClipboardList }
        ];
        break;
      default:
        items = [];
    }

    return items;
  };

  const navItems = getNavItems();

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case "SYSTEM_ADMINISTRATOR":
        return "bg-blue-600/20 text-blue-300 border-blue-500/30";
      case "PROPERTY_ADMINISTRATION_OFFICER":
        return "bg-sky-600/20 text-sky-300 border-sky-500/30";
      case "DEPARTMENT_HEAD":
        return "bg-green-600/20 text-green-300 border-green-500/30";
      case "STAFF_MEMBER":
        return "bg-purple-600/20 text-purple-300 border-purple-500/30";
      case "MAINTENANCE_TECHNICIAN":
        return "bg-orange-600/20 text-orange-300 border-orange-500/30";
      case "INTERNAL_AUDITOR":
        return "bg-teal-600/20 text-teal-300 border-teal-500/30";
      case "INVENTORY_PERSON":
        return "bg-yellow-600/20 text-yellow-300 border-yellow-500/30";
      default:
        return "bg-slate-600/20 text-slate-300 border-slate-500/30";
    }
  };

  const getRoleDisplayName = (role: string) => {
    return role.replace(/_/g, " ");
  };

  return (
    <aside
      className={`fixed inset-y-0 left-0 z-50 lg:static lg:z-auto w-64 bg-[#0b4a6e] text-white flex flex-col justify-between shadow-2xl shrink-0 select-none border-r border-sky-950 transform transition-transform duration-300 ease-in-out ${
        isMobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      }`}
    >
      <div className="flex flex-col h-full overflow-y-auto">
        {/* Logo and Brand Title Header */}
        <div className="flex items-center justify-between p-6 border-b border-sky-950/50 bg-sky-950/10">
          <div className="flex items-center space-x-3">
            <DbuLogo className="w-10 h-10 shrink-0" />
            <div className="overflow-hidden">
              <h1 className="font-bold text-sm tracking-wider text-white whitespace-nowrap leading-none">
                DEBRE BERHAN
              </h1>
              <p className="text-[9px] text-yellow-400 font-semibold tracking-widest mt-1">
                ASSET TRACKING
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden text-sky-200 hover:text-white p-1 rounded-lg focus:outline-none"
            aria-label="Close menu"
          >
            <X size={20} />
          </button>
        </div>

        {/* User Card */}
        <div className="p-4 mx-4 my-4 bg-sky-950/35 border border-sky-900/40 rounded-xl">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-full bg-yellow-500/10 border border-yellow-500/30 flex items-center justify-center text-yellow-400 font-bold text-sm">
              {user.name.split(" ").map(n => n[0]).join("")}
            </div>
            <div className="overflow-hidden">
              <p className="text-xs font-bold text-white truncate">{user.name}</p>
              <p className="text-[10px] text-sky-200 truncate">{user.email}</p>
              <Link href="/profile" className="text-[9px] text-yellow-400 hover:underline font-bold flex items-center gap-1 mt-1 transition-colors">
                <Settings size={10} /> Profile Settings
              </Link>
            </div>
          </div>
          <div className="mt-2.5 flex items-center justify-between">
            <span className={`text-[8px] font-extrabold uppercase px-2 py-0.5 rounded border ${getRoleBadgeColor(user.role)}`}>
              {getRoleDisplayName(user.role)}
            </span>
            {user.departmentName && (
              <span className="text-[8px] text-slate-300 font-semibold truncate max-w-[120px]">
                {user.departmentName}
              </span>
            )}
          </div>
        </div>

        {/* Navigation Items */}
        <nav className="mt-2 px-3 space-y-1.5 flex-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = (() => {
              if (item.href === "/pao/assets") {
                return pathname === "/pao/assets" || (pathname.startsWith("/pao/assets/") && pathname !== "/pao/assets/new");
              }
              if (item.href === "/pao/inventory") {
                return pathname === "/pao/inventory" || (pathname.startsWith("/pao/inventory/") && !pathname.startsWith("/pao/inventory-persons"));
              }
              return pathname === item.href || pathname.startsWith(item.href + "/");
            })();

            return (
              <Link
                key={item.name}
                href={item.href}
                onClick={onClose}
                className={`flex items-center space-x-3 px-4 py-2.5 rounded-lg text-xs font-semibold tracking-wide transition-all ${
                  isActive
                    ? "bg-yellow-500 text-slate-900 shadow-md transform translate-x-1"
                    : "text-sky-100 hover:bg-sky-900 hover:text-white"
                }`}
              >
                <Icon size={16} className={isActive ? "text-slate-900" : "text-sky-300"} />
                <span>{item.name}</span>
              </Link>
            );
          })}
        </nav>
      </div>

    </aside>
  );
}
