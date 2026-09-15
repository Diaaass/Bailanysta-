import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";

export default function PostLoading() {
  return (
    <div className="px-4 lg:px-0">
      <div className="flex items-center gap-3 border-b border-line py-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-16" />
      </div>
      <FeedSkeleton count={1} />
      <FeedSkeleton count={3} />
    </div>
  );
}
