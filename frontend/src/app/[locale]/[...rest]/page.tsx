import { notFound } from "next/navigation";

// Unknown addresses show the translated "not found" page.
export default function CatchAll() {
  notFound();
}
