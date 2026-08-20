"use server";

import { registerAsset, updateAsset, softDeleteAsset } from "@/services/asset";
import { disposeAsset } from "@/services/disposal";
import { returnAsset } from "@/services/return";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";
import { FundingSource } from "@prisma/client";

export async function registerAssetAction(prevState: unknown, data: {
  name: string;
  assetCode: string;
  serialNumber: string;
  description?: string;
  categoryId: string;
  departmentId: string;
  imageUrl?: string;
  imageUrls?: string[];
  purchaseDate?: Date;
  purchaseCost?: number;
  procurementCost?: number;
  expectedLifecycleYears?: number;
  usefulLife?: number;
  salvageValue?: number;
  warrantyExpiry?: Date;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
  supplierId?: string;
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceCoverage?: number;
  insurancePremium?: number;
  insuranceExpiry?: Date;
  dynamicValues?: Record<string, string>;

  // Common Registration Fields
  assetTypeId?: string;
  building?: string;
  roomNumber?: string;
  campus?: string;
  quantity?: number;
  condition?: string;
  attachmentUrl?: string;
  remarks?: string;
  assignedToId?: string;

  // Financial fields
  fundingSource?: FundingSource;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const asset = await registerAsset(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, asset };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to register asset." };
  }
}

export async function updateAssetAction(prevState: unknown, id: string, data: {
  name?: string;
  description?: string;
  categoryId?: string;
  departmentId?: string;
  purchaseCost?: number;
  purchaseDate?: Date;
  fundingSource?: FundingSource;
  usefulLife?: number;
  salvageValue?: number;
  warrantyStartDate?: Date;
  warrantyEndDate?: Date;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const asset = await updateAsset(id, data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, asset };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update asset." };
  }
}

export async function deleteAssetAction(prevState: unknown, id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const role = session.user.role;
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied. Only Property Administration Officers or System Administrators can delete assets." };
  }

  try {
    await softDeleteAsset(id, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to delete asset." };
  }
}

export async function disposeAssetAction(prevState: unknown, data: {
  assetId: string;
  reason: string;
  method: string;
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await disposeAsset(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to dispose asset.";
    return { error: msg };
  }
}

export async function returnAssetAction(prevState: unknown, data: {
  assetId: string;
  conditionAtReturn: "GOOD" | "DAMAGED";
  notes?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await returnAsset(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to return asset.";
    return { error: msg };
  }
}
