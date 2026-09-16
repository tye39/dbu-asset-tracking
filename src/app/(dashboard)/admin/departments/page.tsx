import React from "react";
import { prisma } from "@/lib/db";
import { DepartmentManagementClient } from "@/components/department-management-client";

export const revalidate = 0;

export default async function ManageDepartmentsPage() {
  const [faculties, departments] = await Promise.all([
    prisma.faculty.findMany({
      where: { deletedAt: null },
      include: { departments: { where: { deletedAt: null } } },
      orderBy: { name: "asc" },
    }),
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      include: { faculty: true, parent: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return <DepartmentManagementClient faculties={faculties} departments={departments} />;
}
