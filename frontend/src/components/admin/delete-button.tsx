"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { cn } from "cn";
import { adminSend } from "@/lib/admin-client";
import { SMALL_BUTTON } from "./ui";

export function DeleteButton({
  path,
  question,
  next,
}: {
  path: string;
  question: string;
  next?: string;
}) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function remove() {
    if (!window.confirm(question)) return;
    setBusy(true);
    try {
      await adminSend("DELETE", path);
      if (next) router.push(next);
      router.refresh();
    } catch (problem) {
      window.alert((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <button
      type="button"
      onClick={remove}
      disabled={busy}
      className={cn(SMALL_BUTTON, "text-danger hover:border-danger hover:text-danger")}
    >
      Delete
    </button>
  );
}
