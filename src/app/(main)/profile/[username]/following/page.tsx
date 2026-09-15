import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getConnections } from "@/lib/queries/users";
import { UserList } from "@/components/profile/UserList";
import { ConnectionsHeader } from "@/components/profile/ConnectionsHeader";

export async function generateMetadata(
  props: PageProps<"/profile/[username]/following">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `Подписки @${username}` };
}

export default async function FollowingPage(
  props: PageProps<"/profile/[username]/following">,
) {
  const { username } = await props.params;
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const users = await getConnections(username, "following", viewer.id);
  if (!users) notFound();

  return (
    <div className="px-4 lg:px-0">
      <ConnectionsHeader username={username} active="following" />
      <UserList
        users={users}
        emptyTitle="Подписок пока нет"
        emptyDescription="Здесь появятся профили, на которые подпишется этот пользователь."
      />
    </div>
  );
}
