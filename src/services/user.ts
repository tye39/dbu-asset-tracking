import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import * as bcrypt from "bcryptjs";
import { Prisma } from "@prisma/client";

export async function createUser(data: {
  name: string;
  email: string;
  password?: string;
  roleId: string;
  departmentId?: string;
}, actorId: string) {
  const passwordHash = await bcrypt.hash(data.password || "Password123", 10);
  
  const user = await prisma.user.create({
    data: {
      name: data.name,
      email: data.email,
      passwordHash,
      roleId: data.roleId,
      departmentId: data.departmentId || null,
    },
    include: {
      role: true,
      department: true,
    },
  });

  await createAuditLog(
    actorId,
    "CREATE",
    "User",
    user.id,
    null,
    { name: user.name, email: user.email, role: user.role.name, department: user.department?.name }
  );

  return user;
}

export async function updateUser(id: string, data: {
  name?: string;
  email?: string;
  password?: string;
  roleId?: string;
  departmentId?: string | null;
}, actorId: string) {
  const previousUser = await prisma.user.findUnique({
    where: { id },
    include: { role: true, department: true }
  });

  if (!previousUser) throw new Error("User not found");

  const updateData: Prisma.UserUncheckedUpdateInput = {
    name: data.name,
    email: data.email,
    roleId: data.roleId,
    departmentId: data.departmentId,
  };
  if (data.password) {
    updateData.passwordHash = await bcrypt.hash(data.password, 10);
  }

  const user = await prisma.user.update({
    where: { id },
    data: updateData,
    include: {
      role: true,
      department: true,
    },
  });

  await createAuditLog(
    actorId,
    "UPDATE",
    "User",
    user.id,
    { name: previousUser.name, email: previousUser.email, role: previousUser.role.name, department: previousUser.department?.name },
    { name: user.name, email: user.email, role: user.role.name, department: user.department?.name }
  );

  return user;
}

export async function deleteUser(id: string, actorId: string) {
  const user = await prisma.user.findUnique({
    where: { id },
  });

  if (!user) throw new Error("User not found");

  // Soft delete user by setting deletedAt timestamp (preserves historical transaction references)
  const deletedUser = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  // Deactivate InventoryPerson profile if one exists
  await prisma.inventoryPerson.updateMany({
    where: { userId: id },
    data: { isActive: false },
  });

  await createAuditLog(actorId, "DELETE", "User", id, { name: user.name, email: user.email }, { deletedAt: new Date() });
  return deletedUser;
}

export async function getUsers() {
  return await prisma.user.findMany({
    where: { deletedAt: null },
    include: {
      role: true,
      department: true,
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getUserById(id: string) {
  return await prisma.user.findFirst({
    where: { id, deletedAt: null },
    include: {
      role: true,
      department: true,
    },
  });
}
