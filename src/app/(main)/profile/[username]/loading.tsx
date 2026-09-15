import { FeedSkeleton, ProfileHeaderSkeleton } from "@/components/ui/Skeleton";
import { getTranslations } from "@/lib/i18n";

export default async function ProfileLoading() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 lg:px-0">
      <ProfileHeaderSkeleton />
      <FeedSkeleton count={3} label={t.feed.skeletonLabel} />
    </div>
  );
}
