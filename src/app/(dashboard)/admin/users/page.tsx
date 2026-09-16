import React from "react";
import { prisma } from "@/lib/db";
import { UserManagementClient } from "@/components/user-management-client";

export const revalidate = 0;

export default async function ManageUsersPage() {
  const [users, roles, departments] = await Promise.all([
    prisma.user.findMany({
      where: { deletedAt: null },
      include: { role: true, department: true },
      orderBy: { name: "asc" },
    }),
    prisma.role.findMany({
      orderBy: { name: "asc" },
    }),
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      orderBy: { name: "asc" },
    }),
  ]);

  return <UserManagementClient users={users} roles={roles} departments={departments} />;
}
