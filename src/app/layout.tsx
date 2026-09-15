import type { Metadata } from "next";
import { Onest } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { LocaleProvider } from "@/components/i18n/LocaleProvider";
import { getTranslations } from "@/lib/i18n";
import "./globals.css";

const onest = Onest({
  variable: "--font-onest",
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
  display: "swap",
});

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();

  return {
    title: {
      default: "Bailanysta",
      template: "%s — Bailanysta",
    },
    description: t.brand.description,
  };
}

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const { locale, t } = await getTranslations();

  return (
    <html
      lang={locale}
      suppressHydrationWarning
      className={`${onest.variable} h-full antialiased`}
    >
      <body className="min-h-full">
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          <LocaleProvider locale={locale} dictionary={t}>
            {children}
          </LocaleProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
