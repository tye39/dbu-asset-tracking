import React from "react";
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { ProfileClient } from "@/components/profile-client";

export const revalidate = 0;

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user?.id) {
    redirect("/login");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      role: true,
      department: true
    }
  });

  if (!user) {
    redirect("/login");
  }

  const userDetails = {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role.name,
    department: user.department?.name || "N/A"
  };

  return <ProfileClient user={userDetails} />;
}
