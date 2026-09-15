import { SearchSkeleton } from "@/components/ui/Skeleton";
import { getTranslations } from "@/lib/i18n";

export default async function SearchLoading() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 lg:px-0">
      <SearchSkeleton label={t.search.loading} />
    </div>
  );
}
