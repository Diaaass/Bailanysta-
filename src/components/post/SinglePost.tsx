"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedPost } from "@/lib/queries/posts";
import { PostCard } from "@/components/post/PostCard";

export function SinglePost({ post }: { post: FeedPost }) {
  const router = useRouter();
  const [current, setCurrent] = useState(post);

  return (
    <div className="border-b border-line">
      <PostCard
        post={current}
        onChange={setCurrent}
        onDelete={() => router.push("/")}
      />
    </div>
  );
}
