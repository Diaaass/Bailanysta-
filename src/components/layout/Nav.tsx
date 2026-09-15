"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";
import { useUpdates } from "@/components/updates/UpdatesProvider";
import { useT } from "@/components/i18n/LocaleProvider";
import type { Dictionary } from "@/lib/i18n/dictionaries/ru";

type Item = {
  href: string;
  label: keyof Dictionary["nav"];
  icon: ReactNode;
  match: (p: string) => boolean;
};

const icon = (d: string) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden className="h-[1.3rem] w-[1.3rem]">
    <path d={d} stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

const ITEMS: Item[] = [
  {
    href: "/",
    label: "feed",
    icon: icon("M4 6h16M4 12h16M4 18h10"),
    match: (p) => p === "/",
  },
  {
    href: "/search",
    label: "search",
    icon: icon("M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3"),
    match: (p) => p.startsWith("/search"),
  },
  {
    href: "/ask",
    label: "ask",
    icon: icon("M12 3a9 9 0 100 18 9 9 0 000-18zM9.1 9a3 3 0 015.8 1c0 2-3 3-3 3M12 17h.01"),
    match: (p) => p.startsWith("/ask"),
  },
  {
    href: "/notifications",
    label: "notifications",
    icon: icon("M18 8a6 6 0 10-12 0c0 7-3 8-3 8h18s-3-1-3-8M13.7 21a2 2 0 01-3.4 0"),
    match: (p) => p.startsWith("/notifications"),
  },
  {
    href: "/profile/me",
    label: "profile",
    icon: icon("M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z"),
    match: (p) => p.startsWith("/profile"),
  },
];

export function Nav() {
  const pathname = usePathname();
  const { unread } = useUpdates();
  const t = useT();

  return (
    <nav aria-label={t.nav.main}>
      <ul className="flex justify-around lg:block lg:space-y-0.5">
        {ITEMS.map((item) => {
          const active = item.match(pathname);
          const showBadge = item.href === "/notifications" && unread > 0;
          return (
            <li key={item.href}>
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "relative flex flex-col items-center gap-0.5 px-3 py-2.5 text-[0.625rem] font-medium transition-colors",
                  "lg:flex-row lg:gap-3 lg:rounded-full lg:px-3.5 lg:py-2.5 lg:text-[0.9375rem]",
                  active
                    ? "text-accent lg:bg-accent-wash"
                    : "text-ink-muted hover:text-ink lg:hover:bg-surface-sunk",
                )}
              >
                <span className="relative">
                  {item.icon}
                  {showBadge ? (
                    <span className="absolute -right-1.5 -top-1 grid h-[1.05rem] min-w-[1.05rem] place-items-center rounded-full bg-ember px-1 text-[0.625rem] font-semibold text-white">
                      {unread > 9 ? "9+" : unread}
                    </span>
                  ) : null}
                </span>
                <span>{t.nav[item.label]}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
