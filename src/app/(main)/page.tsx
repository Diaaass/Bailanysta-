import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { getFeed } from "@/lib/queries/posts";
import { Feed } from "@/components/post/Feed";

export default async function FeedPage() {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const { posts, nextCursor } = await getFeed({ viewerId: viewer.id });

  return (
    <div className="px-4 lg:px-0">
      <h1 className="sr-only">Лента</h1>
      <Feed
        initialPosts={posts}
        initialCursor={nextCursor}
        viewer={viewer}
        emptyTitle="Лента пока пустая"
        emptyDescription="Напишите первый пост — он появится здесь сразу."
      />
    </div>
  );
}
