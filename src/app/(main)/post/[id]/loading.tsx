import { FeedSkeleton, Skeleton } from "@/components/ui/Skeleton";
import { getTranslations } from "@/lib/i18n";

export default async function PostLoading() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 lg:px-0">
      <div className="flex items-center gap-3 border-b border-line py-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-16" />
      </div>
      <FeedSkeleton count={1} label={t.post.single} />
      <FeedSkeleton count={3} label={t.comments.section} />
    </div>
  );
}
