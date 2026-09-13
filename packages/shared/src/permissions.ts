export const ROLES = [
  "owner",
  "sales",
  "purchase",
  "production",
  "warehouse",
  "quality",
  "finance",
] as const;

export type RoleKey = (typeof ROLES)[number];

export const MODULES = [
  "dashboard",
  "crm",
  "sales",
  "purchase",
  "inventory",
  "manufacturing",
  "quality",
  "finance",
  "admin",
] as const;

export type ModuleKey = (typeof MODULES)[number];

export const ACTIONS = ["read", "create", "update", "delete", "post", "approve"] as const;
export type ActionKey = (typeof ACTIONS)[number];

/** Default module access by role for MVP */
export const ROLE_PERMISSIONS: Record<RoleKey, ModuleKey[]> = {
  owner: [...MODULES],
  sales: ["dashboard", "crm", "sales"],
  purchase: ["dashboard", "purchase", "inventory"],
  production: ["dashboard", "manufacturing", "inventory", "quality"],
  warehouse: ["dashboard", "inventory", "purchase"],
  quality: ["dashboard", "quality", "manufacturing"],
  finance: ["dashboard", "finance", "sales", "purchase"],
};

export function canAccessModule(role: RoleKey, module: ModuleKey): boolean {
  return ROLE_PERMISSIONS[role]?.includes(module) ?? false;
}
