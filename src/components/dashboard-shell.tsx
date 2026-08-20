"use client";

import React, { useState } from "react";
import { Sidebar } from "./sidebar";
import { Header } from "./header";
import { PendingAssignmentsPanel } from "./pending-assignments-panel";

interface DashboardShellProps {
  user: {
    id: string;
    name: string;
    email: string;
    role: string;
    departmentName?: string | null;
    isInventoryPerson?: boolean;
  };
  pendingList: Array<{
    id: string;
    assignedAt: Date | string;
    assignedBy: string;
    asset: {
      id: string;
      name: string;
      assetCode: string;
      serialNumber: string;
      condition: string;
      category: string;
      assetTypeName: string;
      department: string;
    };
  }>;
  children: React.ReactNode;
}

export function DashboardShell({ user, pendingList, children }: DashboardShellProps) {
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar navigation panel */}
      <Sidebar
        user={user}
        isMobileOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
      />

      {/* Mobile Overlay Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-40 lg:hidden transition-opacity"
          onClick={() => setIsMobileMenuOpen(false)}
        />
      )}

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header toolbar */}
        <Header
          user={user}
          onToggleMobileMenu={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
        />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 focus:outline-none max-w-full">
          <PendingAssignmentsPanel pendingAssignments={pendingList} />
          {children}
        </main>
      </div>
    </div>
  );
}
