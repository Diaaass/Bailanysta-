import type { ReactNode } from "react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/api";
import { signOut } from "@/lib/auth";
import { Logo } from "@/components/layout/Logo";
import { Nav } from "@/components/layout/Nav";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { Avatar } from "@/components/ui/Avatar";
import { getViewerChrome } from "@/lib/queries/users";
import { DiscoverRail } from "@/components/layout/DiscoverRail";
import { UpdatesProvider } from "@/components/updates/UpdatesProvider";

export default async function MainLayout({
  children,
}: {
  children: ReactNode;
}) {
  const session = await getSessionUser();
  if (!session) redirect("/login");

  // Name and avatar come from the database, not the JWT: renaming yourself
  // would otherwise leave the old name in the sidebar until the next sign-in.
  const viewer = await getViewerChrome(session.id);
  if (!viewer) redirect("/login");

  const unread = viewer.unreadCount;

  return (
    <UpdatesProvider
      initialUnread={unread}
      pollIntervalMs={Number(process.env.UPDATES_POLL_MS) || undefined}
    >
    <div className="mx-auto flex w-full max-w-6xl flex-col lg:flex-row lg:gap-10 lg:px-6 xl:max-w-7xl">
      {/* First stop for a keyboard user: skip the whole navigation rail. */}
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-full focus:bg-accent focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-white"
      >
        Перейти к содержимому
      </a>
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-line bg-paper/90 px-4 py-3 backdrop-blur lg:hidden">
        <Link href="/" className="flex items-center gap-2 text-ink">
          <Logo className="h-6 w-6 text-accent" />
          <span className="text-[1.0625rem] font-semibold tracking-tight">
            Bailanysta
          </span>
        </Link>
        <ThemeToggle />
      </header>

      <aside className="hidden w-60 shrink-0 lg:block">
        <div className="sticky top-0 flex h-dvh flex-col py-7">
          <Link
            href="/"
            className="mb-8 flex items-center gap-2.5 px-3 text-ink"
          >
            <Logo className="h-7 w-7 text-accent" />
            <span className="text-xl font-semibold tracking-tight">
              Bailanysta
            </span>
          </Link>

          <Nav />

          <div className="mt-auto space-y-4 px-1">
            <ThemeToggle />
            <div className="flex items-center gap-2.5 border-t border-line pt-4">
              <Avatar
                seed={viewer.avatarSeed}
                displayName={viewer.displayName}
                size="sm"
              />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">
                  {viewer.displayName}
                </p>
                <p className="truncate text-xs text-ink-faint">
                  @{viewer.username}
                </p>
              </div>
              <form
                action={async () => {
                  "use server";
                  await signOut({ redirectTo: "/login" });
                }}
              >
                <button
                  type="submit"
                  title="Выйти"
                  className="rounded-full p-1.5 text-ink-faint transition-colors hover:bg-surface-sunk hover:text-ink"
                >
                  <svg
                    viewBox="0 0 24 24"
                    fill="none"
                    aria-hidden
                    className="h-[1.15rem] w-[1.15rem]"
                  >
                    <path
                      d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                  <span className="sr-only">Выйти</span>
                </button>
              </form>
            </div>
          </div>
        </div>
      </aside>

      <main
        id="main"
        tabIndex={-1}
        className="min-w-0 flex-1 pb-20 lg:max-w-[38rem] lg:pb-16"
      >
        {children}
      </main>

      <DiscoverRail viewerId={viewer.id} />

      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 backdrop-blur lg:hidden">
        <Nav />
      </nav>
    </div>
    </UpdatesProvider>
  );
}
