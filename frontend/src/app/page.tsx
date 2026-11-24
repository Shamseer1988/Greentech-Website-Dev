import { Button } from "@/components/ui/button";

// Temporary setup page. Replaced by the approved Home v2 design in Phase 3.
const swatches = [
  ["Deepest", "bg-brand-deepest"],
  ["Dark", "bg-brand-dark"],
  ["Primary", "bg-brand"],
  ["Mint", "bg-brand-mint"],
  ["Gold", "bg-brand-gold"],
  ["WhatsApp", "bg-brand-whatsapp"],
] as const;

export default function Home() {
  return (
    <main className="flex min-h-svh flex-col justify-center bg-brand-dark px-6 py-16 text-white">
      <div className="mx-auto w-full max-w-3xl space-y-8">
        <p className="text-sm font-medium tracking-widest text-brand-mint uppercase">
          Greentech Real Estate Broker
        </p>
        <h1 className="font-heading text-4xl font-bold tracking-tight sm:text-6xl">
          Rent <span className="text-brand-gold">warehouses</span>
          <br />
          across Qatar.
        </h1>
        <p className="max-w-xl text-lg text-white/75">
          Project setup is working. The real home page comes in Phase 3.
        </p>
        <p lang="ar" dir="rtl" className="text-2xl">
          سكن عمال ومستودعات للإيجار في قطر
        </p>
        <Button className="h-12 bg-brand-gold px-6 text-base font-semibold text-ink hover:bg-brand-gold/85">
          Sample button
        </Button>
        <ul className="grid grid-cols-3 gap-3 sm:grid-cols-6">
          {swatches.map(([name, color]) => (
            <li key={name} className="text-center text-xs text-white/75">
              <span
                className={`mb-2 block h-14 rounded-xl border border-white/15 ${color}`}
              />
              {name}
            </li>
          ))}
        </ul>
      </div>
    </main>
  );
}
