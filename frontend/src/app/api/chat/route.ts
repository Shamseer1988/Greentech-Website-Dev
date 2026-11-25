import { reply, safeState } from "@/lib/assistant/answer";

const MAX_BODY = 8 * 1024;
const MAX_MESSAGE = 300;

/** The chat assistant: answers from the website's own data, nothing is stored or sent elsewhere. */
export async function POST(request: Request): Promise<Response> {
  if (Number(request.headers.get("content-length") ?? MAX_BODY + 1) > MAX_BODY) {
    return Response.json({ detail: "Too large" }, { status: 413 });
  }
  const body = await request.json().catch(() => null);
  const message = typeof body?.message === "string" ? body.message.trim() : "";
  if (!message || message.length > MAX_MESSAGE) {
    return Response.json({ detail: "Write 1 to 300 letters" }, { status: 422 });
  }
  const locale = body.locale === "ar" ? "ar" : "en";
  try {
    return Response.json(await reply(message, locale, safeState(body.state)), {
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error) {
    console.error("Chat failed:", error);
    return Response.json({ detail: "Not available" }, { status: 502 });
  }
}
