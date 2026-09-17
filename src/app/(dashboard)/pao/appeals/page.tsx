import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ROLES } from "@/lib/rbac";
import { getAllAppeals } from "@/services/appeal";
import { PaoAppealsClient } from "@/components/pao-appeals-client";

export const revalidate = 0;

export default async function PaoAppealsPage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  if (
    session.user.role !== ROLES.PROPERTY_ADMINISTRATION_OFFICER &&
    session.user.role !== ROLES.SYSTEM_ADMINISTRATOR
  ) {
    redirect("/unauthorized");
  }

  const [appeals, departments] = await Promise.all([
    getAllAppeals(),
    prisma.organizationalUnit.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true, code: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <PaoAppealsClient
        appeals={appeals as unknown as React.ComponentProps<typeof PaoAppealsClient>["appeals"]}
        departments={departments}
      />
    </div>
  );
}
