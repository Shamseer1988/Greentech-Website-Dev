import type { Metadata } from "next";
import Image from "next/image";
import { LoginForm } from "@/components/admin/login-form";

export const metadata: Metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <main className="grid-bg flex min-h-svh items-center justify-center bg-deep p-5">
      <div className="flex w-full max-w-105 flex-col gap-5 rounded-3xl bg-white p-8">
        <Image
          src="/brand/greentech-logo-compact-en.svg"
          alt="Green Tech Real Estate Broker"
          width={437}
          height={147}
          unoptimized
          priority
          className="-ms-3 h-auto w-55"
        />
        <h1 className="text-2xl font-bold text-slate">Admin login</h1>
        <LoginForm />
      </div>
    </main>
  );
}
