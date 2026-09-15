import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getFeed } from "@/lib/queries/posts";
import { getViewerChrome } from "@/lib/queries/users";
import { Feed } from "@/components/post/Feed";
import { getTranslations } from "@/lib/i18n";

export default async function FeedPage() {
  const { t } = await getTranslations();
  const session = await getSessionUser();
  if (!session) redirect("/login");

  // Fresh identity, not the JWT copy: an edited display name has to reach the
  // composer avatar immediately.
  const viewer = await getViewerChrome(session.id);
  if (!viewer) redirect("/login");

  const { posts, nextCursor } = await getFeed({ viewerId: viewer.id });

  return (
    <div className="px-4 lg:px-0">
      <h1 className="sr-only">{t.feed.title}</h1>
      <Feed
        initialPosts={posts}
        initialCursor={nextCursor}
        viewer={viewer}
      />
    </div>
  );
}
