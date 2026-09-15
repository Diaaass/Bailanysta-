import { getSessionUser, unauthorized } from "@/lib/api";
import {
  getNotifications,
  getUnreadCount,
  markAllRead,
} from "@/lib/queries/notifications";

export async function GET() {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  return Response.json({
    notifications: await getNotifications(viewer.id),
    unreadCount: await getUnreadCount(viewer.id),
  });
}

export async function PATCH() {
  const viewer = await getSessionUser();
  if (!viewer) return unauthorized();

  await markAllRead(viewer.id);
  return Response.json({ unreadCount: 0 });
}
