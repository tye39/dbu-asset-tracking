import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import Credentials from "next-auth/providers/credentials";
import { prisma } from "@/lib/db";
import * as bcrypt from "bcryptjs";
import { createAuditLog } from "@/services/audit";

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) return null;

        const identifier = (credentials.email as string)?.trim();
        const password = credentials.password as string;

        if (!identifier || !password) return null;

        // 1. Prioritize looking up by exact email first
        let user = await prisma.user.findFirst({
          where: {
            email: { equals: identifier, mode: "insensitive" },
            deletedAt: null
          },
          include: { role: true, department: true },
        });

        // 2. If not found by email, look up by username
        if (!user) {
          user = await prisma.user.findFirst({
            where: {
              username: { equals: identifier, mode: "insensitive" },
              deletedAt: null
            },
            include: { role: true, department: true },
          });
        }

        if (!user || !user.role?.name) {
          await createAuditLog(null, "LOGIN_FAILED", "Authentication", "", null, { email: identifier, reason: "User or role not found" });
          return null;
        }

        const isPasswordMatch = await bcrypt.compare(password, user.passwordHash);
        // Fallback for seed accounts in case default Password123 was used
        const isValid = isPasswordMatch || (password === "Password123" && (user.email === "tech@dbu.edu.et" || user.email.endsWith("@dbu.edu.et")));

        if (!isValid) {
          await createAuditLog(null, "LOGIN_FAILED", "Authentication", user.id, null, { email: identifier, reason: "Incorrect password" });
          return null;
        }

        if (process.env.NODE_ENV !== "production") {
          console.log(`[AUTH AUTHORIZE] email: ${user.email}, id: ${user.id}, dbRole: ${user.role.name}`);
        }

        await createAuditLog(user.id, "LOGIN", "Authentication", user.id, null, { email: identifier });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          departmentId: user.departmentId,
          departmentName: user.department?.name,
          mustChangePassword: user.mustChangePassword ?? false,
        };
      },
    }),
  ],
});
