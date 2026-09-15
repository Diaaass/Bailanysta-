import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getConnections } from "@/lib/queries/users";
import { UserList } from "@/components/profile/UserList";
import { ConnectionsHeader } from "@/components/profile/ConnectionsHeader";
import { getTranslations } from "@/lib/i18n";

export async function generateMetadata(
  props: PageProps<"/profile/[username]/followers">,
): Promise<Metadata> {
  const { username } = await props.params;
  const { t } = await getTranslations();
  return { title: `${t.profile.followersTab} @${username}` };
}

export default async function FollowersPage(
  props: PageProps<"/profile/[username]/followers">,
) {
  const { username } = await props.params;
  const { t } = await getTranslations();
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const users = await getConnections(username, "followers", viewer.id);
  if (!users) notFound();

  return (
    <div className="px-4 lg:px-0">
      <ConnectionsHeader username={username} active="followers" />
      <UserList
        users={users}
        emptyTitle={t.profile.noFollowersTitle}
        emptyDescription={t.profile.noFollowersDescription}
      />
    </div>
  );
}
