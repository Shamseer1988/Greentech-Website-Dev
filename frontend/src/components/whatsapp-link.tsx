import type { ComponentProps } from "react";
import { Link } from "@/i18n/navigation";
import { whatsappHref } from "@/lib/site";

type Props = Omit<ComponentProps<"a">, "href" | "ref"> & { text?: string };

/** Opens WhatsApp; until the number is set it opens the contact page. */
export function WhatsAppLink({ text, ...props }: Props) {
  const href = whatsappHref(text);
  if (!href) return <Link href="/contact" {...props} />;
  return <a href={href} target="_blank" rel="noopener noreferrer" {...props} />;
}

export function WhatsAppIcon({ className = "size-5" }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      className={className}
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 0 1-13.5 7.8L3 21l1.2-4.5A9 9 0 1 1 21 12z" />
    </svg>
  );
}
