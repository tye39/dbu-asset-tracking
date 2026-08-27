import React from "react";
import { prisma } from "@/lib/db";//importing the prisma database
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { AssetFormBuilderClient } from "@/components/asset-form-builder-client";

export const revalidate = 0;//helps ensure the page gets fresh data.
export default async function AssetFormBuilderPage() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SYSTEM_ADMINISTRATOR") {
    redirect("/login");
  }

  // Fetch all initial data
  const [categories, assetTypes, fields, typeFields, suppliers, supplierAssignments] = await Promise.all([
    prisma.assetCategory.findMany({
      where: { deletedAt: null },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.assetType.findMany({
      include: {
        formFields: true,
        supplierAssignments: true
      },
      orderBy: { displayOrder: "asc" }
    }),
    prisma.registrationField.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.assetTypeField.findMany({
      include: { field: true }
    }),
    prisma.supplier.findMany({
      orderBy: { name: "asc" }
    }),
    prisma.supplierAssignment.findMany({
      include: { supplier: true }
    })
  ]);

  return (
    <AssetFormBuilderClient
      categories={categories}
      assetTypes={assetTypes}
      initialFields={fields}
      initialTypeFields={typeFields}
      initialSuppliers={suppliers}
      initialSupplierAssignments={supplierAssignments}
    />
  );
}
