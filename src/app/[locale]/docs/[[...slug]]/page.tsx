import React from "react";
import type { Metadata } from "next";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";
import matter from "gray-matter";
import { notFound, redirect } from "next/navigation";

import { getAllDocsSlugs, getDocSourceBySlug } from "@/lib/docs";
import { defaultLocale, isLocale, type Locale, locales, translations } from "@/lib/i18n";

type PageProps = {
  params: Promise<{ slug?: string[]; locale: string }>;
};

import { getMdxComponents } from "@/lib/mdx-components";

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

export async function generateMetadata(props: PageProps): Promise<Metadata> {
  const { slug, locale: rawLocale } = await props.params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;
  if (!slug?.length) {
    return {
      title: "Dokumentasi",
      description: "Dokumentasi Bagdja Platform",
    };
  }

  const found = await getDocSourceBySlug(slug, locale);
  if (!found) return { title: "Dokumentasi" };

  const parsed = matter(found.source);
  const title =
    typeof parsed.data.title === "string" && parsed.data.title.trim()
      ? parsed.data.title.trim()
      : slug[slug.length - 1];

  const description =
    typeof parsed.data.description === "string" && parsed.data.description
      ? parsed.data.description
      : undefined;

  return { title, description };
}

export default async function DocsPage(props: PageProps) {
  const { slug, locale: rawLocale } = await props.params;
  const locale: Locale = isLocale(rawLocale) ? rawLocale : defaultLocale;

  if (!slug?.length) {
    const slugs = await getAllDocsSlugs();
    if (!slugs.length) {
      const t = translations[locale];
      return (
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-xl">
          <div className="text-2xl font-black text-zinc-100">
            {t.noDocsTitle}
          </div>
          <div className="mt-4 text-zinc-400 leading-relaxed">
            {t.noDocsDesc.split("docs/").map((part, i, arr) => (
              <React.Fragment key={i}>
                {part}
                {i < arr.length - 1 && (
                  <code className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-amber-500/90 border border-zinc-700">
                    docs/
                  </code>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    redirect(`/${locale}/docs/${slugs[0].join("/")}`);
  }

  const found = await getDocSourceBySlug(slug, locale);
  if (!found) notFound();

  const parsed = matter(found.source);
  const canonicalId = (typeof parsed.data.id === "string" ? parsed.data.id.trim() : null) || slug.join("/");

  const { content, frontmatter } = await compileMDX<{
    title?: string;
    description?: string;
    order?: number;
  }>({
    source: found.source,
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
    components: getMdxComponents(),
  });

  const title =
    typeof frontmatter.title === "string" && frontmatter.title.trim()
      ? frontmatter.title.trim()
      : slug[slug.length - 1];

  return (
    <div
      className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl"
      data-canonical-id={canonicalId}
    >
      <article className="relative px-6 py-8 sm:px-10 sm:py-10">
        <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500">
          /docs/{slug.join("/")}/
        </div>

        <div className="mt-4 text-4xl font-black tracking-tight text-zinc-100">
          {title}
        </div>

        {typeof frontmatter.description === "string" &&
          frontmatter.description.trim() ? (
          <div className="mt-3 text-base leading-7 text-zinc-400 font-medium">
            {frontmatter.description.trim()}
          </div>
        ) : null}

        <div className="mt-10">{content}</div>
      </article>
    </div>
  );
}
