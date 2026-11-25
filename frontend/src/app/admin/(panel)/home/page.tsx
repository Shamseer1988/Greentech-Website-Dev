import type { Metadata } from "next";
import { HeroPhotos, HomeForm } from "@/components/admin/home-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import { STANDARD_HOME } from "@/lib/home-content";
import type { HomeOut } from "@/lib/types";

export const metadata: Metadata = { title: "Home page" };

export default async function HomeAdminPage() {
  await requireAdminPage();
  const { content, images } = await adminGet<HomeOut>("/home");
  return (
    <>
      <PageTitle
        title="Home page"
        text="The first section of the home page, and the title above the category cards."
      />
      <HeroPhotos initial={images} />
      <HomeForm
        initial={content ?? STANDARD_HOME}
        isOwn={content !== null}
        photo={images[0]?.url}
      />
    </>
  );
}
