import "server-only";
import { cookies } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";
import type { AdminUser } from "./admin-types";
import { API_URL } from "./api";

export const COOKIE = "gt_admin";

export const cookieOptions = {
  httpOnly: true, // page scripts cannot read the login
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
};

/** Changes are accepted only from our own pages (stops other sites using the login). */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  try {
    return origin !== null && new URL(origin).host === request.headers.get("host");
  } catch {
    return false;
  }
}

/** Phase 6: use CF-Connecting-IP here, because visitors can fake x-forwarded-for. */
export function visitorHeader(request: Request): Record<string, string> {
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return ip ? { "X-Forwarded-For": ip } : {};
}

/** Load data for an admin page. Sends visitors without a login to the login page. */
export async function adminGet<T>(path: string): Promise<T> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) redirect("/admin/login");
  const response = await fetch(`${API_URL}/api/admin${path}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
    signal: AbortSignal.timeout(10_000),
  });
  if (response.status === 401) redirect("/admin/login");
  if (response.status === 404 || response.status === 422) notFound();
  if (!response.ok) throw new Error(`API ${response.status} for ${path}`);
  return response.json() as Promise<T>;
}

export const getMe = cache(() => adminGet<AdminUser>("/me"));

export async function requireAdminPage(): Promise<AdminUser> {
  const me = await getMe();
  if (me.role !== "admin") redirect("/admin");
  return me;
}
