"use client";

import { MessagesSquare, RotateCcw, SendHorizontal, X } from "lucide-react";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Price } from "@/components/property/price";
import { PropertyPhoto } from "@/components/property/property-photo";
import { WhatsAppIcon, WhatsAppLink } from "@/components/whatsapp-link";
import { Link } from "@/i18n/navigation";
import type { ChatLink, ChatReply, ChatState } from "@/lib/assistant/answer";
import { nameOf, titleOf } from "@/lib/format";
import type { PropertyCard } from "@/lib/types";

type Message = {
  from: "me" | "bot";
  text: string;
  lang?: "en" | "ar";
  properties?: PropertyCard[];
  links?: ChatLink[];
};
type Saved = { messages: Message[]; state: ChatState; suggestions: string[] };

const KEY = "gt_chat";
const MAX_SAVED = 40;

export type Welcome = { text: string; suggestions: string[] };

/** The chat window. The conversation stays in this browser tab only. */
export function ChatAssistant({
  welcome,
  open,
  onClose,
}: {
  welcome: Welcome;
  open: boolean;
  onClose: () => void;
}) {
  const t = useTranslations("chat");
  const common = useTranslations("common");
  const locale = useLocale();
  const { code } = useParams<{ code?: string }>();
  const [messages, setMessages] = useState<Message[]>([]);
  const [state, setState] = useState<ChatState>({});
  const [suggestions, setSuggestions] = useState(welcome.suggestions);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const log = useRef<HTMLDivElement>(null);
  const input = useRef<HTMLInputElement>(null);
  const panel = useRef<HTMLElement>(null);
  const loaded = useRef(false);
  const latest = useRef(0); // answers to a cleared conversation are ignored

  useEffect(() => {
    try {
      const saved = JSON.parse(sessionStorage.getItem(KEY) ?? "null") as Saved | null;
      if (saved?.messages?.length) {
        setMessages(saved.messages);
        setState(saved.state ?? {});
        setSuggestions(saved.suggestions ?? []);
      }
    } catch {
      // Private window: the conversation is just not kept.
    }
    loaded.current = true;
  }, []);

  useEffect(() => {
    if (!loaded.current || !messages.length) return;
    try {
      sessionStorage.setItem(
        KEY,
        JSON.stringify({ messages: messages.slice(-MAX_SAVED), state, suggestions }),
      );
    } catch {
      // Not kept.
    }
  }, [messages, state, suggestions]);

  useEffect(() => {
    if (!open) return;
    // On a phone, the keyboard should not open by itself.
    if (window.matchMedia("(hover: hover)").matches) input.current?.focus();
    else panel.current?.focus();
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Show the start of the newest answer.
  useEffect(() => {
    if (!open) return;
    const last = log.current?.querySelector("[data-last]");
    last?.scrollIntoView({ block: "nearest" });
    const box = log.current;
    if (box && last && last.clientHeight > box.clientHeight) {
      box.scrollTop = (last as HTMLElement).offsetTop - 12;
    }
  }, [open, messages, busy]);

  async function ask(question: string) {
    const message = question.trim().slice(0, 300);
    if (!message || busy) return;
    const turn = ++latest.current;
    setText("");
    setBusy(true);
    setMessages((old) => [...old, { from: "me", text: message }]);
    let answer: Message;
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // On a property page, "is it available?" means that property.
        body: JSON.stringify({
          message,
          locale,
          state: { ...state, ...(code && !state.code && { code: code.toUpperCase() }) },
        }),
        signal: AbortSignal.timeout(15_000),
      });
      if (!response.ok) throw new Error(String(response.status));
      const data = (await response.json()) as ChatReply;
      if (turn !== latest.current) return;
      answer = {
        from: "bot",
        text: data.text,
        lang: data.lang,
        properties: data.properties,
        links: data.links,
      };
      setState(data.state);
      setSuggestions(data.suggestions);
    } catch {
      if (turn !== latest.current) return;
      answer = {
        from: "bot",
        text: t("error"),
        links: [{ label: t("sendEnquiry"), href: "/contact" }],
      };
    }
    setMessages((old) => [...old, answer]);
    setBusy(false);
  }

  function submit(event: FormEvent) {
    event.preventDefault();
    void ask(text);
  }

  function restart() {
    latest.current++;
    setBusy(false);
    setMessages([]);
    setState({});
    setSuggestions(welcome.suggestions);
    try {
      sessionStorage.removeItem(KEY);
    } catch {
      // Nothing was kept.
    }
    input.current?.focus();
  }

  if (!open) return null;
  // A link to another page covers the phone screen: close the chat there.
  const leave = () => {
    if (!window.matchMedia("(min-width: 768px)").matches) onClose();
  };

  return (
    <section
      ref={panel}
      id="chat-panel"
      role="dialog"
      aria-label={t("title")}
      tabIndex={-1}
      data-lenis-prevent
      className="no-print fixed inset-0 z-50 flex h-dvh flex-col overflow-hidden bg-ivory text-ink outline-none animate-in fade-in slide-in-from-bottom-6 duration-300 motion-reduce:animate-none md:inset-auto md:end-7 md:bottom-28 md:h-[min(640px,calc(100dvh-9rem))] md:w-[400px] md:rounded-3xl md:border md:border-line md:shadow-[0_30px_80px_rgb(4_29_21/.4)]"
    >
      <header className="flex flex-none items-center gap-3 bg-deep px-4 py-3.5 text-white">
        <span className="flex size-11 flex-none items-center justify-center rounded-full bg-white/10">
          <Image
            src="/brand/greentech-emblem-on-dark.svg"
            alt=""
            width={56}
            height={56}
            unoptimized
            className="h-7 w-auto"
          />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="truncate text-base leading-tight font-semibold">{t("title")}</h2>
          <p className="flex items-center gap-1.5 text-xs text-sage">
            <span className="size-2 rounded-full bg-mint" />
            {t("subtitle")}
          </p>
        </div>
        {messages.length > 0 && (
          <button
            type="button"
            onClick={restart}
            aria-label={t("restart")}
            title={t("restart")}
            className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
          >
            <RotateCcw className="size-4.5" />
          </button>
        )}
        <button
          type="button"
          onClick={onClose}
          aria-label={t("close")}
          className="flex size-11 items-center justify-center rounded-full hover:bg-white/10"
        >
          <X className="size-5" />
        </button>
      </header>

      <div
        ref={log}
        role="log"
        aria-live="polite"
        className="relative flex flex-1 flex-col gap-3.5 overflow-y-auto overscroll-contain p-4"
      >
        <Bubble from="bot" text={welcome.text} />
        {messages.map((message, i) => (
          <div
            key={i}
            data-last={i === messages.length - 1 ? "" : undefined}
            className="flex flex-col gap-2.5"
          >
            <Bubble {...message} />
            {message.properties?.map((property) => (
              <Link
                key={property.code}
                href={`/properties/${property.code}`}
                onClick={leave}
                className="flex gap-3 rounded-2xl border border-line bg-white p-2.5 transition hover:border-green-700 hover:shadow-[0_10px_26px_rgb(4_29_21/.12)]"
              >
                <span className="relative h-20 w-24 flex-none overflow-hidden rounded-xl">
                  <PropertyPhoto property={property} sizes="96px" />
                </span>
                <span className="flex min-w-0 flex-1 flex-col gap-0.5 text-start">
                  <span className="text-[11px] font-semibold text-rose">
                    <bdi>{property.code}</bdi> · {nameOf(property.location, locale)}
                  </span>
                  <span className="line-clamp-2 font-heading text-sm leading-snug font-semibold text-slate">
                    {titleOf(property, locale)}
                  </span>
                  <Price value={property.rent_qar} className="mt-auto text-sm" />
                </span>
              </Link>
            ))}
            {message.links && message.links.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {message.links.map((link) => (
                  <ReplyLink key={`${link.label} ${link.href}`} link={link} onLeave={leave} />
                ))}
              </div>
            )}
          </div>
        ))}
        {busy && (
          <span
            role="status"
            aria-label={t("typing")}
            className="flex w-fit gap-1.5 rounded-2xl bg-white px-4 py-3.5"
          >
            {[0, 1, 2].map((n) => (
              <span
                key={n}
                className="size-2 animate-bounce rounded-full bg-green-700/60 motion-reduce:animate-none"
                style={{ animationDelay: `${n * 0.15}s` }}
              />
            ))}
          </span>
        )}
        {!busy && suggestions.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {suggestions.map((question) => (
              <button
                key={question}
                type="button"
                onClick={() => void ask(question)}
                className="min-h-10 rounded-full border border-green-700/35 bg-white px-3.5 text-[13px] font-medium text-green-700 transition-colors hover:bg-tint"
              >
                {question}
              </button>
            ))}
          </div>
        )}
      </div>

      <form
        onSubmit={submit}
        className="flex flex-none items-center gap-2 border-t border-line bg-white p-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]"
      >
        <input
          ref={input}
          value={text}
          onChange={(event) => setText(event.target.value)}
          maxLength={300}
          dir="auto"
          aria-label={t("placeholder")}
          placeholder={t("placeholder")}
          enterKeyHint="send"
          className="field min-w-0 flex-1 rounded-full"
        />
        <button
          type="submit"
          disabled={busy || !text.trim()}
          aria-label={t("send")}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-green-700 text-white transition-colors hover:bg-green-800 disabled:opacity-40"
        >
          <SendHorizontal className="size-5 rtl:-scale-x-100" />
        </button>
        <WhatsAppLink
          text={common("waGeneral")}
          aria-label={common("whatsappChat")}
          title={common("whatsappChat")}
          className="flex size-11 flex-none items-center justify-center rounded-full bg-whatsapp text-white"
        >
          <WhatsAppIcon />
        </WhatsAppLink>
      </form>
    </section>
  );
}

function Bubble({ from, text }: Message) {
  return (
    <p
      dir="auto"
      className={cn(
        "w-fit max-w-[88%] rounded-2xl px-4 py-3 text-[15px] leading-relaxed whitespace-pre-line [overflow-wrap:anywhere]",
        from === "me"
          ? "self-end rounded-ee-md bg-green-700 text-white"
          : "rounded-es-md bg-white shadow-[0_4px_16px_rgb(4_29_21/.06)]",
      )}
    >
      {text}
    </p>
  );
}

function ReplyLink({ link, onLeave }: { link: ChatLink; onLeave: () => void }) {
  const style = cn(
    "inline-flex min-h-10 items-center rounded-full px-4 text-[13px] font-semibold transition-colors",
    link.href.startsWith("https://wa.me/")
      ? "bg-whatsapp text-white hover:bg-[#12703c]"
      : "bg-tint text-green-800 hover:bg-[#d2ebdd]",
  );
  if (link.href.startsWith("/")) {
    return (
      <Link href={link.href} onClick={onLeave} className={style}>
        {link.label}
      </Link>
    );
  }
  return (
    <a
      href={link.href}
      {...(link.href.startsWith("https://") && { target: "_blank", rel: "noopener noreferrer" })}
      className={style}
    >
      {link.label}
    </a>
  );
}

export { MessagesSquare as ChatIcon };
