import type { NextAuthConfig } from "next-auth";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/",
  },
  session: {
    strategy: "jwt",
  },
  secret: process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "dbu_asset_tracking_secret_key_1234567890_abcdef",
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.departmentId = user.departmentId;
        token.departmentName = user.departmentName;
        token.mustChangePassword = (user as { mustChangePassword?: boolean }).mustChangePassword ?? false;
      }
      if (trigger === "update" && session?.mustChangePassword !== undefined) {
        token.mustChangePassword = session.mustChangePassword;
      }
      if (process.env.NODE_ENV !== "production") {
        console.log(`[AUTH JWT] email: ${token.email || user?.email}, id: ${token.id}, jwtRole: ${token.role}, mustChangePassword: ${token.mustChangePassword}`);
      }
      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.departmentId = token.departmentId as string | null;
        session.user.departmentName = token.departmentName as string | null;
        (session.user as { mustChangePassword?: boolean }).mustChangePassword = (token.mustChangePassword as boolean) ?? false;
      }
      if (process.env.NODE_ENV !== "production") {
        console.log(`[AUTH SESSION] user: ${session.user?.id}, sessionRole: ${session.user?.role}`);
      }
      return session;
    },
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user;
      const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
      const isPublicVerificationRoute = nextUrl.pathname.startsWith("/asset/verify");
      const isPublicRoute =
        nextUrl.pathname === "/" ||
        nextUrl.pathname === "/login" ||
        nextUrl.pathname === "/forgot-password" ||
        nextUrl.pathname === "/reset-password" ||
        isPublicVerificationRoute;

      if (isApiAuthRoute) return true;
      if (isPublicRoute) return true;

      return isLoggedIn;
    },
  },
  providers: [],
} satisfies NextAuthConfig;
