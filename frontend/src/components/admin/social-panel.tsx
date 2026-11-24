"use client";

import { useState } from "react";
import { cn } from "cn";
import { adminSend } from "@/lib/admin-client";
import type { SocialNetwork, SocialPost, SocialState } from "@/lib/admin-types";
import { CARD, Field, Message, qatarTime, SMALL_BUTTON } from "./ui";

const NAMES: Record<SocialNetwork, string> = { facebook: "Facebook", instagram: "Instagram" };

type Props = { propertyId: number; state: SocialState; caption: string; problem: string | null };

/** Post the cover photo with a text. Nothing is posted without pressing a button. */
export function SocialPanel({ propertyId, state, caption, problem }: Props) {
  const [text, setText] = useState(caption);
  const [again, setAgain] = useState(false);
  const [posts, setPosts] = useState(state.posts);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function post(network: SocialNetwork) {
    if (!window.confirm(`Post this to ${NAMES[network]} now? Everyone can see it.`)) return;
    setBusy(true);
    setError("");
    setOk("");
    try {
      setPosts(
        await adminSend<SocialPost[]>("POST", `/properties/${propertyId}/social`, {
          network,
          text,
          again,
        }),
      );
      setAgain(false);
      setOk(`Posted to ${NAMES[network]}.`);
    } catch (reason) {
      setError((reason as Error).message);
    } finally {
      setBusy(false);
    }
  }

  const blocked =
    state.networks.length === 0
      ? "Not set up yet. Add META_ACCESS_TOKEN, META_PAGE_ID and META_INSTAGRAM_ID to .env."
      : !state.online
        ? "Posting works when the website is online (SITE_URL in .env)."
        : problem;

  return (
    <section id="social" className={cn(CARD, "flex flex-col gap-4")}>
      <h2 className="text-lg font-semibold text-slate">Facebook & Instagram</h2>
      {blocked ? (
        <p className="text-sm text-muted-foreground">{blocked}</p>
      ) : (
        <>
          <Field label="Text" hint="The cover photo is added automatically.">
            <textarea
              rows={7}
              maxLength={2200}
              value={text}
              onChange={(event) => setText(event.target.value)}
              className="field"
            />
          </Field>
          {posts.length > 0 && (
            <label className="flex min-h-10 items-center gap-2.5 text-sm">
              <input
                type="checkbox"
                checked={again}
                onChange={(event) => setAgain(event.target.checked)}
                className="size-5 accent-green-700"
              />
              Post again
            </label>
          )}
          <div className="flex flex-wrap gap-2.5">
            {state.networks.map((network) => (
              <button
                key={network}
                type="button"
                disabled={busy || !text.trim()}
                onClick={() => post(network)}
                className={SMALL_BUTTON}
              >
                {busy ? "Please wait…" : `Post to ${NAMES[network]}`}
              </button>
            ))}
          </div>
        </>
      )}
      <Message error={error} ok={ok} />
      {posts.length > 0 && (
        <ul className="text-sm text-muted-foreground">
          {posts.map((item) => (
            <li key={item.id}>
              {NAMES[item.network]} · {qatarTime(item.created_at)}
              {item.user_name && ` · ${item.user_name}`}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
