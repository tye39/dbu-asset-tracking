"use server";

import { prisma } from "@/lib/db";
import { createAuditLog } from "@/services/audit";
import { sendPasswordResetEmail } from "@/services/email";
import * as bcrypt from "bcryptjs";
import * as crypto from "crypto";

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function requestPasswordResetAction(prevState: unknown, formData: FormData) {
  const emailInput = formData.get("email");
  if (!emailInput || typeof emailInput !== "string") {
    return { error: "Please enter your email address." };
  }

  const email = emailInput.trim().toLowerCase();

  if (!EMAIL_REGEX.test(email)) {
    return { error: "Please enter a valid email address." };
  }

  try {
    const user = await prisma.user.findFirst({
      where: {
        email: { equals: email, mode: "insensitive" },
        deletedAt: null,
      },
    });

    if (!user) {
      return { error: "This email address is not registered in the system." };
    }

    // 1. Generate cryptographically secure random token (raw token sent in email, NEVER stored in DB)
    const rawToken = crypto.randomBytes(32).toString("hex");

    // 2. Hash token using SHA-256 for secure database storage
    const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");

    // 3. Expiration time (1 hour from now)
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

    // 4. Invalidate old active reset tokens for this user
    await prisma.passwordResetToken.updateMany({
      where: {
        userId: user.id,
        usedAt: null,
        expiresAt: { gt: new Date() },
      },
      data: {
        usedAt: new Date(),
      },
    });

    // 5. Store hashed token in database
    await prisma.passwordResetToken.create({
      data: {
        tokenHash,
        userId: user.id,
        expiresAt,
      },
    });

    // 6. Build reset URL
    const baseUrl = process.env.NEXTAUTH_URL || "http://localhost:3000";
    const resetUrl = `${baseUrl.replace(/\/$/, "")}/reset-password?token=${rawToken}`;

    // 7. Send email via email service
    await sendPasswordResetEmail("administer2345@gmail.com", resetUrl);

    // 8. Create audit log
    await createAuditLog(
      user.id,
      "PASSWORD_RESET_REQUESTED",
      "User",
      user.id,
      null,
      { email: user.email }
    );

    return {
      success: true,
      message: "We have sent a password reset link to your email address.",
    };
  } catch (err: unknown) {
    console.error("requestPasswordResetAction error:", err);
    return { error: "An unexpected error occurred. Please try again later." };
  }
}

export async function resetPasswordAction(prevState: unknown, formData: FormData) {
  const token = formData.get("token");
  const password = formData.get("password");
  const confirmPassword = formData.get("confirmPassword");

  if (!token || typeof token !== "string" || !token.trim()) {
    return { error: "Invalid password reset request. Missing token." };
  }

  if (!password || typeof password !== "string" || !password.trim()) {
    return { error: "Please enter a new password." };
  }

  if (password.length < 6) {
    return { error: "Password must be at least 6 characters long." };
  }

  if (password !== confirmPassword) {
    return { error: "Passwords do not match." };
  }

  try {
    // Hash token with SHA-256 to look up database record
    const tokenHash = crypto.createHash("sha256").update(token.trim()).digest("hex");

    const resetRecord = await prisma.passwordResetToken.findUnique({
      where: { tokenHash },
      include: { user: true },
    });

    if (
      !resetRecord ||
      resetRecord.usedAt !== null ||
      resetRecord.expiresAt < new Date() ||
      resetRecord.user.deletedAt !== null
    ) {
      return { error: "Invalid or expired password reset link. Please request a new link." };
    }

    // Hash the new password using bcryptjs
    const newPasswordHash = await bcrypt.hash(password, 10);

    // Atomically update user password and mark token as used
    await prisma.$transaction([
      prisma.user.update({
        where: { id: resetRecord.userId },
        data: { passwordHash: newPasswordHash },
      }),
      prisma.passwordResetToken.update({
        where: { id: resetRecord.id },
        data: { usedAt: new Date() },
      }),
    ]);

    // Create Audit Log
    await createAuditLog(
      resetRecord.userId,
      "PASSWORD_RESET_COMPLETED",
      "User",
      resetRecord.userId,
      null,
      { email: resetRecord.user.email }
    );

    return {
      success: true,
      message: "Your password has been successfully reset! Redirecting to login...",
    };
  } catch (err: unknown) {
    console.error("resetPasswordAction error:", err);
    return { error: "Failed to reset password. Please try again." };
  }
}
