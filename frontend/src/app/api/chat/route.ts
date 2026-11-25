import { after } from "next/server";
import { API_URL } from "@/lib/api";
import { reply, safeState } from "@/lib/assistant/answer";
import { visitor } from "@/lib/public-proxy";

const MAX_BODY = 8 * 1024;
const MAX_MESSAGE = 300;

/** The chat assistant: answers from the website's own data, with no outside service. */
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
    const answer = await reply(message, locale, safeState(body.state));
    if (answer.unanswered) after(() => remember(request, message));
    return Response.json(answer, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    console.error("Chat failed:", error);
    return Response.json({ detail: "Not available" }, { status: 502 });
  }
}

/** So the office can add an answer. Phone numbers and emails are hidden by the backend. */
async function remember(request: Request, text: string): Promise<void> {
  await fetch(`${API_URL}/api/chat/unanswered`, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...visitor(request) },
    body: JSON.stringify({ text }),
    signal: AbortSignal.timeout(5000),
  }).catch(() => null);
}
