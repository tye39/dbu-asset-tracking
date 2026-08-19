"use server";

import { prisma } from "@/lib/db";
import { auth } from "@/auth";
import { createAuditLog } from "@/services/audit";
import * as bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";

export async function changePasswordAction(
  prevState: unknown,
  data: {
    currentPassword: string;
    newPassword: string;
    confirmPassword: string;
  }
) {
  const session = await auth();
  if (!session?.user?.id) {
    return { error: "Unauthorized. Please sign in." };
  }

  const userId = session.user.id;
  const currentPassword = data.currentPassword;
  const newPassword = data.newPassword;
  const confirmPassword = data.confirmPassword;

  if (!currentPassword || !newPassword || !confirmPassword) {
    return { error: "All password fields are required." };
  }

  if (newPassword !== confirmPassword) {
    return { error: "New password and confirm password do not match." };
  }

  if (newPassword === currentPassword) {
    return { error: "New password cannot be the same as your current password." };
  }

  // 1. Password Strength Validation (Section 23)
  // - Minimum 8 characters
  // - At least one uppercase letter
  // - At least one lowercase letter
  // - At least one number
  // - At least one special character
  if (newPassword.length < 8) {
    return { error: "Password must be at least 8 characters long." };
  }
  if (!/[A-Z]/.test(newPassword)) {
    return { error: "Password must contain at least one uppercase letter (A-Z)." };
  }
  if (!/[a-z]/.test(newPassword)) {
    return { error: "Password must contain at least one lowercase letter (a-z)." };
  }
  if (!/[0-9]/.test(newPassword)) {
    return { error: "Password must contain at least one number (0-9)." };
  }
  if (!/[!@#$%^&*(),.?":{}|<>]/.test(newPassword)) {
    return { error: "Password must contain at least one special character (e.g. !, @, #, $, %)." };
  }

  try {
    // Fetch the user's password hash from the database
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true, passwordHash: true }
    });

    if (!user) {
      return { error: "User account not found." };
    }

    // Verify current password (Section 22)
    const passwordMatch = bcrypt.compareSync(currentPassword, user.passwordHash);
    if (!passwordMatch) {
      return { error: "The current password you entered is incorrect." };
    }

    // Hash the new password securely (Section 22)
    const newPasswordHash = bcrypt.hashSync(newPassword, 10);

    // Save user update in transaction
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash: newPasswordHash }
    });

    // Create Audit Log (Section 30 & 31 - Never log passwords, hashes, etc.)
    await createAuditLog(
      userId,
      "PASSWORD_CHANGE",
      "Authentication",
      userId,
      { email: user.email }, // Previous state
      { email: user.email }  // New state
    );

    revalidatePath("/profile");
    return { success: true };
  } catch (error: unknown) {
    console.error("Error changing password:", error);
    const err = error as Error;
    return { error: err.message || "Failed to update your password." };
  }
}
