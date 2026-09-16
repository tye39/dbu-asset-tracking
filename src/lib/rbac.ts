export const ROLES = {
  SYSTEM_ADMINISTRATOR: "SYSTEM_ADMINISTRATOR",
  PROPERTY_ADMINISTRATION_OFFICER: "PROPERTY_ADMINISTRATION_OFFICER",
  DEPARTMENT_HEAD: "DEPARTMENT_HEAD",
  STAFF_MEMBER: "STAFF_MEMBER",
  MAINTENANCE_TECHNICIAN: "MAINTENANCE_TECHNICIAN",
  INTERNAL_AUDITOR: "INTERNAL_AUDITOR",
  INVENTORY_PERSON: "INVENTORY_PERSON",
} as const;

export type AppRole = typeof ROLES[keyof typeof ROLES];

export const ROLE_DASHBOARDS: Record<AppRole, string> = {
  [ROLES.SYSTEM_ADMINISTRATOR]: "/admin/dashboard",
  [ROLES.PROPERTY_ADMINISTRATION_OFFICER]: "/pao/dashboard",
  [ROLES.DEPARTMENT_HEAD]: "/head/dashboard",
  [ROLES.STAFF_MEMBER]: "/staff/dashboard",
  [ROLES.MAINTENANCE_TECHNICIAN]: "/tech/dashboard",
  [ROLES.INTERNAL_AUDITOR]: "/auditor/dashboard",
  [ROLES.INVENTORY_PERSON]: "/inventory",
};

export function isValidRole(role?: string | null): role is AppRole {
  return typeof role === "string" && Object.prototype.hasOwnProperty.call(ROLE_DASHBOARDS, role);
}

export function getRoleDashboard(role?: string | null): string {
  if (!isValidRole(role)) {
    console.warn(`[RBAC] Invalid or missing role encountered: "${role}". Falling back to /login.`);
    return "/login";
  }
  const target = ROLE_DASHBOARDS[role];//
  if (process.env.NODE_ENV !== "production") {
    console.log(`[RBAC] Role "${role}" mapped to dashboard: ${target}`);
  }
  return target;//Only do this when you're developing/testing the application, not when it's running in production.
}
