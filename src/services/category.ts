import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";

export async function createCategory(data: { name: string; code: string; description?: string }, actorId: string) {
  const category = await prisma.assetCategory.create({ data });
  await createAuditLog(actorId, "CREATE", "AssetCategory", category.id, null, category);
  return category;
}

export async function updateCategory(id: string, data: { name?: string; code?: string; description?: string }, actorId: string) {
  const previous = await prisma.assetCategory.findUnique({ where: { id } });
  if (!previous) throw new Error("Category not found");

  const category = await prisma.assetCategory.update({
    where: { id },
    data,
  });

  await createAuditLog(actorId, "UPDATE", "AssetCategory", category.id, previous, category);
  return category;
}

export async function getCategories() {
  return await prisma.assetCategory.findMany({
    where: { deletedAt: null },
    orderBy: { name: "asc" },
  });
}

export async function deleteCategory(id: string, actorId: string) {
  const category = await prisma.assetCategory.findUnique({
    where: { id },
    include: {
      assets: {
        where: { deletedAt: null },
        take: 1,
      },
    },
  });

  if (!category) throw new Error("Category not found");

  if (category.assets.length > 0) {
    throw new Error("Cannot delete category: active assets are assigned to this category.");
  }

  const deleted = await prisma.assetCategory.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog(actorId, "DELETE", "AssetCategory", id, { name: category.name, code: category.code }, { deleted: true });
  return deleted;
}
