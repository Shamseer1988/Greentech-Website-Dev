import type { Metadata } from "next";
import { fontVariables } from "../fonts";
import "../globals.css";

export const metadata: Metadata = {
  title: { default: "Green Tech Admin", template: "%s | Green Tech Admin" },
  robots: { index: false, follow: false },
};

// The admin panel is in English only and does not use the public site's layout.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={fontVariables}>
      <body>{children}</body>
    </html>
  );
}
