"use client";

import { Button } from "@/components/ui/button";

export default function AdminError() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-slate">Could not load this page</h1>
      <p className="text-muted-foreground">Please check that the backend is running.</p>
      <Button onClick={() => window.location.reload()}>Try again</Button>
    </div>
  );
}
