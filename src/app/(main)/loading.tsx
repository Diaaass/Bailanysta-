import { ComposerSkeleton, FeedSkeleton } from "@/components/ui/Skeleton";
import { getTranslations } from "@/lib/i18n";

export default async function FeedLoading() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 lg:px-0">
      <ComposerSkeleton />
      <FeedSkeleton label={t.feed.skeletonLabel} />
    </div>
  );
}
