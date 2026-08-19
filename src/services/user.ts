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
  // Check business rule: Users with historical transactions cannot be deleted
  const user = await prisma.user.findUnique({
    where: { id },
    include: {
      assignmentsCreated: { take: 1 },
      assignmentsTo: { take: 1 },
      transfersRequested: { take: 1 },
      transfersApproved: { take: 1 },
      returnsMade: { take: 1 },
      returnsReceived: { take: 1 },
      maintenanceFiled: { take: 1 },
      maintenanceDone: { take: 1 },
      disposals: { take: 1 },
    },
  });

  if (!user) throw new Error("User not found");

  const hasHistory =
    user.assignmentsCreated.length > 0 ||
    user.assignmentsTo.length > 0 ||
    user.transfersRequested.length > 0 ||
    user.transfersApproved.length > 0 ||
    user.returnsMade.length > 0 ||
    user.returnsReceived.length > 0 ||
    user.maintenanceFiled.length > 0 ||
    user.maintenanceDone.length > 0 ||
    user.disposals.length > 0;

  if (hasHistory) {
    throw new Error("Cannot delete user: user has historical transactions in the system.");
  }

  // Soft delete user
  const deletedUser = await prisma.user.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog(actorId, "DELETE", "User", id, { name: user.name, email: user.email }, { deleted: true });
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
