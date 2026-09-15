import Link from "next/link";
import { Fragment } from "react";

const SPLIT = /(#[\p{L}\p{N}_]+)/gu;
const IS_TAG = /^#[\p{L}\p{N}_]+$/u;

// Hashtags become links so the same token works as navigation and as a search
// query, without storing tags in a separate table.
export function PostContent({ content }: { content: string }) {
  return (
    <p className="whitespace-pre-wrap break-words text-[0.9375rem] leading-[1.6] text-ink">
      {content.split(SPLIT).map((part, i) =>
        IS_TAG.test(part) ? (
          <Link
            key={i}
            href={`/search?q=${encodeURIComponent(part)}`}
            className="text-accent hover:underline"
          >
            {part}
          </Link>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        ),
      )}
    </p>
  );
}
