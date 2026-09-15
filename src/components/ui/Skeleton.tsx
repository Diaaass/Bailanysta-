import { cn } from "@/lib/utils";

export function Skeleton({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-md bg-line/70", className)}
      aria-hidden
    />
  );
}

export function PostSkeleton() {
  return (
    <article className="flex gap-3 py-5 pl-0">
      <Skeleton className="h-[2.625rem] w-[2.625rem] shrink-0 rounded-full" />
      <div className="flex-1 space-y-2.5 pt-1">
        <Skeleton className="h-3.5 w-40" />
        <Skeleton className="h-3 w-full" />
        <Skeleton className="h-3 w-4/5" />
        <Skeleton className="h-3 w-24" />
      </div>
    </article>
  );
}

export function FeedSkeleton({ count = 5 }: { count?: number }) {
  return (
    <div aria-label="Загрузка ленты" aria-busy="true">
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}
