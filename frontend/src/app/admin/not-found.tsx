import Link from "next/link";
import { buttonVariants } from "@/components/ui/button";

export default function AdminNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-bold text-slate">Not found</h1>
      <p className="text-muted-foreground">This page or record does not exist.</p>
      <Link href="/admin" className={buttonVariants()}>
        Back to dashboard
      </Link>
    </div>
  );
}
