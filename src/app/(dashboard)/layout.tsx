import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { Sidebar } from "@/components/sidebar";
import { Header } from "@/components/header";
import { prisma } from "@/lib/db";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const isInventoryPerson = await prisma.inventoryPerson.findUnique({
    where: { userId: session.user.id, isActive: true }
  });

  const user = {
    id: session.user.id,
    name: session.user.name || "Default User",
    email: session.user.email || "user@dbu.edu.et",
    role: session.user.role,
    departmentName: session.user.departmentName,
    isInventoryPerson: !!isInventoryPerson,
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-slate-50">
      {/* Sidebar navigation panel */}
      <Sidebar user={user} />

      {/* Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Header toolbar */}
        <Header user={user} />

        {/* Scrollable page body */}
        <main className="flex-1 overflow-y-auto p-6 focus:outline-none">
          {children}
        </main>
      </div>
    </div>
  );
}
