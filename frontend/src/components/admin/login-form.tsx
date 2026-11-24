"use client";

import { useState, type FormEvent } from "react";
import { Button } from "@/components/ui/button";
import { adminSend } from "@/lib/admin-client";
import { Field, Message } from "./ui";

export function LoginForm() {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = Object.fromEntries(new FormData(event.currentTarget));
    setBusy(true);
    setError("");
    try {
      await adminSend("POST", "/api/admin-session", data);
      window.location.href = "/admin";
    } catch (problem) {
      setError((problem as Error).message);
      setBusy(false);
    }
  }

  return (
    <form method="post" onSubmit={submit} className="flex flex-col gap-4">
      <Field label="Email">
        <input name="email" type="email" required autoComplete="username" className="field" />
      </Field>
      <Field label="Password">
        <input
          name="password"
          type="password"
          required
          autoComplete="current-password"
          className="field"
        />
      </Field>
      <Message error={error} />
      <Button type="submit" size="lg" disabled={busy}>
        {busy ? "Logging in…" : "Log in"}
      </Button>
    </form>
  );
}
