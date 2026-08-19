import { prisma } from "@/lib/db";
import { createAuditLog } from "./audit";

// Faculty Services
export async function createFaculty(data: { name: string; code: string }, actorId: string) {
  const faculty = await prisma.faculty.create({ data });
  await createAuditLog(actorId, "CREATE", "Faculty", faculty.id, null, faculty);
  return faculty;
}

export async function getFaculties() {
  return await prisma.faculty.findMany({
    where: { deletedAt: null },
    include: { departments: { where: { deletedAt: null } } },
    orderBy: { name: "asc" },
  });
}

export async function deleteFaculty(id: string, actorId: string) {
  // Check if any departments inside this faculty have assets
  const faculty = await prisma.faculty.findUnique({
    where: { id },
    include: {
      departments: {
        where: { deletedAt: null },
        include: {
          assets: { where: { deletedAt: null }, take: 1 },
        },
      },
    },
  });

  if (!faculty) throw new Error("Faculty not found");

  const hasAssets = faculty.departments.some((dept) => dept.assets.length > 0);
  if (hasAssets) {
    throw new Error("Cannot delete faculty: one or more departments contain active assets.");
  }

  // Soft delete faculty and its departments
  await prisma.$transaction([
    prisma.organizationalUnit.updateMany({
      where: { facultyId: id, deletedAt: null },
      data: { deletedAt: new Date() },
    }),
    prisma.faculty.update({
      where: { id },
      data: { deletedAt: new Date() },
    }),
  ]);

  await createAuditLog(actorId, "DELETE", "Faculty", id, { name: faculty.name, code: faculty.code }, { deleted: true });
}

// Department / OrganizationalUnit Services
export async function createDepartment(
  data: {
    name: string;
    code: string;
    facultyId?: string;
    type?: string;
    parentId?: string;
    headOfUnit?: string;
    officeLocation?: string;
    contactInfo?: string;
    description?: string;
  },
  actorId: string
) {
  const department = await prisma.organizationalUnit.create({
    data: {
      name: data.name,
      code: data.code,
      type: data.type || "DEPARTMENT",
      parentId: data.parentId || null,
      headOfUnit: data.headOfUnit || null,
      officeLocation: data.officeLocation || null,
      contactInfo: data.contactInfo || null,
      description: data.description || null,
      facultyId: data.facultyId || null,
    },
    include: { faculty: true },
  });
  await createAuditLog(actorId, "CREATE", "OrganizationalUnit", department.id, null, {
    name: department.name,
    code: department.code,
    type: department.type,
  });
  return department;
}

export async function updateDepartment(
  id: string,
  data: {
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
  },
  actorId: string
) {
  const updated = await prisma.organizationalUnit.update({
    where: { id },
    data,
  });
  await createAuditLog(actorId, "UPDATE", "OrganizationalUnit", id, null, { name: updated.name });
  return updated;
}

export async function getDepartments() {
  return await prisma.organizationalUnit.findMany({
    where: { deletedAt: null },
    include: { faculty: true, parent: true },
    orderBy: { name: "asc" },
  });
}

export async function deleteDepartment(id: string, actorId: string) {
  // Check business rule: Units with assets cannot be deleted
  const dept = await prisma.organizationalUnit.findUnique({
    where: { id },
    include: {
      assets: {
        where: { deletedAt: null },
        take: 1,
      },
    },
  });

  if (!dept) throw new Error("Organizational Unit not found");

  if (dept.assets.length > 0) {
    throw new Error("Cannot delete unit: unit contains registered assets.");
  }

  const deletedDept = await prisma.organizationalUnit.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await createAuditLog(actorId, "DELETE", "OrganizationalUnit", id, { name: dept.name, code: dept.code }, { deleted: true });
  return deletedDept;
}
