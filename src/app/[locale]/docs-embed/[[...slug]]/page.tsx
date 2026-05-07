import matter from "gray-matter";
import { notFound, redirect } from "next/navigation";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { getAllDocsSlugs, getDocSourceBySlug } from "@/lib/docs";
import { getMdxComponents } from "@/lib/mdx-components";
import { defaultLocale, isLocale, type Locale, locales } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ slug?: string[]; locale: string }>;
};

export async function generateStaticParams() {
  const slugs = await getAllDocsSlugs();
  const params: { locale: string; slug: string[] }[] = [];

  for (const locale of locales) {
    for (const slug of slugs) {
      params.push({ locale, slug });
    }
  }

  return params;
}

export default async function DocsEmbedPage(props: PageProps) {
  const { slug, locale: rawLocale } = await props.params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  if (!slug?.length) {
    const slugs = await getAllDocsSlugs();
    if (!slugs.length) {
      return (
        <div className="p-6 text-sm text-zinc-400">
          Dokumentasi belum tersedia.
        </div>
      );
    }
    redirect(`/${locale}/docs-embed/${slugs[0].join("/")}`);
  }

  const found = await getDocSourceBySlug(slug, locale);
  if (!found) notFound();

  const parsed = matter(found.source);
  const canonicalId =
    (typeof parsed.data.id === "string" ? parsed.data.id.trim() : null) ||
    slug.join("/");

  const { content } = await compileMDX({
    source: found.source,
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
    components: getMdxComponents(),
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-200">
      <article
        className="mx-auto w-full max-w-[1320px] px-6 py-8 sm:px-10 sm:py-10"
        data-canonical-id={canonicalId}
      >
        {content}
      </article>
    </div>
  );
}

