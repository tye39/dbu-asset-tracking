import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getRoleDashboard, isValidRole } from "@/lib/rbac";
import LoginPage from "@/app/(auth)/login/page";

export const dynamic = "force-dynamic";

export default async function RootPage() {
  const session = await auth();

  if (session?.user && isValidRole(session.user.role)) {
    const destination = getRoleDashboard(session.user.role);
    redirect(destination);
  }

  return <LoginPage />;
}
