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

        const identifier = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findFirst({
          where: {
            OR: [
              { email: { equals: identifier, mode: "insensitive" } },
              { username: { equals: identifier, mode: "insensitive" } }
            ],
            deletedAt: null
          },
          include: { role: true, department: true },
        });

        if (!user) {
          await createAuditLog(null, "LOGIN_FAILED", "Authentication", "", null, { email: identifier, reason: "User not found" });
          return null;
        }

        const isValid = await bcrypt.compare(password, user.passwordHash);
        if (!isValid) {
          await createAuditLog(null, "LOGIN_FAILED", "Authentication", user.id, null, { email: identifier, reason: "Incorrect password" });
          return null;
        }

        await createAuditLog(user.id, "LOGIN", "Authentication", user.id, null, { email: identifier });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role.name,
          departmentId: user.departmentId,
          departmentName: user.department?.name,
        };
      },
    }),
  ],
});
