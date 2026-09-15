import { avatarStyle, cn, initials } from "@/lib/utils";

const SIZES = {
  sm: "h-8 w-8 text-[0.6875rem]",
  md: "h-[2.625rem] w-[2.625rem] text-sm",
  lg: "h-20 w-20 text-2xl",
} as const;

export function Avatar({
  seed,
  displayName,
  size = "md",
  className,
}: {
  seed: string;
  displayName: string;
  size?: keyof typeof SIZES;
  className?: string;
}) {
  return (
    <span
      aria-hidden
      style={avatarStyle(seed)}
      className={cn(
        // The ring masks the feed's thread line where it passes behind the
        // avatar, so it has to match the page background, not the card.
        "inline-grid shrink-0 place-items-center rounded-full font-semibold tracking-wide text-white ring-4 ring-paper",
        SIZES[size],
        className,
      )}
    >
      {initials(displayName)}
    </span>
  );
}
