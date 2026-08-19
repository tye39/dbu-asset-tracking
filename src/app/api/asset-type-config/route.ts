import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const assetTypeId = searchParams.get("assetTypeId");

    if (!assetTypeId) {
      return NextResponse.json(
        { error: "assetTypeId is required" },
        { status: 400 }
      );
    }

    const assetType = await prisma.assetType.findUnique({
      where: { id: assetTypeId },
      select: { categoryId: true }
    });

    if (!assetType) {
      return NextResponse.json(
        { error: "Asset Type not found" },
        { status: 404 }
      );
    }

    // Fetch enabled fields configured for this specific Asset Type
    const typeFields = await prisma.assetTypeField.findMany({
      where: {
        assetTypeId,
        isEnabled: true,
        field: { isActive: true }
      },
      include: {
        field: true
      },
      orderBy: {
        displayOrder: "asc"
      }
    });

    // Fetch suppliers assigned to this category or specific asset type
    const supplierAssignments = await prisma.supplierAssignment.findMany({
      where: {
        isActive: true,
        supplier: { isActive: true },
        OR: [
          { assetTypeId },
          { categoryId: assetType.categoryId }
        ]
      },
      include: {
        supplier: true
      }
    });

    // Map to clean formats
    const fields = typeFields.map((tf) => ({
      id: tf.field.id,
      name: tf.field.name,
      label: tf.field.label,
      fieldType: tf.field.fieldType,
      placeholder: tf.field.placeholder,
      description: tf.field.description,
      defaultValue: tf.defaultValue || tf.field.defaultValue,
      options: tf.options || tf.field.options,
      isRequired: tf.isRequired
    }));

    const suppliers = Array.from(
      new Map(
        supplierAssignments
          .filter((sa) => sa.supplier)
          .map((sa) => [sa.supplier.id, sa.supplier])
      ).values()
    );

    return NextResponse.json({ fields, suppliers });
  } catch (error: unknown) {
    console.error("Error loading asset type configuration:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
