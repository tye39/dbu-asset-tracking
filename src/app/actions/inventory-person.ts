"use server";

import {
  createInventoryPerson,
  updateInventoryPerson,
  toggleInventoryPersonStatus,
  CreateInventoryPersonInput,
  UpdateInventoryPersonInput
} from "@/services/inventory-person";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

export async function registerInventoryPersonAction(input: CreateInventoryPersonInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const role = session.user.role;
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  try {
    const person = await createInventoryPerson(input, session.user.id);
    revalidatePath("/pao/inventory-persons");
    return { success: true, person };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to register Inventory Person." };
  }
}

export async function updateInventoryPersonAction(id: string, input: UpdateInventoryPersonInput) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const role = session.user.role;
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  try {
    const person = await updateInventoryPerson(id, input, session.user.id);
    revalidatePath("/pao/inventory-persons");
    return { success: true, person };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update Inventory Person." };
  }
}

export async function toggleInventoryPersonAction(id: string, isActive: boolean) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const role = session.user.role;
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return { error: "Permission denied." };
  }

  try {
    const person = await toggleInventoryPersonStatus(id, isActive, session.user.id);
    revalidatePath("/pao/inventory-persons");
    return { success: true, person };
  } catch (error: unknown) {
    const err = error as Error;
    return { error: err.message || "Failed to update Inventory Person status." };
  }
}
