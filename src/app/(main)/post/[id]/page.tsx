import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { comments, users } from "@/lib/db/schema";
import { getSessionUser } from "@/lib/api";
import { getPostById } from "@/lib/queries/posts";
import { SinglePost } from "@/components/post/SinglePost";
import { CommentThread } from "@/components/post/CommentThread";

export async function generateMetadata(
  props: PageProps<"/post/[id]">,
): Promise<Metadata> {
  const { id } = await props.params;
  const post = await getPostById(id);
  if (!post) return { title: "Пост не найден" };
  return {
    title: `${post.author.displayName}: ${post.content.slice(0, 60)}`,
    description: post.content.slice(0, 160),
  };
}

export default async function PostPage(props: PageProps<"/post/[id]">) {
  const { id } = await props.params;
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const post = await getPostById(id, viewer.id);
  if (!post) notFound();

  const rows = await db
    .select({
      id: comments.id,
      content: comments.content,
      createdAt: comments.createdAt,
      authorId: users.id,
      authorUsername: users.username,
      authorDisplayName: users.displayName,
      authorAvatarSeed: users.avatarSeed,
    })
    .from(comments)
    .innerJoin(users, eq(users.id, comments.authorId))
    .where(eq(comments.postId, id))
    .orderBy(asc(comments.createdAt));

  return (
    <div className="px-4 lg:px-0">
      <div className="flex items-center gap-3 border-b border-line py-4">
        <Link
          href="/"
          className="rounded-full p-1.5 text-ink-muted transition-colors hover:bg-surface-sunk hover:text-ink"
          aria-label="Назад в ленту"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path
              d="M19 12H5M12 19l-7-7 7-7"
              stroke="currentColor"
              strokeWidth="1.6"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </Link>
        <h1 className="text-[1.0625rem] font-semibold text-ink">Пост</h1>
      </div>

      <SinglePost post={post} />

      <CommentThread
        postId={post.id}
        viewer={viewer}
        initialComments={rows.map((r) => ({
          id: r.id,
          content: r.content,
          createdAt: r.createdAt.toISOString(),
          author: {
            id: r.authorId,
            username: r.authorUsername,
            displayName: r.authorDisplayName,
            avatarSeed: r.authorAvatarSeed,
          },
        }))}
      />
    </div>
  );
}
