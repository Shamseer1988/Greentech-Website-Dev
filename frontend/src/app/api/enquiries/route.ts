import { forward } from "@/lib/public-proxy";

export const POST = (request: Request) => forward(request, "/enquiries");
