"use client";

import { CalendarDays, X } from "lucide-react";
import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button, buttonVariants } from "@/components/ui/button";
import { source } from "@/lib/stats";
import { track } from "@/lib/tracking";
import type { DaySlots } from "@/lib/types";
import { hasTurnstile, Turnstile } from "./turnstile";

type Problem = "limit" | "server" | "human" | "taken" | "name" | "phone" | "email" | "field";

/** Button, and the window to choose a day and time for a visit. */
export function ViewingBooking({ code, title }: { code: string; title: string }) {
  const t = useTranslations("viewing");
  const form = useTranslations("form");
  const locale = useLocale();
  const dialog = useRef<HTMLDialogElement>(null);
  const [open, setOpen] = useState(false);
  const [slots, setSlots] = useState<DaySlots[] | null>(null);
  const [failed, setFailed] = useState(false);
  const [day, setDay] = useState("");
  const [time, setTime] = useState("");
  const [sending, setSending] = useState(false);
  const [problem, setProblem] = useState<Problem | null>(null);
  const [done, setDone] = useState<number | null>(null);
  const [token, setToken] = useState("");
  const [attempt, setAttempt] = useState(0);

  async function load() {
    setFailed(false);
    setSlots(null);
    try {
      const response = await fetch(`/api/viewings?code=${code}`);
      if (!response.ok) throw new Error();
      const list = (await response.json()) as DaySlots[];
      setSlots(list);
      setDay(list[0]?.day ?? "");
      setTime("");
    } catch {
      setFailed(true);
    }
  }

  useEffect(() => {
    if (!open) return;
    const element = dialog.current;
    element?.showModal();
    document.documentElement.style.overflow = "hidden";
    return () => {
      document.documentElement.style.overflow = "";
    };
  }, [open]);

  function show() {
    setDone(null);
    setProblem(null);
    setOpen(true);
    void load();
  }

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    if (!day || !time) return setProblem("field");
    if (hasTurnstile && !token) return setProblem("human");
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setSending(true);
    setProblem(null);
    try {
      const response = await fetch("/api/viewings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...data,
          property_code: code,
          day,
          time,
          language: locale,
          source: source(),
          ...(token && { turnstile_token: token }),
        }),
        signal: AbortSignal.timeout(20_000),
      });
      const answer = await response.json().catch(() => null);
      if (response.status === 201) {
        setDone(answer.reference);
        track("enquiry", code);
      } else if (response.status === 409) {
        setProblem("taken");
        await load();
      } else if (response.status === 422) {
        const field = String(answer?.detail?.[0]?.loc?.at(-1) ?? "");
        setProblem(field === "name" || field === "phone" || field === "email" ? field : "field");
      } else
        setProblem(
          response.status === 429 ? "limit" : response.status === 403 ? "human" : "server",
        );
    } catch {
      setProblem("server");
    }
    setToken("");
    setAttempt((n) => n + 1);
    setSending(false);
  }

  const date = (value: string, options: Intl.DateTimeFormatOptions) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", {
      ...options,
      timeZone: "UTC",
    }).format(new Date(`${value}T00:00:00Z`));
  const clock = (value: string) =>
    new Intl.DateTimeFormat(locale === "ar" ? "ar-QA-u-nu-latn" : "en-GB", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
      timeZone: "UTC",
    }).format(new Date(`2000-01-01T${value}:00Z`));
  const times = slots?.find((s) => s.day === day)?.times ?? [];

  return (
    <>
      <button type="button" onClick={show} className={buttonVariants({ variant: "default" })}>
        <CalendarDays />
        {t("open")}
      </button>
      <dialog
        ref={dialog}
        aria-label={t("title")}
        data-lenis-prevent
        onClose={() => setOpen(false)}
        onClick={(event) => event.target === event.currentTarget && dialog.current?.close()}
        className="fixed inset-0 m-auto h-fit max-h-[92dvh] w-[min(560px,calc(100vw-1.5rem))] max-w-none overflow-y-auto rounded-3xl bg-white p-0 text-ink shadow-2xl backdrop:bg-deep/60"
      >
        {open && (
          <div className="flex flex-col gap-5 p-5 sm:p-7">
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold text-slate">{t("title")}</h2>
                <p className="text-sm text-muted-foreground">
                  {title} · <bdi>{code}</bdi>
                </p>
              </div>
              <button
                type="button"
                onClick={() => dialog.current?.close()}
                aria-label={t("close")}
                className="flex size-11 flex-none items-center justify-center rounded-full border border-field hover:bg-tint"
              >
                <X className="size-5" />
              </button>
            </div>

            {done !== null ? (
              <div
                role="status"
                className="flex flex-col gap-2 rounded-2xl bg-tint p-5 leading-relaxed text-deep"
              >
                <strong className="text-lg">{t("thanks")}</strong>
                <span>
                  {date(day, { weekday: "long", day: "numeric", month: "long" })} · {clock(time)}
                </span>
                <span>{t("thanksText", { reference: `V${done}` })}</span>
              </div>
            ) : failed ? (
              <p role="alert" className="text-danger">
                {form("errors.server")}
              </p>
            ) : !slots ? (
              <div className="h-40 animate-pulse rounded-2xl bg-ivory" />
            ) : !slots.length ? (
              <p className="rounded-2xl bg-ivory p-5">{t("none")}</p>
            ) : (
              <form onSubmit={submit} className="flex flex-col gap-5">
                <fieldset className="min-w-0">
                  <legend className="mb-2 text-sm font-semibold text-muted-foreground">
                    {t("day")}
                  </legend>
                  <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-2">
                    {slots.map((s) => (
                      <button
                        key={s.day}
                        type="button"
                        aria-pressed={s.day === day}
                        onClick={() => {
                          setDay(s.day);
                          setTime("");
                        }}
                        className={cn(
                          "flex min-w-18 flex-none flex-col items-center rounded-xl border px-3 py-2 text-xs transition-colors",
                          s.day === day
                            ? "border-green-700 bg-green-700 text-white"
                            : "border-field hover:border-green-700",
                        )}
                      >
                        {date(s.day, { weekday: "short" })}
                        <strong className="text-lg">{date(s.day, { day: "numeric" })}</strong>
                        {date(s.day, { month: "short" })}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <fieldset>
                  <legend className="mb-2 text-sm font-semibold text-muted-foreground">
                    {t("time")}
                  </legend>
                  <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
                    {times.map((value) => (
                      <button
                        key={value}
                        type="button"
                        aria-pressed={value === time}
                        onClick={() => setTime(value)}
                        className={cn(
                          "min-h-11 rounded-lg border text-sm font-medium transition-colors",
                          value === time
                            ? "border-green-700 bg-green-700 text-white"
                            : "border-field hover:border-green-700",
                        )}
                      >
                        {clock(value)}
                      </button>
                    ))}
                  </div>
                </fieldset>
                <div className="grid gap-3.5 sm:grid-cols-2">
                  <Field label={form("name")} required>
                    <input
                      name="name"
                      required
                      minLength={2}
                      maxLength={120}
                      autoComplete="name"
                      className="field"
                    />
                  </Field>
                  <Field label={form("phone")} required>
                    <input
                      name="phone"
                      type="tel"
                      dir="ltr"
                      required
                      maxLength={40}
                      autoComplete="tel"
                      placeholder="+974"
                      className="field rtl:text-right"
                    />
                  </Field>
                  <Field label={form("company")}>
                    <input
                      name="company"
                      maxLength={160}
                      autoComplete="organization"
                      className="field"
                    />
                  </Field>
                  <Field label={form("email")}>
                    <input
                      name="email"
                      type="email"
                      dir="ltr"
                      maxLength={254}
                      autoComplete="email"
                      className="field rtl:text-right"
                    />
                  </Field>
                  <Field label={t("note")} className="sm:col-span-2">
                    <textarea name="note" rows={2} maxLength={1000} className="field" />
                  </Field>
                </div>
                <Turnstile attempt={attempt} onToken={setToken} />
                <div role="alert" className="text-sm font-medium text-danger empty:hidden">
                  {problem === "taken"
                    ? t("taken")
                    : problem === "field"
                      ? t("choose")
                      : problem
                        ? form(`errors.${problem}`)
                        : null}
                </div>
                <div className="flex flex-col gap-2">
                  <Button type="submit" size="lg" disabled={sending}>
                    {sending ? form("sending") : t("submit")}
                  </Button>
                  <span className="text-center text-[13px] text-muted-foreground">
                    {t("promise")}
                  </span>
                </div>
              </form>
            )}
          </div>
        )}
      </dialog>
    </>
  );
}

function Field({
  label,
  required,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <label
      className={cn(
        "flex flex-col gap-1.5 text-[13px] font-semibold text-muted-foreground",
        className,
      )}
    >
      <span>
        {label}
        {required && <span className="text-rose"> *</span>}
      </span>
      {children}
    </label>
  );
}
