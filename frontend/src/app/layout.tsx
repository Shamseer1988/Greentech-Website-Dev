import type { Metadata } from "next";
import { fontVariables } from "./fonts";
import "./globals.css";

export const metadata: Metadata = {
  title: "Greentech Real Estate Broker | Qatar",
  description:
    "Labour accommodation, warehouses, cafeterias and supermarket spaces for rent across Qatar.",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" dir="ltr" className={fontVariables}>
      <body className="antialiased">{children}</body>
    </html>
  );
}
