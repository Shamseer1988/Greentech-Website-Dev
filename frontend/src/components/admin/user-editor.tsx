"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import type { AdminUser } from "@/lib/admin-types";
import { CARD, Field, Message, SMALL_BUTTON } from "./ui";

export function UserRow({ user, isMe }: { user: AdminUser; isMe: boolean }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function save(change: object, done: string) {
    setBusy(true);
    setError("");
    setOk("");
    try {
      await adminSend("PATCH", `/users/${user.id}`, change);
      setOk(done);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  function newPassword(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const password = String(new FormData(form).get("password"));
    void save({ password }, "Password changed. This user must log in again.").then(() =>
      form.reset(),
    );
  }

  return (
    <div className="flex flex-col gap-3 border-b border-[#eef1ee] py-4 first:pt-0 last:border-0 last:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-col">
          <span className="font-semibold" dir="auto">
            {user.full_name} {isMe && "(you)"} {!user.is_active && "(disabled)"}
          </span>
          <span className="text-sm text-muted-foreground">{user.email}</span>
        </div>
        {isMe ? (
          <span className="text-sm text-muted-foreground capitalize">{user.role}</span>
        ) : (
          <div className="flex flex-wrap items-center gap-2">
            <select
              aria-label={`Role of ${user.full_name}`}
              value={user.role}
              disabled={busy}
              onChange={(event) => save({ role: event.target.value }, "Role changed.")}
              className="field w-auto text-sm"
            >
              <option value="agent">Agent</option>
              <option value="admin">Admin</option>
            </select>
            <button
              type="button"
              disabled={busy}
              onClick={() =>
                save(
                  { is_active: !user.is_active },
                  user.is_active ? "Access removed." : "Access restored.",
                )
              }
              className={SMALL_BUTTON}
            >
              {user.is_active ? "Disable" : "Enable"}
            </button>
            <details className="relative">
              <summary className={`${SMALL_BUTTON} cursor-pointer list-none`}>New password</summary>
              <form
                onSubmit={newPassword}
                className="absolute end-0 z-10 mt-2 flex w-72 flex-col gap-3 rounded-xl border border-line bg-white p-4 shadow-xl"
              >
                <Field label="New password" hint="At least 10 characters">
                  <input
                    name="password"
                    type="password"
                    minLength={10}
                    maxLength={128}
                    required
                    autoComplete="new-password"
                    className="field"
                  />
                </Field>
                <Button type="submit" size="sm" disabled={busy}>
                  Set password
                </Button>
              </form>
            </details>
          </div>
        )}
      </div>
      <Message error={error} ok={ok} />
    </div>
  );
}

export function NewUser() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      await adminSend("POST", "/users", body);
      router.refresh();
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${CARD} flex flex-col gap-4`}>
      <h2 className="text-lg font-semibold text-slate">Add user</h2>
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Field label="Full name" required>
          <input name="full_name" required minLength={2} maxLength={120} className="field" />
        </Field>
        <Field label="Email" required>
          <input name="email" type="email" required maxLength={254} className="field" autoComplete="off" />
        </Field>
        <Field label="Password" required hint="At least 10 characters">
          <input
            name="password"
            type="password"
            required
            minLength={10}
            maxLength={128}
            autoComplete="new-password"
            className="field"
          />
        </Field>
        <Field label="Role">
          <select name="role" className="field">
            <option value="agent">Agent</option>
            <option value="admin">Admin</option>
          </select>
        </Field>
      </div>
      <Message error={error} />
      <Button type="submit" size="sm" disabled={busy} className="self-start">
        {busy ? "Saving…" : "Add user"}
      </Button>
    </form>
  );
}
