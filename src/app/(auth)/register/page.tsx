import { Suspense } from "react";
import type { Metadata } from "next";
import { AuthForm } from "@/components/auth/AuthForm";
import { getTranslations } from "@/lib/i18n";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getTranslations();
  return { title: t.auth.register };
}

export default function RegisterPage() {
  return (
    <Suspense>
      <AuthForm mode="register" />
    </Suspense>
  );
}
