import type { Metadata } from "next";
import { NewUser, UserRow } from "@/components/admin/user-editor";
import { CARD, PageTitle } from "@/components/admin/ui";
import { adminGet, requireAdminPage } from "@/lib/admin-server";
import type { AdminUser } from "@/lib/admin-types";

export const metadata: Metadata = { title: "Users & roles" };

export default async function UsersPage() {
  const me = await requireAdminPage();
  const users = await adminGet<AdminUser[]>("/users");
  return (
    <>
      <PageTitle title="Users & roles" text="Who can log in, and what they can do." />
      <p className={`${CARD} text-sm leading-relaxed text-muted-foreground`}>
        <b>Admin:</b> everything. <b>Agent:</b> add and edit properties and photos, and answer their
        own or unassigned enquiries. Agents cannot delete properties, export data, or manage
        locations and users.
      </p>
      <div className={`${CARD} flex flex-col`}>
        {users.map((user) => (
          <UserRow key={user.id} user={user} isMe={user.id === me.id} />
        ))}
      </div>
      <NewUser key={users.length} />
    </>
  );
}
