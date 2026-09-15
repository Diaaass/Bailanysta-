import { FeedSkeleton, ProfileHeaderSkeleton } from "@/components/ui/Skeleton";

export default function ProfileLoading() {
  return (
    <div className="px-4 lg:px-0">
      <ProfileHeaderSkeleton />
      <FeedSkeleton count={3} />
    </div>
  );
}
