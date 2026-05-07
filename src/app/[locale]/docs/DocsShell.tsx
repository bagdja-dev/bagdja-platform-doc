"use client";

import Image from "next/image";
import { useEffect, useState } from "react";

import DocsSidebar from "./DocsSidebar";
import LanguageSwitcher from "@/components/LanguageSwitcher";

import type { DocsFolder, DocsPage } from "@/lib/docs";

export default function DocsShell({
  tree,
  pages,
  children,
}: {
  tree: DocsFolder;
  pages: DocsPage[];
  children: React.ReactNode;
}) {
  const [sidebarOpen, setSidebarOpen] = useState(() => {
    if (typeof window === "undefined") return true;
    try {
      const saved = window.localStorage.getItem("bagdja-platform:docs-sidebar");
      return saved !== "closed";
    } catch {
      return true;
    }
  });

  useEffect(() => {
    try {
      window.localStorage.setItem(
        "bagdja-platform:docs-sidebar",
        sidebarOpen ? "open" : "closed",
      );
    } catch {
      return;
    }
  }, [sidebarOpen]);

  return (
    <div className="flex h-[100dvh] min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-zinc-950 text-zinc-200">
      <header className="sticky top-0 z-40 border-b border-zinc-800 bg-zinc-900/80 backdrop-blur-md">
        <div className="mx-auto flex h-16 max-w-[1600px] items-center justify-between gap-4 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="relative inline-flex h-10 w-10 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 border border-zinc-700">
              <Image
                src="/icon.png"
                alt="Bagdja Logo"
                fill
                sizes="40px"
                className="object-contain p-1.5"
                priority
              />
            </div>
            <div>
              <div className="text-sm font-bold tracking-wide text-zinc-100">
                Bagdja Platform
              </div>
              <div className="text-[10px] uppercase tracking-widest text-zinc-500 font-medium">
                Developer Documentation
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <LanguageSwitcher className="mr-1" />
            <a
              href="mailto:contact@bagdja.com"
              className="hidden items-center justify-center rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-xs font-bold text-zinc-300 hover:border-amber-500/50 hover:text-amber-500 transition-all sm:inline-flex"
            >
              Support
            </a>
          </div>
        </div>
      </header>

      <div className="flex min-h-0 min-w-0 flex-1 overflow-hidden">
        <div className="hidden border-r border-zinc-800 bg-zinc-950 md:block">
          <div className="flex h-full w-14 flex-col items-center gap-3 pt-4">
            <button
              type="button"
              aria-label={sidebarOpen ? "Tutup sidebar" : "Buka sidebar"}
              onClick={() => setSidebarOpen((v) => !v)}
              className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-amber-500/50 hover:text-amber-500 transition-all"
            >
              {sidebarOpen ? "◀" : "▶"}
            </button>
            <span className="h-8 w-px bg-zinc-800" />
            <span className="inline-flex h-2 w-2 rounded-full bg-amber-500 shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
            <span className="inline-flex h-2 w-2 rounded-full bg-zinc-800" />
            <span className="inline-flex h-2 w-2 rounded-full bg-zinc-800" />
          </div>
        </div>

        <div
          className={[
            "min-h-0 shrink-0 transition-[width] duration-200 ease-out",
            sidebarOpen ? "w-64" : "w-0",
          ].join(" ")}
        >
          <div
            className={[
              "h-full overflow-hidden",
              sidebarOpen ? "border-r border-zinc-800" : "",
            ].join(" ")}
          >
            <DocsSidebar tree={tree} pages={pages} />
          </div>
        </div>

        <div className="min-h-0 min-w-0 flex-1 overflow-y-auto bg-zinc-950 relative">
          <div className="absolute inset-0 bg-[radial-gradient(600px_circle_at_20%_0%,rgba(245,158,11,0.05),transparent)] pointer-events-none" />
          <div className="mx-auto w-full max-w-[1320px] px-4 py-10 sm:px-6 relative z-10">{children}</div>
        </div>
      </div>
    </div>
  );
}
