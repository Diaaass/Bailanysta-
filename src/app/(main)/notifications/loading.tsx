import { NotificationsSkeleton } from "@/components/ui/Skeleton";
import { getTranslations } from "@/lib/i18n";

export default async function NotificationsLoading() {
  const { t } = await getTranslations();

  return (
    <div className="px-4 lg:px-0">
      <NotificationsSkeleton label={t.notifications.loading} />
    </div>
  );
}
