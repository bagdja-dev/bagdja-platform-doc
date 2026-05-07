import { redirect } from "next/navigation";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

export default async function Home({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  redirect(`/${locale}/docs/overview/introduction`);
}
