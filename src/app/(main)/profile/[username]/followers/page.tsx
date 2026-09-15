import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getConnections } from "@/lib/queries/users";
import { UserList } from "@/components/profile/UserList";
import { ConnectionsHeader } from "@/components/profile/ConnectionsHeader";

export async function generateMetadata(
  props: PageProps<"/profile/[username]/followers">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `Подписчики @${username}` };
}

export default async function FollowersPage(
  props: PageProps<"/profile/[username]/followers">,
) {
  const { username } = await props.params;
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const users = await getConnections(username, "followers", viewer.id);
  if (!users) notFound();

  return (
    <div className="px-4 lg:px-0">
      <ConnectionsHeader username={username} active="followers" />
      <UserList
        users={users}
        emptyTitle="Подписчиков пока нет"
        emptyDescription="Здесь появятся люди, которые подпишутся на этот профиль."
      />
    </div>
  );
}
