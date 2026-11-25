import type { Metadata } from "next";
import { CompanyForm } from "@/components/admin/company-form";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import { companyContent } from "@/lib/site";
import type { CompanyContent } from "@/lib/types";

export const metadata: Metadata = { title: "Company details" };

export default async function CompanyPage() {
  await requireAdminPage();
  const saved = await adminGet<CompanyContent | null>("/company");
  return (
    <>
      <PageTitle
        title="Company details"
        text="Contact, office and social media, used on the whole website and by the chat assistant. Empty = not shown."
      />
      <CompanyForm initial={companyContent(saved)} />
    </>
  );
}
