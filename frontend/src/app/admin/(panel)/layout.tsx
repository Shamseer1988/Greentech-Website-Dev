import { Sidebar } from "@/components/admin/sidebar";
import { getMe } from "@/lib/admin-server";

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const me = await getMe();
  return (
    <div className="flex min-h-svh flex-col bg-[#f1f3f0] lg:flex-row">
      <Sidebar me={me} />
      <main className="flex min-w-0 flex-1 flex-col gap-6 p-4 sm:p-7">{children}</main>
    </div>
  );
}
