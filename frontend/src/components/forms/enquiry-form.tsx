"use client";

import { useLocale, useTranslations } from "next-intl";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { nameOf } from "@/lib/format";
import type { Ref } from "@/lib/types";

const OPTIONS = [
  "labour-accommodation",
  "warehouse",
  "cafeteria",
  "supermarket-shop",
  "residential",
  "list-my-property",
  "other",
] as const;

type Props =
  | { kind: "property"; code: string }
  | { kind: "contact"; locations: Ref[]; lookingFor?: string };

type Result = { reference?: number; fields?: string[]; error?: "limit" | "server" };

export function EnquiryForm(props: Props) {
  const t = useTranslations("form");
  const locale = useLocale();
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<Result>({});
  const form = useRef<HTMLFormElement>(null);
  const thanks = useRef<HTMLDivElement>(null);

  // Move focus to the answer, so it is seen and read aloud.
  useEffect(() => {
    if (result.reference) thanks.current?.focus();
    else form.current?.querySelector<HTMLElement>("[aria-invalid=true]")?.focus();
  }, [result]);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (sending) return;
    setSending(true);
    const data = new FormData(event.currentTarget);
    const body: Record<string, unknown> = {
      ...Object.fromEntries(data),
      reply_on_whatsapp: data.has("reply_on_whatsapp"),
    };
    if (props.kind === "property") body.property_code = props.code;
    setResult(await send(body));
    setSending(false);
  }

  if (result.reference) {
    return (
      <div
        ref={thanks}
        tabIndex={-1}
        role="status"
        className="col-span-full flex flex-col items-start gap-3 rounded-xl bg-tint p-5 leading-relaxed text-deep"
      >
        <strong>{t("thanksTitle")}</strong>
        <span>{t("thanksText", { reference: `#${result.reference}` })}</span>
        <button
          type="button"
          className="font-semibold text-green-700 underline"
          onClick={() => setResult({})}
        >
          {t("another")}
        </button>
      </div>
    );
  }

  const error = (name: string) =>
    result.fields?.includes(name)
      ? t(name === "name" || name === "phone" || name === "email" ? `errors.${name}` : "errors.field")
      : undefined;
  const contact = props.kind === "contact";
  const text = { error, required: t("required") };

  return (
    <form
      ref={form}
      onSubmit={submit}
      className={cn("grid gap-3.5", contact && "gap-4 sm:grid-cols-2")}
    >
      <Field name="name" label={t("name")} {...text} isRequired>
        {(p) => <input {...p} autoComplete="name" minLength={2} maxLength={120} />}
      </Field>
      <Field name="company" label={t("company")} {...text}>
        {(p) => <input {...p} autoComplete="organization" maxLength={160} />}
      </Field>
      <Field name="phone" label={t("phone")} {...text} isRequired>
        {(p) => (
          <input {...p} type="tel" dir="ltr" autoComplete="tel" maxLength={40} placeholder="+974" className={cn(p.className, "rtl:text-right")} />
        )}
      </Field>

      {contact ? (
        <>
          <Field name="email" label={t("email")} {...text}>
            {(p) => <input {...p} type="email" dir="ltr" autoComplete="email" maxLength={254} className={cn(p.className, "rtl:text-right")} />}
          </Field>
          <Field name="looking_for" label={t("lookingFor")} {...text}>
            {(p) => (
              <select {...p} defaultValue={props.lookingFor ?? ""}>
                <option value="">{t("choose")}</option>
                {OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {t(`options.${option}`)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="area" label={t("area")} {...text}>
            {(p) => (
              <select {...p} defaultValue="">
                <option value="">{t("anyArea")}</option>
                {props.locations.map((location) => (
                  // Saved in English for the office, shown in the visitor's language.
                  <option key={location.slug} value={location.name_en}>
                    {nameOf(location, locale)}
                  </option>
                ))}
              </select>
            )}
          </Field>
          <Field name="message" label={t("requirements")} {...text} className="sm:col-span-2">
            {(p) => <textarea {...p} rows={4} maxLength={3000} placeholder={t("requirementsHint")} />}
          </Field>
        </>
      ) : (
        <>
          <Field name="space_needed" label={t("space")} {...text}>
            {(p) => <input {...p} maxLength={120} />}
          </Field>
          <Field name="message" label={t("message")} {...text}>
            {(p) => (
              <textarea
                {...p}
                rows={3}
                maxLength={3000}
                defaultValue={t("defaultMessage", { code: props.code })}
              />
            )}
          </Field>
        </>
      )}

      <label className="col-span-full flex min-h-11 items-center gap-2.5 text-sm">
        <input type="checkbox" name="reply_on_whatsapp" className="size-5 accent-green-700" />
        {t("reply")}
      </label>

      <div className="col-span-full flex flex-wrap items-center gap-3">
        <Button
          type="submit"
          size="lg"
          disabled={sending}
          className={contact ? "" : "w-full"}
        >
          {sending ? t("sending") : t("submit")}
        </Button>
        <span className="text-[13px] text-muted-foreground">{t("privacy")}</span>
      </div>
      <div role="alert" className="col-span-full text-sm font-medium text-danger empty:hidden">
        {result.error && t(`errors.${result.error}`)}
        {result.fields?.includes("property_code") && t("errors.property_code")}
      </div>
    </form>
  );
}

type ControlProps = {
  id: string;
  name: string;
  required: boolean;
  className: string;
  "aria-invalid": boolean;
  "aria-describedby": string | undefined;
};

function Field({
  name,
  label,
  error,
  required,
  isRequired = false,
  className,
  children,
}: {
  name: string;
  label: string;
  error: (name: string) => string | undefined;
  required: string;
  isRequired?: boolean;
  className?: string;
  children: (props: ControlProps) => React.ReactNode;
}) {
  const message = error(name);
  const id = `enquiry-${name}`;
  return (
    <div className={cn("flex flex-col gap-1.5", className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-muted-foreground">
        {label}
        {isRequired && (
          <span className="text-rose" title={required}>
            {" "}
            *
          </span>
        )}
      </label>
      {children({
        id,
        name,
        required: isRequired,
        className: cn("field", message && "border-danger"),
        "aria-invalid": Boolean(message),
        "aria-describedby": message ? `${id}-error` : undefined,
      })}
      {message && (
        <span id={`${id}-error`} className="text-[13px] text-danger">
          {message}
        </span>
      )}
    </div>
  );
}

async function send(body: Record<string, unknown>): Promise<Result> {
  try {
    const response = await fetch("/api/enquiries", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(20_000),
    });
    const data = await response.json().catch(() => null);
    if (response.status === 201) return { reference: data.reference };
    if (response.status === 429) return { error: "limit" };
    if (response.status === 404) return { fields: ["property_code"] };
    if (response.status === 422 && Array.isArray(data?.detail)) {
      return { fields: data.detail.map((item: { loc: string[] }) => item.loc.at(-1) ?? "") };
    }
  } catch {
    // Network problem: same message as a server problem.
  }
  return { error: "server" };
}
