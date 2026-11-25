import { forward } from "@/lib/public-proxy";

export const POST = (request: Request) => forward(request, "/viewings");

/** Free times: /api/viewings?code=GT-LA-101 */
export function GET(request: Request) {
  const code = new URL(request.url).searchParams.get("code") ?? "";
  return forward(request, `/viewings/slots?code=${encodeURIComponent(code)}`);
}
