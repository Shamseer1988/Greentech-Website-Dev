import { API_URL } from "@/lib/api";

const MAX_BODY = 32 * 1024;

/** Passes the form to the backend, so the backend does not need its own public address. */
export async function POST(request: Request): Promise<Response> {
  const body = await request.text();
  if (body.length > MAX_BODY) return Response.json({ detail: "Too large" }, { status: 413 });

  // The backend limits enquiries per visitor, so tell it who is asking.
  // Phase 6: use CF-Connecting-IP here, because visitors can fake x-forwarded-for.
  const visitor = request.headers.get("x-forwarded-for")?.split(",").at(-1)?.trim();
  try {
    const response = await fetch(`${API_URL}/api/enquiries`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(visitor ? { "X-Forwarded-For": visitor } : {}),
      },
      body,
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    const headers = new Headers({ "Content-Type": "application/json" });
    const retry = response.headers.get("retry-after");
    if (retry) headers.set("Retry-After", retry);
    return new Response(await response.text(), { status: response.status, headers });
  } catch (error) {
    console.error("Enquiry could not reach the backend:", error);
    return Response.json({ detail: "Backend unavailable" }, { status: 502 });
  }
}
