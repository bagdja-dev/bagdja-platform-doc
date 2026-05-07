import React from "react";
import { compileMDX } from "next-mdx-remote/rsc";
import remarkGfm from "remark-gfm";

import { getMdxComponents } from "@/lib/mdx-components";

export default async function AdminPreviewPage({
  searchParams,
}: {
  searchParams: Promise<{ content?: string; title?: string }>;
}) {
  const { content, title } = await searchParams;

  if (!content) {
    return <div className="p-8 text-zinc-500 italic">No content to preview.</div>;
  }

  const { content: mdxContent } = await compileMDX({
    source: content,
    options: {
      parseFrontmatter: true,
      mdxOptions: { remarkPlugins: [remarkGfm] },
    },
    components: getMdxComponents(),
  });

  return (
    <div className="bg-zinc-950 min-h-screen p-0 md:p-4 lg:p-8">
      <div className="mx-auto max-w-[1320px]">
        <div className="relative overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-900 shadow-xl">
          <article className="relative px-6 py-8 sm:px-10 sm:py-10">
            <div className="inline-flex items-center rounded-lg border border-zinc-800 bg-zinc-950 px-3 py-1 text-[10px] font-bold uppercase tracking-widest text-zinc-500 mb-4">
              Preview Mode
            </div>
            {title && (
              <div className="text-4xl font-black tracking-tight text-zinc-100 mb-10">
                {title}
              </div>
            )}
            <div>{mdxContent}</div>
          </article>
        </div>
      </div>
    </div>
  );
}
