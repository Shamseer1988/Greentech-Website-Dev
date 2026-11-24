import { useTranslations } from "next-intl";
import { cn } from "cn";
import { num } from "@/lib/format";

export function Price({ value, className }: { value: number | null; className?: string }) {
  const t = useTranslations("common");
  return (
    <span className={cn("font-bold text-green-700", className)}>
      {value === null ? (
        t("onRequest")
      ) : (
        <>
          {t("price", { price: num(value) })}
          <span className="font-sans text-sm font-normal text-muted-foreground">
            {" "}
            {t("perMonth")}
          </span>
        </>
      )}
    </span>
  );
}
