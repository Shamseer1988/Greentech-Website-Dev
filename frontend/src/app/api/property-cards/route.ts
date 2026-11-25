import { forward } from "@/lib/public-proxy";

export function GET(request: Request) {
  const codes = new URL(request.url).searchParams.getAll("codes").slice(0, 60);
  return forward(request, `/property-cards?${new URLSearchParams(codes.map((c) => ["codes", c]))}`);
}
