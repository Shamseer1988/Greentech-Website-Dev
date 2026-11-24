"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import { CARD, Field, Message } from "./ui";

export function PasswordForm() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [ok, setOk] = useState("");

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const { again, ...body } = Object.fromEntries(new FormData(form));
    setError("");
    setOk("");
    if (again !== body.new_password) return setError("The new passwords are different.");
    setBusy(true);
    try {
      await adminSend("PUT", "/api/admin-session", body);
      form.reset();
      setOk("Password changed. Other devices are logged out.");
    } catch (problem) {
      setError((problem as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={submit} className={`${CARD} flex max-w-110 flex-col gap-4`}>
      <h2 className="text-lg font-semibold text-slate">Change password</h2>
      <Field label="Current password">
        <input
          name="current_password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </Field>
      <Field label="New password" hint="At least 10 characters">
        <input
          name="new_password"
          type="password"
          required
          minLength={10}
          maxLength={128}
          autoComplete="new-password"
          className="field"
        />
      </Field>
      <Field label="New password again">
        <input name="again" type="password" required autoComplete="new-password" className="field" />
      </Field>
      <Message error={error} ok={ok} />
      <Button type="submit" disabled={busy}>
        {busy ? "Saving…" : "Change password"}
      </Button>
    </form>
  );
}
