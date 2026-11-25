"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "cn";
import { adminSend } from "@/lib/admin-client";
import type { AdminUser } from "@/lib/admin-types";

const MENU = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/properties", label: "Properties" },
  { href: "/admin/enquiries", label: "Enquiries" },
  { href: "/admin/viewings", label: "Viewings" },
  { href: "/admin/reports", label: "Reports", adminOnly: true },
  { href: "/admin/locations", label: "Locations", adminOnly: true },
  { href: "/admin/categories", label: "Categories", adminOnly: true },
  { href: "/admin/home", label: "Home page", adminOnly: true },
  { href: "/admin/blog", label: "Blog", adminOnly: true },
  { href: "/admin/chat", label: "Chat assistant", adminOnly: true },
  { href: "/admin/company", label: "Company details", adminOnly: true },
  { href: "/admin/users", label: "Users & roles", adminOnly: true },
  { href: "/admin/account", label: "My account" },
];

export function Sidebar({ me }: { me: AdminUser }) {
  const pathname = usePathname();

  async function logout() {
    await adminSend("DELETE", "/api/admin-session").catch(() => null);
    window.location.href = "/admin/login";
  }

  const item =
    "flex min-h-11 flex-none items-center rounded-md px-3 text-start text-[15px] transition-colors";
  return (
    <nav
      aria-label="Admin"
      className="flex flex-col gap-1.5 bg-deep px-4 py-5 text-sage lg:sticky lg:top-0 lg:h-svh lg:w-60 lg:overflow-y-auto lg:flex-none"
    >
      <Link href="/admin" className="mb-2 lg:mb-4">
        <Image
          src="/brand/greentech-logo-compact-en-on-dark.svg"
          alt="Green Tech Admin"
          width={437}
          height={147}
          unoptimized
          className="h-14 w-auto"
        />
      </Link>
      <div className="-mx-4 flex gap-1.5 overflow-x-auto px-4 lg:mx-0 lg:flex-col lg:px-0">
        {MENU.filter((m) => !m.adminOnly || me.role === "admin").map(({ href, label }) => {
          const active = href === "/admin" ? pathname === href : pathname.startsWith(href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                item,
                active ? "bg-green-700 font-semibold text-white" : "hover:bg-white/10",
              )}
            >
              {label}
            </Link>
          );
        })}
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-white/10 pt-3 text-sm lg:mt-auto lg:flex-col lg:items-stretch">
        <span className="px-3">
          {me.full_name} <span className="capitalize opacity-70">· {me.role}</span>
        </span>
        <Link href="/" target="_blank" className={cn(item, "hover:bg-white/10")}>
          View website
        </Link>
        <button type="button" onClick={logout} className={cn(item, "hover:bg-white/10")}>
          Log out
        </button>
      </div>
    </nav>
  );
}
