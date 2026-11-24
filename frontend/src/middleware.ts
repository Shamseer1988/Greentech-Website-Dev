import createMiddleware from "next-intl/middleware";
import { routing } from "./i18n/routing";

export default createMiddleware(routing);

export const config = {
  // Everything except the API, the admin panel, Next.js files, and files with an extension.
  matcher: "/((?!api|admin|_next|.*\\..*).*)",
};
