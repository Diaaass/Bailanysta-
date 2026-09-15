import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { AskView } from "@/components/ask/AskView";
import { getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.ask.title };
}

export default async function AskPage() {
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  return (
    <div className="px-4 lg:px-0">
      <AskView />
    </div>
  );
}
