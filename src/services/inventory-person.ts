import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";
import * as bcrypt from "bcryptjs";

export interface CreateInventoryPersonInput {
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  departmentId: string;
  employeeId?: string;
  isActive: boolean;
}

export interface UpdateInventoryPersonInput {
  fullName: string;
  username: string;
  email: string;
  phoneNumber?: string;
  password?: string;
  departmentId: string;
  employeeId?: string;
  isActive: boolean;
}

export async function createInventoryPerson(input: CreateInventoryPersonInput, actorId: string) {
  // Required fields check
  if (!input.fullName || !input.username || !input.email || !input.password || !input.departmentId) {
    throw new Error("Missing required registration fields.");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new Error("Invalid email format.");
  }

  // Validate password length
  if (input.password.length < 6) {
    throw new Error("Password must be at least 6 characters long.");
  }

  // Unique email check
  const emailExists = await prisma.user.findFirst({
    where: { email: { equals: input.email, mode: "insensitive" } }
  });
  if (emailExists) {
    throw new Error("This email is already registered.");
  }

  // Unique username check (also ensure it does not conflict with existing user emails)
  const usernameExists = await prisma.user.findFirst({
    where: {
      OR: [
        { username: { equals: input.username, mode: "insensitive" } },
        { email: { equals: input.username, mode: "insensitive" } }
      ]
    }
  });
  if (usernameExists) {
    throw new Error("This username is already in use.");
  }

  // Hash password
  const passwordHash = await bcrypt.hash(input.password, 10);

  // Fetch or create INVENTORY_PERSON role
  let role = await prisma.role.findUnique({
    where: { name: "INVENTORY_PERSON" }
  });
  if (!role) {
    role = await prisma.role.create({
      data: {
        name: "INVENTORY_PERSON",
        description: "Inventory Person responsible specifically for physical asset inventory verification."
      }
    });
  }

  // Transaction
  const person = await prisma.$transaction(async (tx) => {
    // 1. Create User
    const newUser = await tx.user.create({
      data: {
        name: input.fullName,
        email: input.email.toLowerCase(),
        passwordHash,
        username: input.username.toLowerCase(),
        phoneNumber: input.phoneNumber || null,
        employeeId: input.employeeId || null,
        roleId: role.id,
        departmentId: input.departmentId
      }
    });

    // 2. Create InventoryPerson profile
    const newPerson = await tx.inventoryPerson.create({
      data: {
        userId: newUser.id,
        isActive: input.isActive,
        registeredById: actorId
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return newPerson;
  });

  await createAuditLog(
    actorId,
    "CREATE_INVENTORY_PERSON",
    "InventoryPerson",
    person.id,
    null,
    { username: input.username, email: input.email, name: input.fullName }
  );

  return person;
}

export async function updateInventoryPerson(id: string, input: UpdateInventoryPersonInput, actorId: string) {
  const previous = await prisma.inventoryPerson.findUnique({
    where: { id },
    include: { user: true }
  });
  if (!previous) throw new Error("Inventory Person profile not found.");

  // Required fields check
  if (!input.fullName || !input.username || !input.email || !input.departmentId) {
    throw new Error("Missing required registration fields.");
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(input.email)) {
    throw new Error("Invalid email format.");
  }

  // Unique email check (excluding current user)
  const emailExists = await prisma.user.findFirst({
    where: {
      email: { equals: input.email, mode: "insensitive" },
      id: { not: previous.userId }
    }
  });
  if (emailExists) {
    throw new Error("This email is already registered.");
  }

  // Unique username check (excluding current user)
  const usernameExists = await prisma.user.findFirst({
    where: {
      username: { equals: input.username, mode: "insensitive" },
      id: { not: previous.userId }
    }
  });
  if (usernameExists) {
    throw new Error("This username is already in use.");
  }

  let passwordHash = previous.user.passwordHash;
  if (input.password && input.password.trim() !== "") {
    if (input.password.length < 6) {
      throw new Error("Password must be at least 6 characters long.");
    }
    passwordHash = await bcrypt.hash(input.password, 10);
  }

  const person = await prisma.$transaction(async (tx) => {
    // 1. Update User
    await tx.user.update({
      where: { id: previous.userId },
      data: {
        name: input.fullName,
        email: input.email.toLowerCase(),
        passwordHash,
        username: input.username.toLowerCase(),
        phoneNumber: input.phoneNumber || null,
        employeeId: input.employeeId || null,
        departmentId: input.departmentId
      }
    });

    // 2. Update InventoryPerson
    const updated = await tx.inventoryPerson.update({
      where: { id },
      data: {
        isActive: input.isActive
      },
      include: {
        user: {
          select: {
            name: true,
            email: true
          }
        }
      }
    });

    return updated;
  });

  await createAuditLog(
    actorId,
    "UPDATE_INVENTORY_PERSON",
    "InventoryPerson",
    person.id,
    { name: previous.user.name, email: previous.user.email, isActive: previous.isActive },
    { name: person.user.name, email: person.user.email, isActive: person.isActive }
  );

  return person;
}

export async function toggleInventoryPersonStatus(id: string, isActive: boolean, actorId: string) {
  const previous = await prisma.inventoryPerson.findUnique({
    where: { id },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });
  if (!previous) throw new Error("Inventory Person not found.");

  const person = await prisma.inventoryPerson.update({
    where: { id },
    data: { isActive },
    include: {
      user: {
        select: {
          name: true,
          email: true
        }
      }
    }
  });

  const action = isActive ? "ACTIVATE_INVENTORY_PERSON" : "DEACTIVATE_INVENTORY_PERSON";
  await createAuditLog(
    actorId,
    action,
    "InventoryPerson",
    person.id,
    { isActive: previous.isActive },
    { isActive: person.isActive }
  );

  return person;
}

export async function getInventoryPersons() {
  return await prisma.inventoryPerson.findMany({
    include: {
      user: {
        select: {
          id: true,
          name: true,
          email: true,
          username: true,
          phoneNumber: true,
          employeeId: true,
          role: { select: { name: true } },
          department: { select: { id: true, name: true } }
        }
      },
      registeredBy: {
        select: {
          name: true
        }
      },
      sessions: {
        select: {
          id: true,
          sessionNumber: true,
          status: true,
          department: { select: { name: true } },
          verifications: { select: { id: true } }
        }
      }
    },
    orderBy: { registeredAt: "desc" }
  });
}
