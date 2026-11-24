import { cookies } from "next/headers";
import { COOKIE, cookieOptions, isSameOrigin, visitorHeader } from "@/lib/admin-server";
import { API_URL } from "@/lib/api";

const forbidden = () => Response.json({ detail: "Not allowed" }, { status: 403 });

/** Ask the backend for a login token and keep it in the cookie. */
async function login(request: Request, path: string, headers: Record<string, string>) {
  if (!isSameOrigin(request)) return forbidden();
  const body = await request.text();
  if (body.length > 4096) return Response.json({ detail: "Too large" }, { status: 413 });
  let response: Response;
  try {
    response = await fetch(`${API_URL}/api/auth/${path}`, {
      method: "POST",
      headers: { "Content-Type": "application/json", ...visitorHeader(request), ...headers },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
  } catch {
    return Response.json({ detail: "The server is not available" }, { status: 502 });
  }
  const data = await response.json().catch(() => null);
  if (!response.ok) return Response.json({ detail: data?.detail }, { status: response.status });
  (await cookies()).set(COOKIE, data.token, { ...cookieOptions, maxAge: data.expires_in });
  return Response.json(data.user);
}

/** Log in */
export const POST = (request: Request) => login(request, "login", {});

/** Change own password (other logins of this user end) */
export async function PUT(request: Request) {
  const token = (await cookies()).get(COOKIE)?.value;
  return login(request, "password", { Authorization: `Bearer ${token}` });
}

/** Log out */
export async function DELETE(request: Request) {
  if (!isSameOrigin(request)) return forbidden();
  (await cookies()).set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  return new Response(null, { status: 204 });
}
