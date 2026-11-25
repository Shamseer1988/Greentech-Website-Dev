import type { Metadata } from "next";
import { ChatEditor } from "@/components/admin/chat-editor";
import { PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { ChatContent } from "@/lib/types";

export const metadata: Metadata = { title: "Chat assistant" };

export default async function ChatAdminPage() {
  await requireAdminPage();
  const content = await adminGet<ChatContent>("/chat");
  return (
    <>
      <PageTitle
        title="Chat assistant"
        text="It already knows your properties, prices, areas, categories, steps and contact details. Add your own answers here for anything else."
      />
      <ChatEditor initial={content} />
    </>
  );
}
