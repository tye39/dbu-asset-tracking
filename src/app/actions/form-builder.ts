"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// Helper to check authorization
async function verifyAdmin() {
  const session = await auth();
  if (!session?.user?.id || session.user.role !== "SYSTEM_ADMINISTRATOR") {
    throw new Error("Unauthorized access. SYSTEM_ADMINISTRATOR only.");
  }
}

/* ==========================================
   1. CATEGORY ACTIONS
   ========================================== */

export async function createCategoryAction(
  prevState: unknown,
  data: { name: string; code: string; description?: string; displayOrder?: number }
) {
  try {
    await verifyAdmin();
    const name = data.name.trim();
    const code = data.code.trim().toUpperCase();

    if (!name || !code) {
      return { error: "Name and Code are required." };
    }

    const existing = await prisma.assetCategory.findFirst({
      where: {
        OR: [{ name }, { code }]
      }
    });

    if (existing) {
      return { error: "A category with that Name or Code already exists." };
    }

    const category = await prisma.assetCategory.create({
      data: {
        name,
        code,
        description: data.description || null,
        displayOrder: data.displayOrder || 0,
        isActive: true
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, category };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to create category." };
  }
}

export async function updateCategoryAction(
  id: string,
  data: { name?: string; code?: string; description?: string; isActive?: boolean; displayOrder?: number }
) {
  try {
    await verifyAdmin();
    const category = await prisma.assetCategory.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        code: data.code?.trim().toUpperCase(),
        description: data.description,
        isActive: data.isActive,
        displayOrder: data.displayOrder
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, category };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update category." };
  }
}

export async function deleteCategoryAction(id: string) {
  try {
    await verifyAdmin();
    
    // Check if category has assets
    const assetCount = await prisma.asset.count({ where: { categoryId: id } });
    if (assetCount > 0) {
      return { error: "Cannot delete category containing existing registered assets." };
    }

    await prisma.assetCategory.delete({ where: { id } });
    
    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to delete category." };
  }
}

/* ==========================================
   2. ASSET TYPE ACTIONS
   ========================================== */

export async function createAssetTypeAction(
  prevState: unknown,
  data: { name: string; categoryId: string; description?: string; icon?: string; displayOrder?: number }
) {
  try {
    await verifyAdmin();
    const name = data.name.trim();

    if (!name || !data.categoryId) {
      return { error: "Name and Category are required." };
    }

    const type = await prisma.assetType.create({
      data: {
        name,
        categoryId: data.categoryId,
        description: data.description || null,
        icon: data.icon || null,
        displayOrder: data.displayOrder || 0,
        isActive: true
      }
    });

    // Automatically bind core fields to the newly created asset type
    const coreFields = await prisma.registrationField.findMany({
      where: {
        name: {
          in: ["name", "serialNumber", "purchaseCost", "purchaseDate", "usefulLife", "salvageValue", "fundingSource", "warrantyStartDate", "warrantyEndDate"]
        }
      }
    });

    let order = 1;
    await prisma.assetTypeField.createMany({
      data: coreFields.map((f) => ({
        assetTypeId: type.id,
        fieldId: f.id,
        isEnabled: true,
        isRequired: ["name", "serialNumber", "purchaseCost", "purchaseDate"].includes(f.name),
        displayOrder: order++
      }))
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, type };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to create asset type." };
  }
}

export async function updateAssetTypeAction(
  id: string,
  data: { name?: string; categoryId?: string; description?: string; icon?: string; isActive?: boolean; displayOrder?: number }
) {
  try {
    await verifyAdmin();
    const type = await prisma.assetType.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        categoryId: data.categoryId,
        description: data.description,
        icon: data.icon,
        isActive: data.isActive,
        displayOrder: data.displayOrder
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, type };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update asset type." };
  }
}

export async function deleteAssetTypeAction(id: string) {
  try {
    await verifyAdmin();

    const assetCount = await prisma.asset.count({ where: { assetTypeId: id } });
    if (assetCount > 0) {
      return { error: "Cannot delete asset type linked to existing registered assets." };
    }

    await prisma.assetType.delete({ where: { id } });

    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to delete asset type." };
  }
}

/* ==========================================
   3. FIELD ACTIONS (RegistrationField)
   ========================================== */

export async function createFieldAction(
  prevState: unknown,
  data: { name: string; label: string; fieldType: string; placeholder?: string; description?: string; options?: string; defaultValue?: string }
) {
  try {
    await verifyAdmin();
    const rawName = data.name.trim().toLowerCase().replace(/\s+/g, "_").replace(/[^a-z0-9_]/g, "");
    const label = data.label.trim();

    if (!rawName || !label || !data.fieldType) {
      return { error: "Name, Label, and Type are required." };
    }

    const existing = await prisma.registrationField.findUnique({
      where: { name: rawName }
    });
    if (existing) {
      return { error: `A field with identifier "${rawName}" already exists.` };
    }

    const field = await prisma.registrationField.create({
      data: {
        name: rawName,
        label,
        fieldType: data.fieldType,
        placeholder: data.placeholder || null,
        description: data.description || null,
        options: data.options || null,
        defaultValue: data.defaultValue || null,
        isActive: true
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, field };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to create field." };
  }
}

export async function updateFieldAction(
  id: string,
  data: { label?: string; placeholder?: string; description?: string; options?: string; defaultValue?: string; isActive?: boolean }
) {
  try {
    await verifyAdmin();
    const field = await prisma.registrationField.update({
      where: { id },
      data: {
        label: data.label?.trim(),
        placeholder: data.placeholder,
        description: data.description,
        options: data.options,
        defaultValue: data.defaultValue,
        isActive: data.isActive
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, field };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update field." };
  }
}

export async function deleteFieldAction(id: string) {
  try {
    await verifyAdmin();
    await prisma.registrationField.delete({ where: { id } });
    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to delete field." };
  }
}

/* ==========================================
   4. ASSET TYPE FIELD CONFIGURATIONS
   ========================================== */

export async function saveAssetTypeConfigAction(
  assetTypeId: string,
  fieldsConfig: {
    fieldId: string;
    isEnabled: boolean;
    isRequired: boolean;
    displayOrder: number;
    defaultValue?: string | null;
    options?: string | null;
  }[]
) {
  try {
    await verifyAdmin();

    // Use transaction to delete and recreate or upsert
    await prisma.$transaction(
      fieldsConfig.map((cfg) =>
        prisma.assetTypeField.upsert({
          where: {
            assetTypeId_fieldId: { assetTypeId, fieldId: cfg.fieldId }
          },
          update: {
            isEnabled: cfg.isEnabled,
            isRequired: cfg.isRequired,
            displayOrder: cfg.displayOrder,
            defaultValue: cfg.defaultValue || null,
            options: cfg.options || null
          },
          create: {
            assetTypeId,
            fieldId: cfg.fieldId,
            isEnabled: cfg.isEnabled,
            isRequired: cfg.isRequired,
            displayOrder: cfg.displayOrder,
            defaultValue: cfg.defaultValue || null,
            options: cfg.options || null
          }
        })
      )
    );

    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to save field configuration." };
  }
}

/* ==========================================
   5. SUPPLIER ACTIONS
   ========================================== */

export async function createSupplierAction(
  prevState: unknown,
  data: { name: string; contactPerson?: string; email?: string; phone?: string; address?: string }
) {
  try {
    await verifyAdmin();
    const name = data.name.trim();

    if (!name) {
      return { error: "Supplier Name is required." };
    }

    const existing = await prisma.supplier.findUnique({ where: { name } });
    if (existing) {
      return { error: "A supplier with that name already exists." };
    }

    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: data.contactPerson || null,
        email: data.email || null,
        phone: data.phone || null,
        address: data.address || null,
        isActive: true
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, supplier };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to create supplier." };
  }
}

export async function updateSupplierAction(
  id: string,
  data: { name?: string; contactPerson?: string; email?: string; phone?: string; address?: string; isActive?: boolean }
) {
  try {
    await verifyAdmin();
    const supplier = await prisma.supplier.update({
      where: { id },
      data: {
        name: data.name?.trim(),
        contactPerson: data.contactPerson,
        email: data.email,
        phone: data.phone,
        address: data.address,
        isActive: data.isActive
      }
    });

    revalidatePath("/admin/asset-form-builder");
    return { success: true, supplier };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update supplier." };
  }
}

export async function deleteSupplierAction(id: string) {
  try {
    await verifyAdmin();
    
    // Check if supplier is linked to assets
    const assetCount = await prisma.asset.count({ where: { supplierId: id } });
    if (assetCount > 0) {
      return { error: "Cannot delete supplier linked to registered assets." };
    }

    await prisma.supplier.delete({ where: { id } });

    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to delete supplier." };
  }
}

/* ==========================================
   6. SUPPLIER ASSIGNMENT ACTIONS
   ========================================== */

export async function saveSupplierAssignmentsAction(
  supplierId: string,
  assignments: { categoryId: string | null; assetTypeId: string | null }[]
) {
  try {
    await verifyAdmin();

    // Delete existing assignments for this supplier
    await prisma.supplierAssignment.deleteMany({
      where: { supplierId }
    });

    // Create new assignments
    if (assignments.length > 0) {
      await prisma.supplierAssignment.createMany({
        data: assignments.map((assign) => ({
          supplierId,
          categoryId: assign.categoryId || null,
          assetTypeId: assign.assetTypeId || null,
          isActive: true
        }))
      });
    }

    revalidatePath("/admin/asset-form-builder");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to save supplier assignments." };
  }
}
