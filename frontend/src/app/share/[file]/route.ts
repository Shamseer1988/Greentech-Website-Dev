import { API_URL } from "@/lib/api";

type Context = { params: Promise<{ file: string }> };

/** /share/GT-LA-101.jpg: the cover photo as JPG, for WhatsApp, Facebook and Instagram. */
export async function GET(_: Request, { params }: Context): Promise<Response> {
  const code = (await params).file.match(/^([A-Za-z0-9-]{2,20})\.jpg$/)?.[1];
  if (!code) return new Response("Not found", { status: 404 });
  try {
    const response = await fetch(`${API_URL}/api/properties/${code}/share.jpg`, {
      cache: "no-store",
      signal: AbortSignal.timeout(15_000),
    });
    if (!response.ok) return new Response("Not found", { status: response.status === 404 ? 404 : 502 });
    return new Response(response.body, {
      headers: { "Content-Type": "image/jpeg", "Cache-Control": "public, max-age=3600" },
    });
  } catch {
    return new Response("Not available", { status: 502 });
  }
}
