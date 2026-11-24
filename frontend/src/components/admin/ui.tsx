import { cn } from "cn";

export function PageTitle({
  title,
  text,
  children,
}: {
  title: string;
  text?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3">
      <div>
        <h1 className="text-[30px] font-bold text-slate">{title}</h1>
        {text && <span className="text-sm text-muted-foreground">{text}</span>}
      </div>
      <div className="flex flex-wrap gap-2.5">{children}</div>
    </div>
  );
}

export function Field({
  label,
  hint,
  required,
  className,
  children,
}: {
  label: string;
  hint?: string;
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
      {hint && <span className="font-normal">{hint}</span>}
    </label>
  );
}

const BADGES: Record<string, string> = {
  available: "bg-tint text-deep",
  reserved: "bg-rose-tint text-rose-700",
  draft: "bg-rose-tint text-rose-700",
  rented: "bg-[#eceFed] text-[#3a4842]",
  new: "bg-rose text-white",
  contacted: "bg-tint text-deep",
  closed: "bg-[#eceFed] text-[#3a4842]",
};

export function Badge({ value }: { value: string }) {
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-1 text-xs font-semibold whitespace-nowrap capitalize",
        BADGES[value],
      )}
    >
      {value}
    </span>
  );
}

export function Message({ error, ok }: { error?: string; ok?: string }) {
  return (
    <div role={error ? "alert" : "status"} className="empty:hidden">
      {error && (
        <p className="rounded-lg bg-[#fdecea] px-4 py-3 text-sm font-medium text-danger">{error}</p>
      )}
      {!error && ok && (
        <p className="rounded-lg bg-tint px-4 py-3 text-sm font-medium text-deep">{ok}</p>
      )}
    </div>
  );
}

export const CARD = "rounded-2xl bg-white p-5";
export const SMALL_BUTTON =
  "inline-flex min-h-10 items-center justify-center gap-1.5 rounded-lg border border-field bg-white px-3 text-[13px] font-medium transition-colors hover:border-green-700 hover:text-green-700 disabled:opacity-50";

export const qatarTime = (iso: string) =>
  new Intl.DateTimeFormat("en-GB", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "Asia/Qatar",
  }).format(new Date(iso));
