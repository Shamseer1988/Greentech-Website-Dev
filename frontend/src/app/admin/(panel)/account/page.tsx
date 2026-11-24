import type { Metadata } from "next";
import { PasswordForm } from "@/components/admin/password-form";
import { PageTitle } from "@/components/admin/ui";
import { getMe } from "@/lib/admin-server";

export const metadata: Metadata = { title: "My account" };

export default async function AccountPage() {
  const me = await getMe();
  return (
    <>
      <PageTitle title="My account" text={`${me.full_name} · ${me.email}`} />
      <PasswordForm />
    </>
  );
}
