import { NotificationsSkeleton } from "@/components/ui/Skeleton";

export default function NotificationsLoading() {
  return (
    <div className="px-4 lg:px-0">
      <NotificationsSkeleton />
    </div>
  );
}
