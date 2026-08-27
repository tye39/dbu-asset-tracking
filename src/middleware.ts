import NextAuth from "next-auth";
import { authConfig } from "./auth.config";
import { NextResponse } from "next/server";

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

  if (isPublicRoute) {
    if (isLoggedIn && (nextUrl.pathname === "/login" || nextUrl.pathname === "/forgot-password" || nextUrl.pathname === "/reset-password")) {
      return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
    }
    return NextResponse.next();
  }

  if (!isLoggedIn) {
    return NextResponse.redirect(new URL("/login", nextUrl));
  }

  // Enforce role sub-path routing
  const pathname = nextUrl.pathname;
  if (pathname.startsWith("/admin") && userRole !== "SYSTEM_ADMINISTRATOR") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/pao") && userRole !== "PROPERTY_ADMINISTRATION_OFFICER") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/head") && userRole !== "DEPARTMENT_HEAD") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/staff") && userRole !== "STAFF_MEMBER") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/tech") && userRole !== "MAINTENANCE_TECHNICIAN") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/auditor") && userRole !== "INTERNAL_AUDITOR") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }
  if (pathname.startsWith("/inventory") && userRole !== "INVENTORY_PERSON" && userRole !== "SYSTEM_ADMINISTRATOR" && userRole !== "PROPERTY_ADMINISTRATION_OFFICER") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }

  // Root path redirect
  if (pathname === "/") {
    return NextResponse.redirect(new URL(getRoleDashboardRedirect(userRole), nextUrl));
  }

  return NextResponse.next();
});

function getRoleDashboardRedirect(role?: string): string {
  switch (role) {
    case "SYSTEM_ADMINISTRATOR":
      return "/admin/dashboard";
    case "PROPERTY_ADMINISTRATION_OFFICER":
      return "/pao/dashboard";
    case "DEPARTMENT_HEAD":
      return "/head/dashboard";
    case "STAFF_MEMBER":
      return "/staff/dashboard";
    case "MAINTENANCE_TECHNICIAN":
      return "/tech/dashboard";
    case "INTERNAL_AUDITOR":
      return "/auditor/dashboard";
    case "INVENTORY_PERSON":
      return "/inventory";
    default:
      return "/login";
  }
}

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
