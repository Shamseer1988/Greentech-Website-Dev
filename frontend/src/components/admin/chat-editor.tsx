"use client";

import { useState, type FormEvent } from "react";
import { cn } from "cn";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import type { ChatAnswer, ChatContent } from "@/lib/types";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

const EMPTY: ChatAnswer = {
  question_en: "",
  question_ar: "",
  answer_en: "",
  answer_ar: "",
  keywords: "",
};
const RTL = { dir: "rtl", lang: "ar" } as const;

/** Settings and own answers of the chat assistant. */
export function ChatEditor({ initial }: { initial: ChatContent }) {
  const [data, setData] = useState(initial);
  // A fixed number per answer, so deleting one does not mix up the others.
  const [keys, setKeys] = useState(() => initial.answers.map((_, i) => i));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  function set(change: Partial<ChatContent>) {
    setOk("");
    setData((old) => ({ ...old, ...change }));
  }
  const setAnswer = (i: number, change: Partial<ChatAnswer>) =>
    set({ answers: data.answers.map((a, n) => (n === i ? { ...a, ...change } : a)) });

  async function submit(event: FormEvent) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setOk("");
    try {
      await adminSend("PUT", "/chat", data);
      setOk("Saved. The assistant uses it now.");
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form
      onSubmit={submit}
      // A closed box opens when something inside it must be filled in.
      onInvalidCapture={(event) =>
        (event.target as HTMLElement).closest("details")?.setAttribute("open", "")
      }
      className="flex flex-col gap-5"
    >
      <section className={cn(CARD, "flex flex-col gap-4")}>
        <label className="flex min-h-11 items-center gap-2.5 text-sm font-medium">
          <input
            type="checkbox"
            name="enabled"
            checked={data.enabled}
            onChange={(event) => set({ enabled: event.target.checked })}
            className="size-5 accent-green-700"
          />
          Show the chat assistant (off = the round button opens WhatsApp)
        </label>
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Welcome message (English)" hint="Empty = standard message">
            <textarea
              name="welcome_en"
              rows={3}
              maxLength={300}
              value={data.welcome_en}
              onChange={(event) => set({ welcome_en: event.target.value })}
              className="field"
            />
          </Field>
          <Field label="Welcome message (Arabic)" hint="Empty = standard message">
            <textarea
              {...RTL}
              name="welcome_ar"
              rows={3}
              maxLength={300}
              value={data.welcome_ar}
              onChange={(event) => set({ welcome_ar: event.target.value })}
              className="field"
            />
          </Field>
        </div>
      </section>

      {data.answers.map((answer, i) => (
        <details
          key={keys[i]}
          data-answer
          className={CARD}
          open={keys[i] >= initial.answers.length || undefined}
        >
          <summary className="cursor-pointer font-semibold text-slate">
            {answer.question_en || "New question"}
          </summary>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <Field label="Question (English)" required>
              <input
                name="question_en"
                required
                minLength={3}
                maxLength={200}
                value={answer.question_en}
                onChange={(event) => setAnswer(i, { question_en: event.target.value })}
                className="field"
              />
            </Field>
            <Field label="Question (Arabic)">
              <input
                {...RTL}
                name="question_ar"
                maxLength={200}
                value={answer.question_ar}
                onChange={(event) => setAnswer(i, { question_ar: event.target.value })}
                className="field"
              />
            </Field>
            <Field label="Answer (English)" required>
              <textarea
                name="answer_en"
                required
                rows={4}
                maxLength={1000}
                value={answer.answer_en}
                onChange={(event) => setAnswer(i, { answer_en: event.target.value })}
                className="field"
              />
            </Field>
            <Field label="Answer (Arabic)" hint="Empty = the English answer">
              <textarea
                {...RTL}
                name="answer_ar"
                rows={4}
                maxLength={1000}
                value={answer.answer_ar}
                onChange={(event) => setAnswer(i, { answer_ar: event.target.value })}
                className="field"
              />
            </Field>
            <Field
              label="Keywords"
              hint="Separated by commas, English and Arabic. If a message has one of them, this answer is given."
              className="md:col-span-2"
            >
              <input
                name="keywords"
                dir="auto"
                maxLength={300}
                placeholder="commission, agency fee, عمولة"
                value={answer.keywords}
                onChange={(event) => setAnswer(i, { keywords: event.target.value })}
                className="field"
              />
            </Field>
          </div>
          <button
            type="button"
            onClick={() => {
              set({ answers: data.answers.filter((_, n) => n !== i) });
              setKeys(keys.filter((_, n) => n !== i));
            }}
            className={cn(SMALL_BUTTON, "mt-4 text-danger hover:border-danger hover:text-danger")}
          >
            Remove this answer
          </button>
        </details>
      ))}

      <div className={cn(CARD, "flex flex-col gap-4")}>
        <Message error={error} ok={ok} />
        <div className="flex flex-wrap gap-2.5">
          <Button type="submit" size="sm" disabled={busy}>
            {busy ? "Saving…" : "Save"}
          </Button>
          <button
            type="button"
            disabled={data.answers.length >= 200}
            onClick={() => {
              set({ answers: [...data.answers, EMPTY] });
              setKeys([...keys, Math.max(initial.answers.length - 1, ...keys) + 1]);
            }}
            className={SMALL_BUTTON}
          >
            + Add question and answer
          </button>
        </div>
      </div>
    </form>
  );
}
