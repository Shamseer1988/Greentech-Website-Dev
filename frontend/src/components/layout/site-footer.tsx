import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getSite, getTypes } from "@/lib/api";
import { ltr, nameOf } from "@/lib/format";
import { OfficeCard } from "./office-card";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const brand = await getTranslations("brand");
  const locale = await getLocale();
  const site = await getSite();
  const types = (await getTypes()).filter((type) => !type.coming_soon);

  return (
    <footer className="no-print bg-deepest pb-20 text-sm text-[#a9cfc0] md:pb-0">
      <div className="container-page flex flex-col gap-10 pt-16 pb-10 xl:flex-row xl:justify-between">
        <div className="grid flex-1 gap-8 sm:grid-cols-2 lg:grid-cols-[auto_1fr_1fr_1fr] xl:grid-cols-[auto_1fr_1fr] xl:gap-10">
          <div className="flex flex-col gap-3 sm:max-xl:row-span-2 lg:max-xl:row-span-1 xl:row-span-2">
            <Image
              src="/brand/greentech-logo-stacked-on-dark.svg"
              alt={brand("name")}
              width={508}
              height={359}
              unoptimized
              className="-ms-3 h-auto w-55"
            />
            <span>
              {t("place")}
              {site.crNumber && ` · ${t("cr", { number: ltr(site.crNumber) })}`}
            </span>
          </div>
          <FooterColumn title={t("rent")}>
            {types.map((type) => (
              <Link
                key={type.slug}
                href={`/properties?type=${type.slug}`}
                className="py-1.5 hover:text-white"
              >
                {nameOf(type, locale)}
              </Link>
            ))}
          </FooterColumn>
          {site.social.length > 0 && (
            <FooterColumn title={t("social")}>
              <ExternalLinks links={site.social} />
            </FooterColumn>
          )}
          {site.portals.length > 0 && (
            <FooterColumn title={t("also")}>
              <ExternalLinks links={site.portals} />
            </FooterColumn>
          )}
        </div>
        <OfficeCard className="w-full xl:w-[620px] xl:flex-none" />
      </div>
      <div className="border-t border-[#0e3a2c]">
        <div className="container-page py-5 text-[13px]">
          © {new Date().getFullYear()} {brand("name")}
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col items-start">
      <span className="mb-1 font-semibold text-white">{title}</span>
      {children}
    </div>
  );
}

function ExternalLinks({ links }: { links: { name: string; href: string }[] }) {
  return links.map(({ name, href }) => (
    <a
      key={`${name} ${href}`}
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="py-1.5 hover:text-white"
    >
      {name}
    </a>
  ));
}
