import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";
import { getRoleDashboard, isValidRole, ROLES } from "@/lib/rbac";

const { auth } = NextAuth(authConfig);

export default auth((req) => {
  const { nextUrl } = req;
  const isLoggedIn = !!req.auth;
  const userRole = req.auth?.user?.role;

  const isApiAuthRoute = nextUrl.pathname.startsWith("/api/auth");
  const isPublicRoute =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/forgot-password" ||
    nextUrl.pathname === "/reset-password" ||
    nextUrl.pathname.startsWith("/assets/");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Handle public routes (login, forgot password, reset password)
  if (isPublicRoute) {
    if (isLoggedIn && isValidRole(userRole) && (nextUrl.pathname === "/login" || nextUrl.pathname === "/forgot-password" || nextUrl.pathname === "/reset-password")) {
      const destination = getRoleDashboard(userRole);
      return NextResponse.redirect(new URL(destination, nextUrl));
    }
    return NextResponse.next();
  }

  // Not logged in or invalid role -> redirect to login
  if (!isLoggedIn || !isValidRole(userRole)) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  const pathname = nextUrl.pathname;

  // Root path redirect to user's dedicated dashboard
  if (pathname === "/") {
    const destination = getRoleDashboard(userRole);
    return NextResponse.redirect(new URL(destination, nextUrl));
  }

  // Enforce role-based access control for dashboard sub-paths
  if (pathname.startsWith("/admin") && userRole !== ROLES.SYSTEM_ADMINISTRATOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (pathname.startsWith("/pao") && userRole !== ROLES.PROPERTY_ADMINISTRATION_OFFICER && userRole !== ROLES.SYSTEM_ADMINISTRATOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (pathname.startsWith("/head") && userRole !== ROLES.DEPARTMENT_HEAD) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (pathname.startsWith("/staff") && userRole !== ROLES.STAFF_MEMBER) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (pathname.startsWith("/tech") && userRole !== ROLES.MAINTENANCE_TECHNICIAN) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (pathname.startsWith("/auditor") && userRole !== ROLES.INTERNAL_AUDITOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (
    pathname.startsWith("/inventory") &&
    userRole !== ROLES.INVENTORY_PERSON &&
    userRole !== ROLES.SYSTEM_ADMINISTRATOR &&
    userRole !== ROLES.PROPERTY_ADMINISTRATION_OFFICER
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
