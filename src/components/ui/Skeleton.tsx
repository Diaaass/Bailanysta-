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
    <article className="flex gap-3 py-5">
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
    <div aria-busy="true" aria-label="Загрузка ленты">
      {Array.from({ length: count }, (_, i) => (
        <PostSkeleton key={i} />
      ))}
    </div>
  );
}

export function ComposerSkeleton() {
  return (
    <div className="flex gap-3 border-b border-line py-5">
      <Skeleton className="h-[2.625rem] w-[2.625rem] shrink-0 rounded-full" />
      <div className="flex-1 space-y-3 pt-1">
        <Skeleton className="h-4 w-52" />
        <div className="flex items-center justify-between">
          <Skeleton className="h-6 w-48 rounded-full" />
          <Skeleton className="h-9 w-32 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function ProfileHeaderSkeleton() {
  return (
    <div className="border-b border-line py-6" aria-busy="true">
      <div className="flex items-start justify-between">
        <Skeleton className="h-20 w-20 rounded-full" />
        <Skeleton className="h-9 w-32 rounded-full" />
      </div>
      <Skeleton className="mt-4 h-6 w-52" />
      <Skeleton className="mt-2 h-4 w-28" />
      <Skeleton className="mt-3 h-4 w-72" />
      <div className="mt-4 flex gap-5">
        <Skeleton className="h-4 w-20" />
        <Skeleton className="h-4 w-28" />
        <Skeleton className="h-4 w-24" />
      </div>
    </div>
  );
}

export function NotificationsSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div aria-busy="true" aria-label="Загрузка уведомлений">
      <Skeleton className="my-5 h-7 w-44" />
      <div className="divide-y divide-line">
        {Array.from({ length: count }, (_, i) => (
          <div key={i} className="flex gap-3 py-4">
            <Skeleton className="h-8 w-8 shrink-0 rounded-full" />
            <div className="flex-1 space-y-2 pt-0.5">
              <Skeleton className="h-3.5 w-56" />
              <Skeleton className="h-3 w-32" />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function SearchSkeleton() {
  return (
    <div aria-busy="true" aria-label="Загрузка поиска">
      <div className="border-b border-line py-5">
        <div className="flex gap-2">
          <Skeleton className="h-11 flex-1 rounded-full" />
          <Skeleton className="h-11 w-24 rounded-full" />
        </div>
        <Skeleton className="mt-3 h-4 w-3/4" />
        <div className="mt-2 flex gap-1.5">
          {Array.from({ length: 4 }, (_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <FeedSkeleton count={3} />
    </div>
  );
}
