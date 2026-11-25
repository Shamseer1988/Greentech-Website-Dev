import "server-only";
import { API_URL } from "./api";

const MAX_BODY = 32 * 1024;

/** The backend limits requests per visitor, so tell it who is asking. */
export function visitor(request: Request): Record<string, string> {
  // Phase 6: use CF-Connecting-IP here, because visitors can fake x-forwarded-for.
  const ip = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  return ip ? { "X-Forwarded-For": ip } : {};
}

/** Passes a public request on, so the backend does not need its own public address. */
export async function forward(request: Request, path: string): Promise<Response> {
  const change = request.method !== "GET";
  const body = change ? await request.text() : undefined;
  if (body && body.length > MAX_BODY)
    return Response.json({ detail: "Too large" }, { status: 413 });
  try {
    const response = await fetch(`${API_URL}/api${path}`, {
      method: request.method,
      headers: { ...(change && { "Content-Type": "application/json" }), ...visitor(request) },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const headers = new Headers({ "Cache-Control": "no-store" });
    for (const name of ["content-type", "retry-after"]) {
      const value = response.headers.get(name);
      if (value) headers.set(name, value);
    }
    return new Response(response.status === 204 ? null : await response.text(), {
      status: response.status,
      headers,
    });
  } catch (error) {
    console.error(`${path} could not reach the backend:`, error);
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  }
}
