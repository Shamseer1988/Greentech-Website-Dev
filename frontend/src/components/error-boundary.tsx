"use client";

import { useTranslations } from "next-intl";
import { unstable_rethrow, usePathname, useRouter } from "next/navigation";
import { Component, startTransition } from "react";
import { Button } from "@/components/ui/button";

type Props = { path: string; children: React.ReactNode };
type State = { failed: boolean; path: string };

/**
 * Shows a friendly message when a page fails. Used instead of error.tsx, which in Next.js 15
 * sometimes makes the browser rebuild a correct page while it loads (React error 418).
 */
class Boundary extends Component<Props, State> {
  state: State = { failed: false, path: this.props.path };

  static getDerivedStateFromError(error: unknown) {
    unstable_rethrow(error); // "not found" and redirects belong to Next.js
    return { failed: true };
  }

  // Opening another page clears the message.
  static getDerivedStateFromProps(props: Props, state: State) {
    return props.path === state.path ? null : { failed: false, path: props.path };
  }

  render() {
    return this.state.failed ? (
      <Failed onRetry={() => this.setState({ failed: false })} />
    ) : (
      this.props.children
    );
  }
}

export function ErrorBoundary({ children }: { children: React.ReactNode }) {
  return <Boundary path={usePathname()}>{children}</Boundary>;
}

function Failed({ onRetry }: { onRetry: () => void }) {
  const t = useTranslations("errors");
  const router = useRouter();
  return (
    <section className="container-page flex min-h-[55vh] flex-col items-center justify-center gap-5 py-20 text-center">
      <h1 className="text-4xl font-bold text-slate">{t("title")}</h1>
      <p className="text-muted-foreground">{t("text")}</p>
      <Button
        onClick={() =>
          startTransition(() => {
            router.refresh();
            onRetry();
          })
        }
      >
        {t("retry")}
      </Button>
    </section>
  );
}
