"use client";

import React, { useRef, useState, useEffect, useMemo } from "react";
import MiniSearch from "minisearch";
import type { MDXEditorMethods } from "@mdxeditor/editor";
import { ForwardRefMDXEditor } from "@/components/mdx/ForwardRefMDXEditor";

// Preview uses the public docs page for 1:1 styling.
function PublicDocsPreview({ slug, locale }: { slug: string; locale: string }) {
  const [iframeKey, setIframeVersion] = React.useState(0);

  // Reload iframe when slug/locale changes (debounced).
  React.useEffect(() => {
    const timer = setTimeout(() => {
      setIframeVersion(v => v + 1);
    }, 500); // Debounce preview updates
    return () => clearTimeout(timer);
  }, [slug, locale]);

  return (
    <div className="w-full h-full">
      {!slug.trim() ? (
        <div className="flex h-full w-full items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm text-zinc-400">
          Isi slug dulu untuk preview.
        </div>
      ) : (
      <iframe
        key={iframeKey}
        src={`/${locale}/docs-embed/${slug}`}
        className="w-full h-full border-none"
        title="Public Docs Preview"
      />
      )}
    </div>
  );
}
import { translations, type Locale } from "@/lib/i18n";

const LANGUAGES = [
  { code: "id", label: "Bahasa (ID)" },
  { code: "en", label: "English (EN)" },
  { code: "es", label: "Español (ES)" },
  { code: "zh", label: "Chinese (ZH)" },
  { code: "ar", label: "Arabic (AR)" },
];

export default function AdminPage() {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  const [password, setPassword] = useState("");
  const [docs, setDocs] = useState<any[]>([]); // Array of { id, locales: { id, en... } }
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [contents, setContents] = useState<Record<string, { slug: string, content: string }>>({
    id: { slug: "", content: "" },
    en: { slug: "", content: "" },
    es: { slug: "", content: "" },
    zh: { slug: "", content: "" },
    ar: { slug: "", content: "" }
  });
  const [activeTab, setActiveTab] = useState("id");
  const [isSaving, setIsSaving] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [newSlug, setNewSlug] = useState("");
  const [toast, setToast] = useState<{ message: string; type: "success" | "error" | "info" } | null>(null);
  const [modal, setModal] = useState<{ isOpen: boolean; parentSlug: string; value: string } | null>(null);
  const [deleteModal, setDeleteModal] = useState<{ isOpen: boolean; id: string; isFolder: boolean; path?: string } | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [contentMiniSearch, setContentMiniSearch] = useState<MiniSearch | null>(null);
  const [indexVersion, setIndexVersion] = useState(0);
  const [viewMode, setViewMode] = useState<"edit" | "visual" | "preview">("visual");

  const rawEditorRef = useRef<HTMLTextAreaElement | null>(null);
  const mdxEditorRef = useRef<MDXEditorMethods | null>(null);

  const setActiveContent = (
    nextContent: string,
    opts?: { selection?: { start: number; end: number }; preserveScroll?: boolean },
  ) => {
    const scrollSnapshot =
      opts?.preserveScroll && rawEditorRef.current
        ? { top: rawEditorRef.current.scrollTop, left: rawEditorRef.current.scrollLeft }
        : null;

    setContents((prev) => {
      const prevEntry = prev[activeTab] ?? { slug: "", content: "" };
      return {
        ...prev,
        [activeTab]: {
          ...prevEntry,
          content: nextContent,
        },
      };
    });

    if (!opts?.selection && !scrollSnapshot) return;

    requestAnimationFrame(() => {
      const el = rawEditorRef.current;
      if (!el) return;

      if (scrollSnapshot) {
        el.scrollTop = scrollSnapshot.top;
        el.scrollLeft = scrollSnapshot.left;
      }

      if (opts?.selection) {
        // Prevent browser from jumping scroll when focusing.
        try {
          (el as unknown as { focus: (o?: { preventScroll?: boolean }) => void }).focus({
            preventScroll: true,
          });
        } catch {
          el.focus();
        }
        el.setSelectionRange(opts.selection.start, opts.selection.end);
      }

      // Some browsers scroll on setSelectionRange; restore once more.
      if (scrollSnapshot) {
        requestAnimationFrame(() => {
          const el2 = rawEditorRef.current;
          if (!el2) return;
          el2.scrollTop = scrollSnapshot.top;
          el2.scrollLeft = scrollSnapshot.left;
        });
      }
    });
  };

  const applyWrap = (before: string, after: string, placeholder: string) => {
    const el = rawEditorRef.current;
    if (!el) return;
    const current = contents[activeTab]?.content ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const selected = current.slice(start, end) || placeholder;
    const next =
      current.slice(0, start) + before + selected + after + current.slice(end);
    const selStart = start + before.length;
    const selEnd = selStart + selected.length;
    setActiveContent(next, {
      selection: { start: selStart, end: selEnd },
      preserveScroll: true,
    });
  };

  const applyPrefixLines = (prefix: string) => {
    const el = rawEditorRef.current;
    if (!el) return;
    const current = contents[activeTab]?.content ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;

    const lineStart = current.lastIndexOf("\n", Math.max(0, start - 1)) + 1;
    const lineEnd = (() => {
      const idx = current.indexOf("\n", end);
      return idx === -1 ? current.length : idx;
    })();

    const block = current.slice(lineStart, lineEnd);
    const lines = block.split("\n");
    const nextBlock = lines
      .map((l) => (l.startsWith(prefix) ? l : `${prefix}${l}`))
      .join("\n");
    const next = current.slice(0, lineStart) + nextBlock + current.slice(lineEnd);

    const delta = nextBlock.length - block.length;
    setActiveContent(next, {
      selection: { start: start + prefix.length, end: end + delta },
      preserveScroll: true,
    });
  };

  const insertSnippet = (snippet: string, cursorOffsetFromEnd: number = 0) => {
    const el = rawEditorRef.current;
    if (!el) return;
    const current = contents[activeTab]?.content ?? "";
    const start = el.selectionStart ?? 0;
    const end = el.selectionEnd ?? 0;
    const next = current.slice(0, start) + snippet + current.slice(end);
    const cursor = start + snippet.length - cursorOffsetFromEnd;
    setActiveContent(next, {
      selection: { start: cursor, end: cursor },
      preserveScroll: true,
    });
  };

  // Prevent toolbar buttons from stealing focus and resetting selection/scroll.
  const keepRawEditorFocus = (e: React.MouseEvent<HTMLButtonElement>) => {
    e.preventDefault();
  };

  // Load content search index based on active tab
  useEffect(() => {
    const loadIndex = async () => {
      try {
        const res = await fetch(`/api/docs-search?locale=${activeTab}${indexVersion > 0 ? '&force=true' : ''}`);
        if (!res.ok) return;
        const data = await res.json();
        // MiniSearch.loadJSON expects a JSON string, but if data.indexJson is already an object, 
        // we need to stringify it first or use the correct loading method.
        const ms = MiniSearch.loadJSON(JSON.stringify(data.indexJson), {
          fields: ["title", "description", "content", "headings", "slugPath"],
          storeFields: ["title", "description", "url"],
          searchOptions: { prefix: true, fuzzy: 0.2 },
        });
        setContentMiniSearch(ms);
      } catch (error) {
        console.error("Failed to load search index:", error);
      }
    };
    loadIndex();
  }, [activeTab, indexVersion]);

  const searchResults = useMemo(() => {
    if (!searchQuery.trim()) return [];

    const resultsMap = new Map();

    // 1. Search in content first if index is available
    if (contentMiniSearch) {
      const results = contentMiniSearch.search(searchQuery);
      results.forEach(r => {
        resultsMap.set(r.id, {
          id: r.id,
          mainSlug: r.url.replace(/^\/[a-z]{2}\/docs\//, ""),
          title: r.title,
          score: r.score * 1.5 // Give weight to content matches
        });
      });
    }

    // 2. Search in slug/id (Fallback & Combined)
    const ms = new MiniSearch({
      fields: ['id', 'slugs'],
      storeFields: ['id', 'mainSlug'],
      searchOptions: { prefix: true, fuzzy: 0.2 }
    });

    const searchData = docs.map(doc => ({
      id: doc.id,
      mainSlug: doc.locales.id || doc.id,
      slugs: Object.values(doc.locales).join(" ")
    }));

    ms.addAll(searchData);
    const slugResults = ms.search(searchQuery);

    slugResults.forEach(r => {
      if (!resultsMap.has(r.id)) {
        resultsMap.set(r.id, {
          id: r.id,
          mainSlug: r.mainSlug,
          title: r.mainSlug.split('/').pop(),
          score: r.score
        });
      } else {
        // If already found in content, boost the score
        const existing = resultsMap.get(r.id);
        existing.score += r.score;
      }
    });

    return Array.from(resultsMap.values()).sort((a, b) => b.score - a.score);
  }, [docs, searchQuery, contentMiniSearch]);

  const showToast = (message: string, type: "success" | "error" | "info" = "success") => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper untuk membangun Tree Structure dari localized docs
  const buildTree = (docsList: any[]) => {
    const root: any = { children: {} };
    docsList.forEach(doc => {
      // Gunakan slug bahasa Indonesia sebagai path tree utama
      const mainSlug = doc.locales.id || doc.id;
      const parts = mainSlug.split("/");
      let current = root;
      parts.forEach((part: string, index: number) => {
        if (!current.children[part]) {
          current.children[part] = {
            name: part,
            fullId: doc.id,
            fullSlug: parts.slice(0, index + 1).join("/"),
            isDoc: index === parts.length - 1,
            children: {}
          };
        }
        current = current.children[part];
      });
    });
    return root.children;
  };

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (isAuthenticated) {
      fetchDocs();
    }
  }, [isAuthenticated]);

  const checkAuth = async () => {
    const res = await fetch("/api/admin/auth");
    const data = await res.json();
    setIsAuthenticated(data.authenticated);
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await fetch("/api/admin/auth", {
      method: "POST",
      body: JSON.stringify({ password }),
    });
    if (res.ok) {
      setIsAuthenticated(true);
      showToast("Login berhasil!", "success");
    } else {
      showToast("Password salah!", "error");
    }
  };

  const fetchDocs = async () => {
    const res = await fetch("/api/admin/docs");
    const data = await res.json();
    setDocs(data.docs || []);
  };

  const loadDoc = async (id: string) => {
    setIsLoading(true);
    const res = await fetch(`/api/admin/docs?canonicalId=${id}`);
    const data = await res.json();
    setContents(data.contents);
    setSelectedId(id);
    setIsLoading(false);
  };

  const handleSave = async () => {
    if (!selectedId) return;
    setIsSaving(true);
    const res = await fetch("/api/admin/docs", {
      method: "POST",
      body: JSON.stringify({ id: selectedId, contents }),
    });
    if (res.ok) {
      showToast("Berhasil disimpan!", "success");
      fetchDocs();
      setIndexVersion(v => v + 1); // Force reload search index
    } else {
      showToast("Gagal menyimpan.", "error");
    }
    setIsSaving(false);
  };

  const handleDelete = async (id: string, isFolder: boolean, path?: string) => {
    const url = isFolder
      ? `/api/admin/docs?isFolder=true&path=${encodeURIComponent(path || "")}`
      : `/api/admin/docs?id=${encodeURIComponent(id)}`;

    try {
      const res = await fetch(url, { method: "DELETE" });
      if (res.ok) {
        showToast("Berhasil dihapus!", "success");
        if (selectedId === id) setSelectedId(null);
        fetchDocs();
        setIndexVersion(v => v + 1);
        setDeleteModal(null);
      } else {
        showToast("Gagal menghapus.", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan saat menghapus.", "error");
    }
  };

  const handleCreate = async (customSlug?: string) => {
    const slugToCreate = customSlug || newSlug;
    if (!slugToCreate) {
      showToast("Silakan masukkan nama slug terlebih dahulu", "info");
      return;
    }

    const canonicalId = slugToCreate.replace(/\//g, "-");

    if (docs.some(d => d.id === canonicalId)) {
      showToast("Dokumen sudah ada!", "error");
      setSelectedId(canonicalId);
      loadDoc(canonicalId);
      return;
    }

    setIsCreating(true);
    const title = slugToCreate.split("/").pop() || "New Doc";
    const template = `---
title: ${title.charAt(0).toUpperCase() + title.slice(1)}
description: Description for ${title}
---

# ${title.charAt(0).toUpperCase() + title.slice(1)}

Start writing here...`;

    const newContents: any = {};
    ["id", "en", "es", "zh", "ar"].forEach(lang => {
      newContents[lang] = { slug: slugToCreate, content: template };
    });

    try {
      const res = await fetch("/api/admin/docs", {
        method: "POST",
        body: JSON.stringify({ id: canonicalId, contents: newContents }),
      });

      if (res.ok) {
        showToast("Dokumen baru berhasil dibuat!", "success");
        await fetchDocs();
        setContents(newContents);
        setSelectedId(canonicalId);
        setNewSlug("");
        setIndexVersion(v => v + 1);
      } else {
        showToast("Gagal membuat dokumen baru.", "error");
      }
    } catch (error) {
      showToast("Terjadi kesalahan saat membuat dokumen.", "error");
    } finally {
      setIsCreating(false);
    }
  };

  // Komponen Rekursif untuk merender Tree View
  const TreeItem = ({ node, level = 0 }: { node: any, level?: number }) => {
    const [isOpen, setIsOpen] = useState(true);
    const hasChildren = Object.keys(node.children).length > 0;

    return (
      <div className="select-none">
        <div
          className={`flex items-center justify-between group px-2 py-1.5 rounded-md cursor-pointer transition-colors ${selectedId === node.fullId ? 'bg-amber-600/20 text-amber-500 border border-amber-600/50' : 'hover:bg-zinc-800 text-zinc-400'}`}
          style={{ paddingLeft: `${level * 12 + 8}px` }}
        >
          <div className="flex items-center flex-1 min-w-0 overflow-hidden" onClick={() => node.isDoc ? loadDoc(node.fullId) : setIsOpen(!isOpen)}>
            <span className="mr-2 text-xs flex-shrink-0">
              {hasChildren ? (isOpen ? '▼' : '▶') : '📄'}
            </span>
            <span className="truncate text-sm">{node.name}</span>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
            {!node.isDoc && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setModal({ isOpen: true, parentSlug: node.fullSlug, value: "" });
                }}
                className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 hover:bg-amber-600 text-white text-xs transition-colors border border-zinc-700"
                title="Tambah Sub-slug"
              >
                +
              </button>
            )}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setDeleteModal({ isOpen: true, id: node.fullId, isFolder: !node.isDoc, path: node.fullSlug });
              }}
              className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 hover:bg-red-600 text-white text-[10px] transition-colors border border-zinc-700"
              title={node.isDoc ? "Hapus Dokumen" : "Hapus Folder"}
            >
              🗑️
            </button>
          </div>
        </div>

        {isOpen && hasChildren && (
          <div className="mt-1">
            {Object.values(node.children).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((child: any) => (
              <TreeItem key={child.fullSlug} node={child} level={level + 1} />
            ))}
          </div>
        )}
      </div>
    );
  };

  if (isAuthenticated === null) return <div className="p-8 text-center">Loading...</div>;

  if (!isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-100">
        <form onSubmit={handleLogin} className="w-full max-w-sm rounded-xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
          <h1 className="mb-6 text-2xl font-bold">Admin Bagdja Docs</h1>
          <input
            type="password"
            placeholder="Admin Password"
            className="mb-4 w-full rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 focus:border-amber-500 focus:outline-none"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />
          <button type="submit" className="w-full rounded-lg bg-amber-600 py-2 font-semibold hover:bg-amber-700">
            Login
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-zinc-950 text-zinc-100 overflow-hidden relative">
      {/* Modal for Deletion Confirmation */}
      {deleteModal && deleteModal.isOpen && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center p-4 bg-zinc-950/80 backdrop-blur-md transition-all duration-300">
          <div
            className="w-full max-w-sm bg-zinc-900 border border-zinc-800 rounded-[2.5rem] p-8 shadow-2xl text-center transform scale-100 animate-in zoom-in-95 duration-200"
            onClick={e => e.stopPropagation()}
          >
            <div className="w-20 h-20 bg-red-500/10 text-red-500 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]">
              <span className="text-4xl">🗑️</span>
            </div>

            <h2 className="text-2xl font-black mb-3 text-zinc-100">Are you sure?</h2>
            <p className="text-zinc-400 text-sm leading-relaxed mb-8">
              {deleteModal.isFolder ? (
                <>You are about to delete the entire folder <span className="text-red-400 font-mono font-bold">"{deleteModal.path}"</span> and all its localized documents. This action cannot be undone.</>
              ) : (
                <>You are about to delete the document <span className="text-red-400 font-mono font-bold">"{deleteModal.id}"</span> across all languages. This action cannot be undone.</>
              )}
            </p>

            <div className="flex flex-col gap-3">
              <button
                onClick={() => handleDelete(deleteModal.id, deleteModal.isFolder, deleteModal.path)}
                className="w-full py-4 rounded-2xl bg-red-600 hover:bg-red-700 text-white font-black transition-all shadow-lg shadow-red-600/20 active:scale-[0.98]"
              >
                Yes, Delete Everything
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="w-full py-4 rounded-2xl bg-zinc-800 hover:bg-zinc-700 text-zinc-300 font-bold transition-all active:scale-[0.98]"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Sub-slug */}
      {modal && modal.isOpen && (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-zinc-950/60 backdrop-blur-sm transition-opacity duration-300">
          <div
            className="w-full max-w-md bg-zinc-900 border border-zinc-800 rounded-3xl p-8 shadow-2xl transform scale-100 transition-transform duration-300 animate-in fade-in zoom-in-95"
            onClick={e => e.stopPropagation()}
          >
            <h2 className="text-2xl font-bold mb-2">Create Sub-slug</h2>
            <p className="text-zinc-500 text-sm mb-6">
              Adding new document inside <span className="font-mono text-amber-500">"{modal.parentSlug}"</span>
            </p>

            <div className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1.5 block">Sub-slug Name</label>
                <input
                  autoFocus
                  placeholder="e.g. features, api-ref"
                  className="w-full bg-zinc-950 border border-zinc-800 rounded-xl px-4 py-3 focus:border-amber-500/50 focus:outline-none transition-all"
                  value={modal.value}
                  onChange={e => setModal({ ...modal, value: e.target.value })}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      handleCreate(`${modal.parentSlug}/${modal.value}`);
                      setModal(null);
                    }
                    if (e.key === 'Escape') setModal(null);
                  }}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setModal(null)}
                  className="flex-1 px-4 py-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 font-bold transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    handleCreate(`${modal.parentSlug}/${modal.value}`);
                    setModal(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold transition-colors shadow-lg shadow-amber-600/20"
                >
                  Create Doc
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-6 right-6 z-50 flex items-center gap-3 px-6 py-4 rounded-2xl border shadow-2xl transition-all duration-500 transform translate-y-0 opacity-100 ${toast.type === "success" ? "bg-emerald-600 border-emerald-500 text-white" :
          toast.type === "error" ? "bg-red-600 border-red-500 text-white" :
            "bg-amber-600 border-amber-500 text-white"
          }`}>
          <div className={`w-2 h-2 rounded-full bg-white shadow-[0_0_8px_rgba(255,255,255,0.8)]`} />
          <span className="font-bold">{toast.message}</span>
        </div>
      )}

      {/* Sidebar */}
      <div className="w-64 flex-shrink-0 border-r border-zinc-800 bg-zinc-900 flex flex-col">
        <div className="p-4 border-b border-zinc-800">
          <h2 className="text-xl font-bold text-amber-500">Bagdja Docs Admin</h2>
        </div>
        <div className="p-4">
          {/* Search Input */}
          <div className="relative">
            <input
              placeholder={translations[activeTab as Locale]?.searchDocs || "Search documents..."}
              className="w-full text-xs rounded-lg border border-zinc-700 bg-zinc-800 px-3 py-2 text-zinc-200 focus:border-amber-500/50 outline-none placeholder:text-zinc-500 transition-all"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-zinc-300 text-[10px]"
              >
                ✕
              </button>
            )}
          </div>
        </div>

        <div className="flex-1 overflow-y-auto p-2 space-y-1">
          {searchQuery.trim() ? (
            <div className="space-y-1">
              <div className="px-2 py-1 text-[10px] font-bold text-zinc-500 uppercase tracking-widest">
                {translations[activeTab as Locale]?.searchResults || "Search Results"}
              </div>
              {searchResults.length > 0 ? (
                searchResults.map((result: any) => (
                  <div
                    key={result.id}
                    onClick={() => {
                      loadDoc(result.id);
                      setSearchQuery("");
                    }}
                    className={`flex items-center gap-2 px-2 py-1.5 rounded-md cursor-pointer transition-colors ${selectedId === result.id ? 'bg-amber-600/20 text-amber-500 border border-amber-600/50' : 'hover:bg-zinc-800 text-zinc-400'}`}
                  >
                    <span className="text-[10px] opacity-70">📄</span>
                    <div className="flex flex-col min-w-0">
                      <span className="truncate text-sm font-medium">{result.title}</span>
                      <span className="truncate text-[10px] opacity-50">{result.mainSlug}</span>
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-2 py-4 text-center text-xs text-zinc-600 italic">
                  {translations[activeTab as Locale]?.noResults || "No results found"}
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-1">
              {/* Root Node */}
              <div className="flex items-center justify-between group px-2 py-1.5 rounded-md hover:bg-zinc-800 text-zinc-500 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="text-[10px]">▼</span>
                  <span className="text-[10px] font-bold uppercase tracking-widest">
                    {translations[activeTab as Locale]?.documentation || "Docs"}
                  </span>
                </div>
                <button
                  onClick={() => setModal({ isOpen: true, parentSlug: "", value: "" })}
                  className="flex items-center justify-center w-5 h-5 rounded bg-zinc-800 hover:bg-amber-600 text-white text-xs transition-colors border border-zinc-700"
                  title="Tambah Dokumen di Root"
                >
                  +
                </button>
              </div>
              <div className="mt-1">
                {Object.values(buildTree(docs)).sort((a: any, b: any) => a.name.localeCompare(b.name)).map((node: any) => (
                  <TreeItem key={node.fullSlug} node={node} level={1} />
                ))}
              </div>
            </div>
          )}
        </div>
        <button
          onClick={async () => { await fetch("/api/admin/auth", { method: "DELETE" }); window.location.reload(); }}
          className="p-4 text-xs text-zinc-500 hover:text-red-400 border-t border-zinc-800"
        >
          Logout
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {!selectedId ? (
          <div className="flex-1 flex items-center justify-center text-zinc-500">
            Pilih dokumen untuk diedit atau buat baru.
          </div>
        ) : (
          <>
            {/* Header */}
            <div className="p-4 border-b border-zinc-800 bg-zinc-900 flex justify-between items-center">
              <div className="flex items-center gap-6">
                <div>
                  <span className="text-xs text-zinc-500">Canonical ID:</span>
                  <h3 className="text-lg font-mono text-amber-500">{selectedId}</h3>
                </div>

                <div className="flex bg-zinc-800 p-1 rounded-xl border border-zinc-700">
                  <button
                    onClick={() => setViewMode("edit")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'edit' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Editor
                  </button>
                  <button
                    onClick={() => setViewMode("preview")}
                    className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${viewMode === 'preview' ? 'bg-amber-600 text-white shadow-lg' : 'text-zinc-400 hover:text-zinc-200'}`}
                  >
                    Preview
                  </button>
                </div>
              </div>
              <button
                onClick={handleSave}
                disabled={isSaving}
                className="bg-amber-600 hover:bg-amber-700 px-6 py-2 rounded-lg font-bold disabled:opacity-50"
              >
                {isSaving ? "Saving..." : "Save All Languages"}
              </button>
            </div>

            {/* Language Tabs */}
            <div className="flex border-b border-zinc-800 bg-zinc-900/50 overflow-x-auto">
              {LANGUAGES.map(lang => (
                <button
                  key={lang.code}
                  onClick={() => setActiveTab(lang.code)}
                  className={`px-6 py-3 text-sm font-medium transition-colors border-b-2 whitespace-nowrap ${activeTab === lang.code ? 'border-amber-500 text-amber-500 bg-amber-500/5' : 'border-transparent text-zinc-500 hover:text-zinc-300'}`}
                >
                  {lang.label}
                </button>
              ))}
            </div>

            {/* Localized Slug Input */}
            <div className="px-6 py-3 bg-zinc-900/30 border-b border-zinc-800 flex items-center gap-4">
              <label className="text-xs font-bold text-zinc-500 uppercase">Slug ({activeTab}):</label>
              <input
                className="flex-1 bg-zinc-950 border border-zinc-800 rounded px-3 py-1 text-sm font-mono text-amber-200/70"
                value={contents[activeTab]?.slug || ""}
                onChange={(e) => {
                  const newContents = { ...contents };
                  newContents[activeTab] = { ...newContents[activeTab], slug: e.target.value };
                  setContents(newContents);
                }}
              />
            </div>

            {/* Editor Area */}
            <div className="p-0 bg-zinc-950 relative overflow-y-hidden" style={{ height: viewMode === 'edit' ? 'calc(100% - 280px)' : '100%'}}>
              {isLoading && (
                <div className="absolute inset-0 bg-zinc-950/50 backdrop-blur-sm flex items-center justify-center z-10">
                  Loading content...
                </div>
              )}

              {viewMode === "edit" ? (
                <>
                  <textarea
                    ref={rawEditorRef}
                    dir={activeTab === "ar" ? "rtl" : "ltr"}
                    className="bagdja-scrollbar mx-2 mt-3 w-[calc(100%-1rem)] border border-zinc-800 rounded-2xl h-[calc(100%-15px)] bg-zinc-900 pb-36 px-5 font-mono text-sm leading-relaxed focus:border-amber-500/50 focus:outline-none resize-none shadow-inner"
                    value={contents[activeTab]?.content || ""}
                    onChange={(e) => setActiveContent(e.target.value)}
                    placeholder={`Write MDX content in ${activeTab.toUpperCase()} here...`}
                  />

                  {/* Floating icon toolbox (Raw mode) */}
                  <div className="fixed bottom-4 left-[280px] right-6 z-50 pointer-events-none">
                    <div className="pointer-events-auto mx-auto max-w-[1320px]">
                      <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-zinc-800 bg-zinc-900/85 backdrop-blur-md p-2 shadow-2xl">
                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Headings
                          </span>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("# ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Heading 1"
                          >
                            H1
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("## ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Heading 2"
                          >
                            H2
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("### ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Heading 3"
                          >
                            H3
                          </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Inline
                          </span>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyWrap("**", "**", "bold")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Bold"
                          >
                            B
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyWrap("*", "*", "italic")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors italic"
                            title="Italic"
                          >
                            I
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyWrap("`", "`", "code")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Inline code"
                          >
                            {"</>"}
                          </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Blocks
                          </span>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("> ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Quote"
                          >
                            ❝
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("- ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-sm font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Bulleted list"
                          >
                            •
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyPrefixLines("1. ")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Numbered list"
                          >
                            1.
                          </button>
                        </div>

                        <div className="flex items-center gap-2 rounded-xl border border-zinc-800 bg-zinc-950/40 px-2 py-1">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Insert
                          </span>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => applyWrap("[", "](https://)", "link text")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Link"
                          >
                            🔗
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => insertSnippet("\n```ts\n\n```\n", 4)}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Code block"
                          >
                            ⧉
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() =>
                              insertSnippet(
                                "\n| Col 1 | Col 2 |\n| --- | --- |\n|  |  |\n",
                                6,
                              )
                            }
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Table"
                          >
                            ⌗
                          </button>
                          <button
                            type="button"
                            onMouseDown={keepRawEditorFocus}
                            onClick={() => insertSnippet("\n---\n")}
                            className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-zinc-800 bg-zinc-900 text-xs font-black text-zinc-200 hover:border-amber-500/50 hover:text-amber-400 transition-colors"
                            title="Horizontal rule"
                          >
                            —
                          </button>
                        </div>

                        <div className="ml-auto flex items-center gap-2 px-2">
                          <span className="text-[10px] font-black uppercase tracking-widest text-zinc-500">
                            Raw toolbox
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              ) : viewMode === "visual" ? (
                <ForwardRefMDXEditor
                  key={`${selectedId ?? "none"}:${activeTab}`}
                  ref={mdxEditorRef}
                  markdown={contents[activeTab]?.content || ""}
                  onChange={(next) => setActiveContent(next)}
                  className="dark-theme bagdja-mdxeditor"
                />
              ) : (
                <div className="w-full h-full overflow-hidden">
                  <PublicDocsPreview
                    slug={contents[activeTab]?.slug || ""}
                    locale={activeTab}
                  />
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
