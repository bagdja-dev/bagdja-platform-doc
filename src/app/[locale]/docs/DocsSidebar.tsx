"use client";

import Link from "next/link";
import { useParams, usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import MiniSearch from "minisearch";
import { type Locale, translations } from "@/lib/i18n";

import type { DocsFolder, DocsNode, DocsPage } from "@/lib/docs";

type SearchIndexResponse = {
  indexJson: unknown;
};

function nodeKey(node: DocsNode) {
  if (node.type === "folder") return `folder:${node.name}`;
  return `page:${node.slug.join("/")}`;
}

function pageHref(page: DocsPage, locale: Locale) {
  return `/${locale}/docs/${page.slug.join("/")}`;
}

export default function DocsSidebar({
  tree,
  pages,
}: {
  tree: DocsFolder;
  pages: DocsPage[];
}) {
  const pathname = usePathname();
  const params = useParams();
  const locale = (params.locale as Locale) || "en";
  const [query, setQuery] = useState("");
  const [miniSearch, setMiniSearch] = useState<MiniSearch | null>(null);

  useEffect(() => {
    let cancelled = false;

    const loadIndex = async () => {
      try {
        const res = await fetch(`/api/docs-search?locale=${locale}`, { cache: "force-cache" });
        if (!res.ok) return;
        const data = (await res.json()) as SearchIndexResponse;
        if (cancelled) return;

        const ms = MiniSearch.loadJSON(data.indexJson as never, {
          fields: ["title", "description", "content", "headings", "slugPath"],
          storeFields: ["title", "description", "url"],
          searchOptions: { prefix: true, fuzzy: 0.2 },
        } as never);

        setMiniSearch(ms);
      } catch {
        return;
      }
    };

    loadIndex();
    return () => {
      cancelled = true;
    };
  }, [locale]);

  const fallbackPages = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return [];
    return pages.filter((p) => {
      const haystack = `${p.title} ${p.slug.join("/")}`.toLowerCase();
      return haystack.includes(q);
    });
  }, [pages, query]);

  const searchResults = useMemo(() => {
    const q = query.trim();
    if (!q || !miniSearch) return [];
    const results = miniSearch.search(q, { prefix: true, fuzzy: 0.2 });
    return results.slice(0, 20);
  }, [miniSearch, query]);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [openFolders, setOpenFolders] = useState<Set<string>>(new Set());

  useEffect(() => {
    const article = document.querySelector('[data-canonical-id]');
    if (article) {
      const id = article.getAttribute('data-canonical-id');
      setActiveId(id);

      // Auto-open parent folders when active page changes
      if (id) {
        const parts = id.split("/");
        const foldersToOpen = new Set(openFolders);
        let currentPath = "";
        for (let i = 0; i < parts.length - 1; i++) {
          currentPath = currentPath ? `${currentPath}/${parts[i]}` : parts[i];
          foldersToOpen.add(`folder:${currentPath}`);
        }
        setOpenFolders(foldersToOpen);
      }
    }
  }, [pathname]);

  const toggleFolder = (key: string) => {
    const next = new Set(openFolders);
    if (next.has(key)) {
      next.delete(key);
    } else {
      next.add(key);
    }
    setOpenFolders(next);
  };

  const renderNode = (node: DocsNode, depth: number) => {
    if (node.type === "folder") {
      const key = nodeKey(node);
      const isOpen = openFolders.has(key) || depth === 0;

      return (
        <div key={key} className="flex flex-col gap-0.5">
          <button
            onClick={() => toggleFolder(key)}
            className="flex items-center gap-2 px-2 py-1.5 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors text-left group"
            style={{ paddingLeft: `${depth * 12 + 8}px` }}
          >
            <span className="text-[10px] w-4 flex-shrink-0 text-zinc-500 group-hover:text-amber-500 transition-colors">
              {isOpen ? "▼" : "▶"}
            </span>
            <span className="truncate">{node.name.replace(/-/g, " ")}</span>
          </button>
          {isOpen && (
            <div className="flex flex-col gap-0.5">
              {node.children.map((child) => renderNode(child, depth + 1))}
            </div>
          )}
        </div>
      );
    }

    const href = pageHref(node, locale);
    const active = activeId === node.canonicalId;

    return (
      <Link
        key={nodeKey(node)}
        href={href}
        className={[
          "flex items-center gap-2 px-2 py-1.5 rounded-md text-sm transition-all border border-transparent",
          active
            ? "bg-amber-600/20 text-amber-500 border-amber-600/50 shadow-sm"
            : "text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200",
        ].join(" ")}
        style={{ marginLeft: `${depth * 12 + 8}px` }}
      >
        <span className="text-[10px] w-4 flex-shrink-0 opacity-70">📄</span>
        <span className="truncate">{node.title}</span>
      </Link>
    );
  };

  return (
    <aside className="flex h-full w-64 shrink-0 flex-col bg-zinc-900 border-r border-zinc-800">
      <div className="border-b border-zinc-800 p-4">
        <div className="text-xl font-bold text-amber-500">
          Bagdja Docs
        </div>
        <div className="text-[10px] text-zinc-500 uppercase tracking-widest mt-0.5">
          {translations[locale].documentation}
        </div>
      </div>
      <div className="p-3">
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={translations[locale].search}
          className="w-full text-xs rounded border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 focus:border-amber-500/50 outline-none placeholder:text-zinc-500 transition-all"
        />
      </div>
      <div className="min-h-0 flex-1 overflow-y-auto p-2 space-y-1 pb-6">
        {query.trim() ? (
          <div className="flex flex-col gap-1">
            {miniSearch ? (
              searchResults.length ? (
                searchResults.map((r) => (
                  <Link
                    key={String(r.id)}
                    href={String((r as unknown as { url?: string }).url ?? "")}
                    className="flex flex-col gap-0.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors border border-transparent"
                  >
                    <div className="font-medium text-zinc-100 flex items-center gap-2">
                      <span className="text-[10px] opacity-70">📄</span>
                      {String(r.title)}
                    </div>
                    <div className="text-[10px] text-zinc-500 truncate ml-6">
                      {String((r as unknown as { url?: string }).url ?? "")}
                    </div>
                  </Link>
                ))
              ) : (
                <div className="px-3 py-2 text-sm text-zinc-500">
                  {translations[locale].noResults}
                </div>
              )
            ) : fallbackPages.length ? (
              fallbackPages.map((p) => (
                <Link
                  key={p.slug.join("/")}
                  href={pageHref(p, locale)}
                  className="flex flex-col gap-0.5 px-3 py-2 rounded-md text-sm text-zinc-400 hover:bg-zinc-800 hover:text-zinc-200 transition-colors border border-transparent"
                >
                  <div className="font-medium text-zinc-100 flex items-center gap-2">
                    <span className="text-[10px] opacity-70">📄</span>
                    {p.title}
                  </div>
                  <div className="text-[10px] text-zinc-500 truncate ml-6">
                    /{locale}/docs/{p.slug.join("/")}
                  </div>
                </Link>
              ))
            ) : (
              <div className="px-3 py-2 text-sm text-zinc-500">
                {translations[locale].noResults}
              </div>
            )}
          </div>
        ) : (
          renderNode(tree, 0)
        )}
      </div>
    </aside>
  );
}
