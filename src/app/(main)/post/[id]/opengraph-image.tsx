import { ImageResponse } from "next/og";
import { getPostById } from "@/lib/queries/posts";
import { avatarStyle, initials } from "@/lib/utils";
import { plural } from "@/lib/i18n/plural";
import { getTranslations } from "@/lib/i18n";

export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export const alt = "Пост в Bailanysta";

// params arrives as a Promise in Next 16, matching the async request APIs.
export default async function Image({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { locale, t } = await getTranslations();
  const post = await getPostById(id);

  if (!post) {
    return new ImageResponse(
      (
        <div
          style={{
            width: "100%",
            height: "100%",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            background: "#0c1218",
            color: "#8d9aa8",
            fontSize: 44,
          }}
        >
          {t.post.notFound}
        </div>
      ),
      size,
    );
  }

  const text =
    post.content.length > 220 ? `${post.content.slice(0, 217)}…` : post.content;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: 72,
          background: "#0c1218",
          color: "#e3eaf1",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <div
            style={{
              width: 88,
              height: 88,
              borderRadius: 999,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontSize: 34,
              fontWeight: 600,
              color: "#fff",
              ...avatarStyle(post.author.avatarSeed),
            }}
          >
            {initials(post.author.displayName)}
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            <div style={{ fontSize: 34, fontWeight: 600 }}>
              {post.author.displayName}
            </div>
            <div style={{ fontSize: 26, color: "#8d9aa8" }}>
              {`@${post.author.username}`}
            </div>
          </div>
        </div>

        <div style={{ fontSize: 44, lineHeight: 1.35, letterSpacing: -0.5 }}>
          {text}
        </div>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 26,
            color: "#8d9aa8",
          }}
        >
          <div style={{ display: "flex", gap: 26 }}>
            <div>{plural(locale, post.likeCount, t.post.likeWord)}</div>
            <div>{plural(locale, post.commentCount, t.post.commentWord)}</div>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="9" stroke="#3cb4d6" strokeWidth="1.6" />
              <circle cx="12" cy="12" r="3.4" stroke="#3cb4d6" strokeWidth="1.6" />
            </svg>
            <div style={{ color: "#e3eaf1" }}>Bailanysta</div>
          </div>
        </div>
      </div>
    ),
    size,
  );
}
