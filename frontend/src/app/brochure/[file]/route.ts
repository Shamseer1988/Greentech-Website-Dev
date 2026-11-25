import { API_URL } from "@/lib/api";

type Context = { params: Promise<{ file: string }> };

/** /brochure/GT-LA-101-en.pdf */
export async function GET(_: Request, { params }: Context): Promise<Response> {
  const match = (await params).file.match(/^([A-Za-z0-9-]{2,20})-(en|ar)\.pdf$/);
  if (!match) return new Response("Not found", { status: 404 });
  const [, code, language] = match;
  try {
    const response = await fetch(
      `${API_URL}/api/properties/${code}/brochure.pdf?language=${language}`,
      { cache: "no-store", signal: AbortSignal.timeout(40_000) },
    );
    if (!response.ok) {
      return new Response("Not found", { status: response.status === 404 ? 404 : 502 });
    }
    return new Response(response.body, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `inline; filename="GreenTech-${code}-${language}.pdf"`,
        "Cache-Control": "public, max-age=300",
        "X-Robots-Tag": "noindex",
      },
    });
  } catch {
    return new Response("Not available", { status: 502 });
  }
}
