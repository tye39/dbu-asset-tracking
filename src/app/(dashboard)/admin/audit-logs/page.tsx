import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getAuditLogs } from "@/services/audit";
import { AuditLogsClient } from "@/components/audit-logs-client";

export const revalidate = 0;

interface AuditLogsPageProps {
  searchParams: {
    search?: string;
    userId?: string;
    roleId?: string;
    action?: string;
    module?: string;
    startDate?: string;
    endDate?: string;
    page?: string;
  };
}

export default async function AuditLogsPage({ searchParams }: AuditLogsPageProps) {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // RBAC check: only SYSTEM_ADMINISTRATOR can access system audit logs
  if (session.user.role !== "SYSTEM_ADMINISTRATOR") {
    return (
      <div className="p-8 text-center text-red-600 font-bold">
        Permission denied. Only System Administrators can access System Audit Logs.
      </div>
    );
  }

  const currentPage = Number(searchParams.page) || 1;
  const currentFilters = {
    search: searchParams.search || "",
    userId: searchParams.userId || "",
    roleId: searchParams.roleId || "",
    action: searchParams.action || "",
    entityType: searchParams.module || "",
    startDate: searchParams.startDate || "",
    endDate: searchParams.endDate || "",
    page: currentPage,
    limit: 15
  };

  const [users, roles, auditLogsData] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" }
    }),
    prisma.role.findMany({
      select: { id: true, name: true },
      orderBy: { name: "asc" }
    }),
    getAuditLogs(currentFilters)
  ]);

  // Format serializable logs
  const serializableLogs = auditLogsData.logs.map(log => ({
    id: log.id,
    action: log.action,
    entityType: log.entityType,
    entityId: log.entityId,
    previousState: log.previousState ? JSON.parse(JSON.stringify(log.previousState)) : null,
    newState: log.newState ? JSON.parse(JSON.stringify(log.newState)) : null,
    ipAddress: log.ipAddress || null,
    createdAt: log.createdAt.toISOString(),
    user: log.user ? {
      name: log.user.name,
      email: log.user.email,
      roleName: log.user.role.name
    } : null
  }));

  const serializableUsers = users.map(u => ({ id: u.id, name: u.name, email: u.email }));
  const serializableRoles = roles.map(r => ({ id: r.id, name: r.name }));

  return (
    <AuditLogsClient
      logs={serializableLogs}
      users={serializableUsers}
      roles={serializableRoles}
      currentPage={currentPage}
      totalPages={auditLogsData.totalPages}
      totalCount={auditLogsData.total}
      currentFilters={currentFilters}
    />
  );
}
