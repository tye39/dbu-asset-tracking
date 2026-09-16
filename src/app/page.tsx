import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRoleDashboard, isValidRole } from "@/lib/rbac";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user || !isValidRole(session.user.role)) {
    redirect("/login");
  }

  const destination = getRoleDashboard(session.user.role);
  redirect(destination);
}
