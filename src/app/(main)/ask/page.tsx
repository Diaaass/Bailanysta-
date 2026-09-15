import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AskView } from "@/components/ask/AskView";

export const metadata: Metadata = { title: "Спросить о своих постах" };

export default async function AskPage() {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  return (
    <div className="px-4 lg:px-0">
      <AskView />
    </div>
  );
}
