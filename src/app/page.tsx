import { auth } from "@/auth";
import { redirect } from "next/navigation";

export default async function RootPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const role = session.user.role;
  switch (role) {
    case "SYSTEM_ADMINISTRATOR":
      redirect("/admin/dashboard");
    case "PROPERTY_ADMINISTRATION_OFFICER":
      redirect("/pao/dashboard");
    case "DEPARTMENT_HEAD":
      redirect("/head/dashboard");
    case "STAFF_MEMBER":
      redirect("/staff/dashboard");
    case "MAINTENANCE_TECHNICIAN":
      redirect("/tech/dashboard");
    case "INTERNAL_AUDITOR":
      redirect("/auditor/dashboard");
    case "INVENTORY_PERSON":
      redirect("/inventory");
    default:
      redirect("/login");
  }
}
