import { cookies } from "next/headers";

export const IMPERSONATE_COOKIE = "rkyves_impersonate_tenant";

export async function getImpersonatedTenantId(): Promise<string | null> {
  const jar = await cookies();
  return jar.get(IMPERSONATE_COOKIE)?.value ?? null;
}

export async function setImpersonationCookie(tenantId: string) {
  const jar = await cookies();
  jar.set(IMPERSONATE_COOKIE, tenantId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: process.env.NODE_ENV === "production",
  });
}

export async function clearImpersonationCookie() {
  const jar = await cookies();
  jar.delete(IMPERSONATE_COOKIE);
}
