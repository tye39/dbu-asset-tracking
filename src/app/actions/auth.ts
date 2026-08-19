"use server";

import { signIn, signOut, auth } from "@/auth";
import { AuthError } from "next-auth";
import { createAuditLog } from "@/services/audit";

export async function loginAction(prevState: unknown, formData: FormData) {
  const email = formData.get("email");
  const password = formData.get("password");

  if (!email || !password) {
    return { error: "Please fill in all fields" };
  }

  try {
    await signIn("credentials", {
      email,
      password,
      redirect: true,
      redirectTo: "/",
    });
    return { success: true };
  } catch (error) {
    if (error instanceof AuthError) {
      switch (error.type) {
        case "CredentialsSignin":
          return { error: "Invalid email or password." };
        default:
          return { error: "Something went wrong during login." };
      }
    }
    throw error;
  }
}

export async function logoutAction() {
  const session = await auth();
  if (session?.user?.id) {
    await createAuditLog(session.user.id, "LOGOUT", "Authentication", session.user.id);
  }
  await signOut({ redirectTo: "/login" });
}
