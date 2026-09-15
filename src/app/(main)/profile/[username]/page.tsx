import type { Metadata } from "next";
import { notFound, redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getProfile, getViewerChrome } from "@/lib/queries/users";
import { getFeed } from "@/lib/queries/posts";
import { Feed } from "@/components/post/Feed";
import { ProfileHeader } from "@/components/profile/ProfileHeader";
import { getTranslations } from "@/lib/i18n";
import { format } from "@/lib/i18n/format";

export async function generateMetadata(
  props: PageProps<"/profile/[username]">,
): Promise<Metadata> {
  const { username } = await props.params;
  return { title: `@${username}` };
}

export default async function ProfilePage(
  props: PageProps<"/profile/[username]">,
) {
  const { username } = await props.params;
  const { t } = await getTranslations();
  const session = await getSessionUser();
  if (!session) redirect("/login");

  const viewer = await getViewerChrome(session.id);
  if (!viewer) redirect("/login");

  // "me" is a stable link for the navigation, resolved to the real handle so
  // the URL a user copies is always their public one.
  if (username === "me") redirect(`/profile/${viewer.username}`);

  const profile = await getProfile(username, viewer.id);
  if (!profile) notFound();

  const { posts, nextCursor } = await getFeed({
    viewerId: viewer.id,
    authorId: profile.id,
  });

  return (
    <div className="px-4 lg:px-0">
      <ProfileHeader profile={profile} />
      <Feed
        initialPosts={posts}
        initialCursor={nextCursor}
        viewer={viewer}
        showComposer={profile.isViewer}
        showScopeSwitch={false}
        authorUsername={profile.username}
        emptyTitle={
          profile.isViewer ? t.profile.emptyOwnTitle : t.profile.emptyTitle
        }
        emptyDescription={
          profile.isViewer
            ? t.profile.emptyOwnDescription
            : format(t.profile.emptyDescription, {
                name: profile.displayName,
              })
        }
      />
    </div>
  );
}
