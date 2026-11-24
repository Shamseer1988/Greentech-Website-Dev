"use client";

import { Phone } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { cn } from "cn";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";

/** Floating WhatsApp button (desktop) and bottom WhatsApp / Call bar (mobile). */
export function ContactBar() {
  const t = useTranslations("common");
  // On a property page, mention its code.
  const { code } = useParams<{ code?: string }>();
  const text = code ? t("waProperty", { code: code.toUpperCase() }) : t("waGeneral");

  return (
    <div className="no-print">
      <WhatsAppLink
        text={text}
        aria-label={t("whatsappChat")}
        className="fixed end-7 bottom-7 z-20 hidden size-16 md:block"
      >
        <span className="absolute inset-0 animate-pulse-ring rounded-full bg-whatsapp" />
        <span className="absolute inset-0 flex items-center justify-center rounded-full bg-whatsapp text-white shadow-[0_12px_30px_rgb(0_0_0/.3)]">
          <WhatsAppIcon className="size-7.5" />
        </span>
      </WhatsAppLink>

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-line bg-white px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        <WhatsAppLink
          text={text}
          className={cn(buttonVariants({ variant: "whatsapp" }), "flex-1")}
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </WhatsAppLink>
        {site.phoneHref ? (
          <a
            href={site.phoneHref}
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 border-green-700 text-green-700")}
          >
            <Phone />
            {t("callNow")}
          </a>
        ) : (
          <Link
            href="/contact"
            className={cn(buttonVariants({ variant: "outline" }), "flex-1 border-green-700 text-green-700")}
          >
            <Phone />
            {t("callNow")}
          </Link>
        )}
      </div>
    </div>
  );
}
