import type { ReactNode } from "react";
import { Logo } from "@/components/layout/Logo";
import { ThemeToggle } from "@/components/layout/ThemeToggle";
import { LocaleToggle } from "@/components/layout/LocaleToggle";

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-dvh flex-col">
      <header className="flex items-center justify-between px-5 py-5 sm:px-8">
        <div className="flex items-center gap-2.5 text-ink">
          <Logo className="h-7 w-7 text-accent" />
          <span className="text-xl font-semibold tracking-tight">
            Bailanysta
          </span>
        </div>
        <div className="flex items-center gap-2">
          <LocaleToggle />
          <ThemeToggle />
        </div>
      </header>

      <div className="flex flex-1 items-center justify-center px-5 pb-16">
        <div className="w-full max-w-sm">{children}</div>
      </div>
    </div>
  );
}
