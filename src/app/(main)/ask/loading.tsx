import { Skeleton } from "@/components/ui/Skeleton";

export default function AskLoading() {
  return (
    <div className="px-4 py-5 lg:px-0" aria-busy="true">
      <Skeleton className="h-7 w-64" />
      <Skeleton className="mt-3 h-4 w-full" />
      <Skeleton className="mt-1.5 h-4 w-3/4" />
      <Skeleton className="mt-4 h-11 w-full rounded-full" />
    </div>
  );
}
