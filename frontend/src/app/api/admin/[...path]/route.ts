import { revalidateTag } from "next/cache";
import { cookies } from "next/headers";
import { COOKIE, cookieOptions, isSameOrigin } from "@/lib/admin-server";
import { API_URL, PUBLIC_TAG } from "@/lib/api";

type Context = { params: Promise<{ path: string[] }> };

/** Passes admin requests to the backend, adding the login from the cookie. */
async function forward(request: Request, { params }: Context): Promise<Response> {
  const change = request.method !== "GET";
  if (change && !isSameOrigin(request)) {
    return Response.json({ detail: "Not allowed" }, { status: 403 });
  }
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (!token) return Response.json({ detail: "Please log in" }, { status: 401 });

  const { path } = await params;
  if (path.some((part) => part === "." || part === "..")) {
    return Response.json({ detail: "Not found" }, { status: 404 });
  }
  const url = `${API_URL}/api/admin/${path.map(encodeURIComponent).join("/")}${new URL(request.url).search}`;

  const headers = new Headers({ Authorization: `Bearer ${token}` });
  for (const name of ["content-type", "content-length"]) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }
  // Uploads are passed on piece by piece, not kept in memory.
  const body = change && Number(request.headers.get("content-length")) > 0 ? request.body : null;

  let response: Response;
  try {
    response = await fetch(url, {
      method: request.method,
      headers,
      body,
      cache: "no-store",
      redirect: "manual",
      ...(body && { duplex: "half" }),
    } as RequestInit);
  } catch (error) {
    console.error("Admin request failed:", error);
    return Response.json({ detail: "The server is not available" }, { status: 502 });
  }

  if (response.status === 401) jar.set(COOKIE, "", { ...cookieOptions, maxAge: 0 });
  if (change && response.ok) revalidateTag(PUBLIC_TAG);

  const reply = new Headers({ "Cache-Control": "no-store" });
  for (const name of ["content-type", "content-disposition"]) {
    const value = response.headers.get(name);
    if (value) reply.set(name, value);
  }
  return new Response(response.status === 204 ? null : response.body, {
    status: response.status,
    headers: reply,
  });
}

export { forward as DELETE, forward as GET, forward as PATCH, forward as POST, forward as PUT };
