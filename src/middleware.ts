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
  const isPublicVerificationRoute = nextUrl.pathname.startsWith("/asset/verify");
  const isPublicRoute =
    nextUrl.pathname === "/login" ||
    nextUrl.pathname === "/forgot-password" ||
    nextUrl.pathname === "/reset-password" ||
    isPublicVerificationRoute ||
    nextUrl.pathname.startsWith("/assets/");

  if (isApiAuthRoute) {
    return NextResponse.next();
  }

  // Handle public verification route (accessible without login)
  if (isPublicVerificationRoute) {
    return NextResponse.next();
  }

  // Legacy QR code redirect: If an unauthenticated user visits /assets/[id], redirect to /asset/verify/[id]
  if (!isLoggedIn && nextUrl.pathname.startsWith("/assets/")) {
    const legacyId = nextUrl.pathname.replace(/^\/assets\/?/, "");
    if (legacyId) {
      return NextResponse.redirect(new URL(`/asset/verify/${legacyId}`, nextUrl));
    }
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

  // First login enforcement: If user must change password, redirect to /profile/security
  const mustChangePassword = (req.auth?.user as { mustChangePassword?: boolean })?.mustChangePassword === true;
  if (mustChangePassword && nextUrl.pathname !== "/profile/security" && nextUrl.pathname !== "/logout") {
    return NextResponse.redirect(new URL("/profile/security", nextUrl));
  }

  let effectivePath = nextUrl.pathname;
  let isRewrite = false;
  if (effectivePath.startsWith("/department-head/")) {
    effectivePath = effectivePath.replace("/department-head/", "/head/");
    isRewrite = true;
  } else if (effectivePath === "/department-head") {
    effectivePath = "/head/dashboard";
    isRewrite = true;
  } else if (effectivePath === "/staff/asset-requests") {
    effectivePath = "/staff/requests";
    isRewrite = true;
  } else if (effectivePath === "/admin/property-management/appeals") {
    effectivePath = "/pao/appeals";
    isRewrite = true;
  } else if (effectivePath === "/admin/property-management/requests") {
    effectivePath = "/pao/asset-requests";
    isRewrite = true;
  }

  // Root path redirect to user's dedicated dashboard
  if (effectivePath === "/") {
    const destination = getRoleDashboard(userRole);
    return NextResponse.redirect(new URL(destination, nextUrl));
  }

  // Enforce role-based access control for dashboard sub-paths
  if (effectivePath.startsWith("/admin") && userRole !== ROLES.SYSTEM_ADMINISTRATOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (effectivePath.startsWith("/pao") && userRole !== ROLES.PROPERTY_ADMINISTRATION_OFFICER && userRole !== ROLES.SYSTEM_ADMINISTRATOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (effectivePath.startsWith("/head") && userRole !== ROLES.DEPARTMENT_HEAD) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (effectivePath.startsWith("/staff") && userRole !== ROLES.STAFF_MEMBER) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (effectivePath.startsWith("/tech") && userRole !== ROLES.MAINTENANCE_TECHNICIAN) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (effectivePath.startsWith("/auditor") && userRole !== ROLES.INTERNAL_AUDITOR) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }
  if (
    effectivePath.startsWith("/inventory") &&
    userRole !== ROLES.INVENTORY_PERSON &&
    userRole !== ROLES.SYSTEM_ADMINISTRATOR &&
    userRole !== ROLES.PROPERTY_ADMINISTRATION_OFFICER
  ) {
    return NextResponse.redirect(new URL(getRoleDashboard(userRole), nextUrl));
  }

  if (isRewrite) {
    return NextResponse.rewrite(new URL(effectivePath, nextUrl));
  }

  return NextResponse.next();
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
