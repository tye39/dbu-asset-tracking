"use server";

import { createUser, updateUser, deleteUser } from "@/services/user";
import { createDepartment, updateDepartment, deleteDepartment, createFaculty, deleteFaculty } from "@/services/department";
import { createCategory, deleteCategory } from "@/services/category";
import { auth } from "@/auth";
import { revalidatePath } from "next/cache";

// User actions
export async function createUserAction(prevState: unknown, data: {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  departmentId?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const user = await createUser(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, user };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create user.";
    return { error: msg };
  }
}

export async function updateUserAction(prevState: unknown, data: {
  id: string;
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  departmentId?: string | null;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const { id, ...updateData } = data;
  try {
    const user = await updateUser(id, updateData, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, user };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update user.";
    return { error: msg };
  }
}

export async function deleteUserAction(prevState: unknown, id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await deleteUser(id, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete user.";
    return { error: msg };
  }
}

// Department / OrganizationalUnit actions
export async function createDepartmentAction(prevState: unknown, data: {
  name: string;
  code: string;
  facultyId?: string;
  type?: string;
  parentId?: string;
  headOfUnit?: string;
  officeLocation?: string;
  contactInfo?: string;
  description?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const department = await createDepartment(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, department };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create unit.";
    return { error: msg };
  }
}

export async function updateDepartmentAction(prevState: unknown, data: {
  id: string;
  name?: string;
  code?: string;
  facultyId?: string | null;
  type?: string;
  parentId?: string | null;
  headOfUnit?: string | null;
  officeLocation?: string | null;
  contactInfo?: string | null;
  description?: string | null;
  status?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  const { id, ...updateData } = data;
  try {
    const department = await updateDepartment(id, updateData, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, department };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to update unit.";
    return { error: msg };
  }
}

export async function deleteDepartmentAction(prevState: unknown, id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await deleteDepartment(id, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete unit.";
    return { error: msg };
  }
}

// Faculty actions
export async function createFacultyAction(prevState: unknown, data: {
  name: string;
  code: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const faculty = await createFaculty(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, faculty };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create faculty.";
    return { error: msg };
  }
}

export async function deleteFacultyAction(prevState: unknown, id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await deleteFaculty(id, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete faculty.";
    return { error: msg };
  }
}

// Category actions
export async function createCategoryAction(prevState: unknown, data: {
  name: string;
  code: string;
  description?: string;
}) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    const category = await createCategory(data, session.user.id);
    revalidatePath("/", "layout");
    return { success: true, category };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to create category.";
    return { error: msg };
  }
}

export async function deleteCategoryAction(prevState: unknown, id: string) {
  const session = await auth();
  if (!session?.user?.id) return { error: "Unauthorized." };

  try {
    await deleteCategory(id, session.user.id);
    revalidatePath("/", "layout");
    return { success: true };
  } catch (error: unknown) {
    const msg = error instanceof Error ? error.message : "Failed to delete category.";
    return { error: msg };
  }
}
