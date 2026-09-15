import { SearchSkeleton } from "@/components/ui/Skeleton";

export default function SearchLoading() {
  return (
    <div className="px-4 lg:px-0">
      <SearchSkeleton />
    </div>
  );
}
