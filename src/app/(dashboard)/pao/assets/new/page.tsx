import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AssetRegistrationClient } from "@/components/asset-registration-client";

export const revalidate = 0;

export default async function NewAssetPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const [categories, departments] = await Promise.all([
    prisma.assetCategory.findMany({
      where: { deletedAt: null },
      include: {
        assetTypes: true
      },
      orderBy: { name: "asc" },
    }),
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    })
  ]);

  return (
    <AssetRegistrationClient
      categories={categories}
      departments={departments}
    />
  );
}
