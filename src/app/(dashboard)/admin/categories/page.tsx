import React from "react";
import { prisma } from "@/lib/db";
import { CategoryManagementClient } from "@/components/category-management-client";

export const revalidate = 0;

export default async function ManageCategoriesPage() {
  const categories = await prisma.assetCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });

  return <CategoryManagementClient categories={categories} />;
}
