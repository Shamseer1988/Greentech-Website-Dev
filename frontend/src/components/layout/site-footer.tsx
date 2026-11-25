import Image from "next/image";
import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { getTypes } from "@/lib/api";
import { ltr, nameOf } from "@/lib/format";
import { site } from "@/lib/site";

export async function SiteFooter() {
  const t = await getTranslations("footer");
  const brand = await getTranslations("brand");
  const locale = await getLocale();
  const types = (await getTypes()).filter((type) => !type.coming_soon);

  return (
    <footer className="no-print bg-deepest pb-20 text-sm text-[#a9cfc0] md:pb-0">
      <div className="container-page grid gap-8 pt-16 pb-8 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-3">
          <Image
            src="/brand/greentech-logo-stacked-on-dark.svg"
            alt={brand("name")}
            width={508}
            height={359}
            unoptimized
            className="-ms-3 h-auto w-55"
          />
          <span>
            {t("place")} · {t("cr", { number: ltr(site.crNumber) })}
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
        <FooterColumn title={t("social")}>
          <ExternalLinks links={site.social} />
        </FooterColumn>
        <FooterColumn title={t("also")}>
          <ExternalLinks links={site.portals} />
        </FooterColumn>
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

/** Links without an address yet are shown as plain text. */
function ExternalLinks({ links }: { links: { name: string; href: string | null }[] }) {
  return links.map(({ name, href }) =>
    href ? (
      <a
        key={name}
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className="py-1.5 hover:text-white"
      >
        {name}
      </a>
    ) : (
      <span key={name} className="py-1.5">
        {name}
      </span>
    ),
  );
}
