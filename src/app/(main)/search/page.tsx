import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { searchPosts } from "@/lib/queries/search";
import { SearchView } from "@/components/search/SearchView";
import { getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.search.title };
}

export default async function SearchPage(props: PageProps<"/search">) {
  const { t } = await getTranslations();
  const viewer = await getSessionUser();
  if (!viewer) redirect("/login");

  const { q } = await props.searchParams;
  const query = typeof q === "string" ? q : "";

  // Running the initial query on the server makes a shared /search?q=... link
  // land on results rather than an empty box.
  const outcome = query.trim()
    ? await searchPosts(query, viewer.id)
    : null;

  return (
    <div className="px-4 lg:px-0">
      <h1 className="sr-only">{t.search.title}</h1>
      <SearchView initialQuery={query} initialOutcome={outcome} />
    </div>
  );
}
