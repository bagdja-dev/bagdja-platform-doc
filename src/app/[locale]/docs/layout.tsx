import DocsShell from "./DocsShell";

import { flattenDocsPages, getDocsTree } from "@/lib/docs";
import { defaultLocale, isLocale, type Locale } from "@/lib/i18n";

export default async function DocsLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale: rawLocale } = await params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  const tree = await getDocsTree(locale);
  const pages = flattenDocsPages(tree);

  return (
    <div className="relative flex flex-1 bg-[var(--bg-main)]">
      <div className="absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-[radial-gradient(900px_circle_at_25%_20%,rgba(229,160,68,0.22),transparent_60%),radial-gradient(800px_circle_at_75%_30%,rgba(92,126,154,0.18),transparent_55%)]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_bottom,rgba(26,29,33,0.35),rgba(26,29,33,1))]" />
      </div>

      <DocsShell tree={tree} pages={pages}>
        {children}
      </DocsShell>
    </div>
  );
}
