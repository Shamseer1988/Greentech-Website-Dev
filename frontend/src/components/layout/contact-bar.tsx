"use client";

import { Phone, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { useParams } from "next/navigation";
import { useCallback, useRef, useState } from "react";
import { cn } from "cn";
import { ChatAssistant, ChatIcon, type Welcome } from "@/components/chat/chat-assistant";
import { buttonVariants } from "@/components/ui/button";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import { site } from "@/lib/site";

const ROUND = "fixed end-7 bottom-7 z-20 hidden size-16 md:block";
const FACE =
  "absolute inset-0 flex items-center justify-center rounded-full text-white shadow-[0_12px_30px_rgb(0_0_0/.3)]";

/** Floating chat button (desktop) and bottom Chat / WhatsApp / Call bar (mobile). */
export function ContactBar({ chat }: { chat: Welcome | null }) {
  const t = useTranslations("common");
  const c = useTranslations("chat");
  const [open, setOpen] = useState(false);
  const opener = useRef<HTMLElement | null>(null);
  // On a property page, mention its code.
  const { code } = useParams<{ code?: string }>();
  const text = code ? t("waProperty", { code: code.toUpperCase() }) : t("waGeneral");

  const close = useCallback(() => {
    setOpen(false);
    opener.current?.focus();
  }, []);
  function toggle(event: React.MouseEvent<HTMLButtonElement>) {
    opener.current = event.currentTarget;
    setOpen(!open);
  }
  const chatProps = {
    type: "button" as const,
    onClick: toggle,
    "aria-expanded": open,
    "aria-controls": "chat-panel",
    "aria-label": open ? c("close") : c("open"),
  };
  const outline = cn(
    buttonVariants({ variant: "outline" }),
    "flex-1 border-green-700 px-3 text-green-700",
  );

  return (
    <div className="no-print">
      {chat ? (
        <button {...chatProps} className={ROUND}>
          {!open && (
            <span className="absolute inset-0 animate-pulse-ring rounded-full bg-green-700" />
          )}
          <span className={cn(FACE, "bg-green-700")}>
            {open ? <X className="size-7" /> : <ChatIcon className="size-7.5" />}
          </span>
        </button>
      ) : (
        <WhatsAppLink text={text} aria-label={t("whatsappChat")} className={ROUND}>
          <span className="absolute inset-0 animate-pulse-ring rounded-full bg-whatsapp" />
          <span className={cn(FACE, "bg-whatsapp")}>
            <WhatsAppIcon className="size-7.5" />
          </span>
        </WhatsAppLink>
      )}

      <div className="fixed inset-x-0 bottom-0 z-20 flex gap-2.5 border-t border-line bg-white px-4 pt-2.5 pb-[max(0.75rem,env(safe-area-inset-bottom))] md:hidden">
        {chat && (
          <button {...chatProps} className={cn(buttonVariants(), "flex-none px-4")}>
            <ChatIcon />
            {c("short")}
          </button>
        )}
        <WhatsAppLink
          text={text}
          className={cn(buttonVariants({ variant: "whatsapp" }), "flex-1 px-3")}
        >
          <WhatsAppIcon />
          {t("whatsapp")}
        </WhatsAppLink>
        {site.phoneHref ? (
          <a href={site.phoneHref} className={outline}>
            <Phone />
            {chat ? c("call") : t("callNow")}
          </a>
        ) : (
          <Link href="/contact" className={outline}>
            <Phone />
            {chat ? c("call") : t("callNow")}
          </Link>
        )}
      </div>

      {chat && <ChatAssistant welcome={chat} open={open} onClose={close} />}
    </div>
  );
}
