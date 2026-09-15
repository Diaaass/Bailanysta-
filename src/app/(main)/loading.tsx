import { ComposerSkeleton, FeedSkeleton } from "@/components/ui/Skeleton";

export default function FeedLoading() {
  return (
    <div className="px-4 lg:px-0">
      <ComposerSkeleton />
      <FeedSkeleton />
    </div>
  );
}
