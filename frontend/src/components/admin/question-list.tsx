"use client";

import { useState } from "react";
import { adminSend } from "@/lib/admin-client";
import type { Report } from "@/lib/admin-types";
import { Message, qatarTime, SMALL_BUTTON } from "./ui";

export function QuestionList({ initial }: { initial: Report["questions"] }) {
  const [items, setItems] = useState(initial);
  const [error, setError] = useState("");

  async function remove(id: number) {
    setError("");
    try {
      await adminSend("DELETE", `/chat-questions/${id}`);
      setItems((list) => list.filter((q) => q.id !== id));
    } catch (problem) {
      setError((problem as Error).message);
    }
  }

  return (
    <>
      <Message error={error} />
      <ul>
        {items.map((q) => (
          <li
            key={q.id}
            className="flex flex-wrap items-center justify-between gap-3 border-t border-line py-2 text-sm"
          >
            <span dir="auto" className="min-w-0 break-words">
              {q.text}
            </span>
            <span className="flex items-center gap-3 text-muted-foreground">
              asked {q.count}× · {qatarTime(q.last_at)}
              <button type="button" onClick={() => void remove(q.id)} className={SMALL_BUTTON}>
                Remove
              </button>
            </span>
          </li>
        ))}
      </ul>
    </>
  );
}
