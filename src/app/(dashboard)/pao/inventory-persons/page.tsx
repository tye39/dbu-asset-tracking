import React from "react";
import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getInventoryPersons } from "@/services/inventory-person";
import { InventoryPersonsClient } from "@/components/inventory-persons-client";

export const revalidate = 0;

export default async function InventoryPersonsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  // RBAC check: only PROPERTY_ADMINISTRATION_OFFICER and SYSTEM_ADMINISTRATOR can access
  const role = session.user.role;
  if (role !== "PROPERTY_ADMINISTRATION_OFFICER" && role !== "SYSTEM_ADMINISTRATOR") {
    return (
      <div className="p-8 text-center text-red-655 font-bold">
        Permission denied. Only Property Administration Officers can manage Inventory Persons.
      </div>
    );
  }

  // Fetch all registered inventory persons
  const registeredPersonsData = await getInventoryPersons();

  // Fetch all active departments for the selection input dropdown
  const departments = await prisma.organizationalUnit.findMany({
    where: { deletedAt: null, status: "ACTIVE" },
    select: { id: true, name: true, code: true },
    orderBy: { name: "asc" }
  });

  // Format serializable registered persons
  const registeredPersons = registeredPersonsData.map(person => ({
    id: person.id,
    userId: person.userId,
    isActive: person.isActive,
    registeredAt: person.registeredAt.toISOString(),
    user: {
      name: person.user.name,
      username: person.user.username || "",
      email: person.user.email,
      roleName: person.user.role.name,
      departmentId: person.user.department?.id || "",
      departmentName: person.user.department?.name || "N/A",
      phoneNumber: person.user.phoneNumber || "",
      employeeId: person.user.employeeId || ""
    },
    registeredBy: {
      name: person.registeredBy.name
    },
    assignments: person.sessions.map(s => ({
      id: s.id,
      sessionNumber: s.sessionNumber,
      status: s.status,
      departmentName: s.department.name,
      verifiedCount: s.verifications.length
    }))
  }));

  return (
    <InventoryPersonsClient
      registeredPersons={registeredPersons}
      departments={departments}
    />
  );
}
