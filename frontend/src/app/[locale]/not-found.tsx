import { useTranslations } from "next-intl";
import { buttonVariants } from "@/components/ui/button";
import { Link } from "@/i18n/navigation";

export default function NotFound() {
  const t = useTranslations("errors");
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="text-4xl font-bold text-slate">{t("notFoundTitle")}</h1>
      <p className="text-muted-foreground">{t("notFoundText")}</p>
      <Link href="/properties" className={buttonVariants()}>
        {t("browse")}
      </Link>
    </section>
  );
}
