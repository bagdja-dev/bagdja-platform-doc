import fs from "node:fs/promises";
import path from "node:path";
import matter from "gray-matter";
import { defaultLocale, locales, type Locale } from "./i18n";

export type DocsPage = {
  type: "page";
  slug: string[];
  canonicalId: string; // ID unik penghubung antar bahasa
  title: string;
  description?: string;
  order: number;
};

export type DocsFolder = {
  type: "folder";
  name: string;
  order: number;
  children: Array<DocsFolder | DocsPage>;
};

export type DocsNode = DocsFolder | DocsPage;

export type SearchDocument = {
  id: string;
  slug: string[];
  url: string;
  title: string;
  description?: string;
  headings: string[];
  content: string;
};

const DOCS_DIR = path.join(process.cwd(), "docs");
const DOC_EXTENSIONS = [".mdx", ".md"] as const;

function isDocFile(fileName: string) {
  return DOC_EXTENSIONS.some((ext) => fileName.toLowerCase().endsWith(ext));
}

function stripDocExtension(fileName: string) {
  let name = fileName;
  for (const ext of DOC_EXTENSIONS) {
    if (name.toLowerCase().endsWith(ext)) {
      name = name.slice(0, -ext.length);
      break;
    }
  }
  return name;
}

function splitSlugAndLocale(fileName: string) {
  const name = stripDocExtension(fileName);
  const parts = name.split(".");
  
  if (parts.length > 1) {
    const possibleLocale = parts[parts.length - 1].toLowerCase();
    if (locales.includes(possibleLocale as any)) {
      return {
        slugName: parts.slice(0, -1).join("."),
        locale: possibleLocale,
        explicitLocale: true,
      };
    }
  }
  
  return { slugName: name, locale: "id", explicitLocale: false };
}

function removeExtension(fileName: string) {
  const { slugName } = splitSlugAndLocale(fileName);
  return slugName;
}

async function walk(dir: string): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const result: string[] = [];

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      result.push(...(await walk(fullPath)));
      continue;
    }
    if (entry.isFile() && isDocFile(entry.name)) {
      result.push(fullPath);
    }
  }

  return result;
}

function byOrderThenName<T extends { order: number }>(
  getName: (item: T) => string,
) {
  return (a: T, b: T) => {
    if (a.order !== b.order) return a.order - b.order;
    return getName(a).localeCompare(getName(b));
  };
}

export async function getAllDocsSlugs(): Promise<string[][]> {
  let files: string[] = [];
  try {
    files = await walk(DOCS_DIR);
  } catch {
    return [];
  }

  const slugSet = new Set<string>();
  const slugs: string[][] = [];

  for (const filePath of files) {
    const rel = path.relative(DOCS_DIR, filePath);
    const withoutExt = removeExtension(rel);
    const slugParts = withoutExt.split(path.sep).filter(Boolean);
    const slugKey = slugParts.join("/");

    if (!slugSet.has(slugKey)) {
      slugSet.add(slugKey);
      slugs.push(slugParts);
    }
  }

  return slugs.sort((a, b) => a.join("/").localeCompare(b.join("/")));
}

export async function getDocSourceBySlug(slug: string[], locale?: string) {
  const relPath = slug.join(path.sep);

  // Jika kita mencari di locale spesifik, kita harus mendukung localized slugs
  if (locale) {
    let files: string[] = [];
    try {
      files = await walk(DOCS_DIR);
    } catch {
      return null;
    }

    for (const filePath of files) {
      const rel = path.relative(DOCS_DIR, filePath);
      const segments = rel.split(path.sep).filter(Boolean);
      const fileName = segments.pop();
      if (!fileName) continue;

      const { slugName, locale: fileLocale } = splitSlugAndLocale(fileName);
      const fileSlug = [...segments, slugName];
      
      // Jika slug cocok DAN locale cocok
      if (fileSlug.join("/") === slug.join("/") && fileLocale === locale) {
        try {
          const source = await fs.readFile(filePath, "utf8");
          return { source, filePath, isFallback: false };
        } catch {
          continue;
        }
      }
    }
  }

  // Fallback ke default logic jika tidak ditemukan localized slug
  // 1. Try default file (e.g., file.mdx)
  for (const ext of DOC_EXTENSIONS) {
    const candidate = path.join(DOCS_DIR, `${relPath}${ext}`);
    try {
      const source = await fs.readFile(candidate, "utf8");
      return {
        source,
        filePath: candidate,
        isFallback: locale ? locale !== defaultLocale : false,
      };
    } catch {
      continue;
    }
  }
  return null;
}

export async function getDocsTree(locale: string = defaultLocale): Promise<DocsFolder> {
  const root: DocsFolder = {
    type: "folder",
    name: "Docs",
    order: 0,
    children: [],
  };

  let files: string[] = [];
  try {
    files = await walk(DOCS_DIR);
  } catch {
    return root;
  }

  // 1. Kelompokkan semua file berdasarkan Canonical ID
  const docsMap = new Map<string, Map<string, string>>(); // canonicalId -> Map<locale, filePath>

  for (const filePath of files) {
    const raw = await fs.readFile(filePath, "utf8");
    const { data } = matter(raw);
    const rel = path.relative(DOCS_DIR, filePath);
    
    // Ambil locale dari nama file (misal: index.en.mdx -> en atau index.mdx -> id)
    const segments = rel.replace(/\.(mdx|md)$/, "").split(".");
    let fileLocale: Locale = "id"; // Default ke "id" sesuai logika Admin
    let fileSlug = segments[0];

    if (segments.length > 1) {
      const possibleLocale = segments[segments.length - 1];
      if (locales.includes(possibleLocale as any)) {
        fileLocale = possibleLocale as any;
        fileSlug = segments.slice(0, -1).join(".");
      } else {
        fileSlug = segments.join(".");
      }
    }
    
    const canonicalId = (typeof data.id === "string" ? data.id.trim() : null) || fileSlug;
    
    if (!docsMap.has(canonicalId)) {
      docsMap.set(canonicalId, new Map());
    }
    docsMap.get(canonicalId)!.set(fileLocale!, filePath);
  }

  const ensureFolder = (parent: DocsFolder, folderName: string) => {
    const existing = parent.children.find(
      (c): c is DocsFolder => c.type === "folder" && c.name === folderName,
    );
    if (existing) return existing;

    const created: DocsFolder = {
      type: "folder",
      name: folderName,
      order: 0,
      children: [],
    };
    parent.children.push(created);
    return created;
  };

  // 2. Bangun tree berdasarkan locale yang diminta
  for (const [canonicalId, localesMap] of docsMap.entries()) {
    // Pilih file yang paling sesuai: 1. Request Locale, 2. Default Locale, 3. Mana saja
    const filePath = localesMap.get(locale) ?? localesMap.get(defaultLocale) ?? localesMap.values().next().value;
    
    if (!filePath) continue;

    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    
    // Dapatkan slug dari path file tersebut
    const rel = path.relative(DOCS_DIR, filePath);
    const slugParts = removeExtension(rel).split(path.sep).filter(Boolean);
    const folderSegments = slugParts.slice(0, -1);

    const title =
      typeof parsed.data.sidebarTitle === "string" && parsed.data.sidebarTitle.trim()
        ? parsed.data.sidebarTitle.trim()
        : slugParts[slugParts.length - 1].replace(/[-_]/g, " ");

    const description =
      typeof parsed.data.description === "string" && parsed.data.description
        ? parsed.data.description
        : undefined;

    const order =
      typeof parsed.data.order === "number" && Number.isFinite(parsed.data.order)
        ? parsed.data.order
        : 999;

    let cursor = root;
    for (const folder of folderSegments) {
      cursor = ensureFolder(cursor, folder);
    }

    cursor.children.push({
      type: "page",
      slug: slugParts,
      canonicalId,
      title,
      description,
      order,
    });
  }

  const sortFolder = (folder: DocsFolder) => {
    folder.children.sort(
      byOrderThenName((node) => (node.type === "folder" ? node.name : node.title)),
    );
    for (const child of folder.children) {
      if (child.type === "folder") sortFolder(child);
    }
  };

  sortFolder(root);
  return root;
}

export function flattenDocsPages(node: DocsNode): DocsPage[] {
  if (node.type === "page") return [node];
  return node.children.flatMap(flattenDocsPages);
}

function extractHeadings(markdown: string) {
  const lines = markdown.split(/\r?\n/);
  const headings: string[] = [];
  for (const line of lines) {
    const match = line.match(/^\s{0,3}#{1,6}\s+(.+?)\s*$/);
    if (match?.[1]) headings.push(match[1]);
  }
  return headings;
}

function stripMarkdown(markdown: string) {
  return (
    markdown
      .replace(/^---[\s\S]*?---\s*/m, "") // Hapus frontmatter
      .replace(/```[\s\S]*?```/g, " ")      // Hapus code blocks
      .replace(/`[^`]*`/g, " ")             // Hapus inline code
      .replace(/<[^>]+>/g, " ")             // Hapus HTML tags
      .replace(/[#*`_~>]/g, " ")            // Hapus karakter markdown (bukan katanya)
      .replace(/\[([^\]]+)\]\([^)]+\)/g, "$1") // Ambil teks dari link: [text](url) -> text
      .replace(/!\[[^\]]*\]\([^)]+\)/g, " ") // Hapus gambar
      .replace(/\s+/g, " ")                 // Normalisasi spasi
      .trim()
  );
}

export async function getSearchDocuments(locale: string): Promise<SearchDocument[]> {
  let files: string[] = [];
  try {
    files = await walk(DOCS_DIR);
  } catch {
    return [];
  }

  // De-duplicate by slug so MiniSearch doesn't throw on duplicate IDs.
  // This mainly protects locale "id" when both `foo.mdx` and `foo.id.mdx` exist.
  const docsById = new Map<
    string,
    { doc: SearchDocument; explicitLocale: boolean; contentLength: number }
  >();
  for (const filePath of files) {
    const rel = path.relative(DOCS_DIR, filePath);
    const segments = rel.split(path.sep).filter(Boolean);
    const fileName = segments.pop();
    if (!fileName) continue;

    const { slugName, locale: fileLocale, explicitLocale } =
      splitSlugAndLocale(fileName);
    
    // Hanya proses file yang sesuai dengan locale yang diminta
    if (fileLocale !== locale) continue;

    const slug = [...segments, slugName];
    const raw = await fs.readFile(filePath, "utf8");
    const parsed = matter(raw);
    const title =
      typeof parsed.data.title === "string" && parsed.data.title.trim()
        ? parsed.data.title.trim()
        : slug[slug.length - 1].replace(/[-_]/g, " ");
    const description =
      typeof parsed.data.description === "string" && parsed.data.description
        ? parsed.data.description
        : undefined;

    const headings = extractHeadings(parsed.content);
    const content = stripMarkdown(parsed.content);
    const url = `/docs/${slug.join("/")}`;
    const id = slug.join("/");

    const doc: SearchDocument = {
      id,
      slug,
      url,
      title,
      description,
      headings,
      content,
    };

    const existing = docsById.get(id);
    if (!existing) {
      docsById.set(id, {
        doc,
        explicitLocale,
        contentLength: raw.length,
      });
      continue;
    }

    // Prefer implicit Indonesian docs (`foo.mdx`) over explicit (`foo.id.mdx`)
    // because the Admin API writes Indonesian docs to the non-suffixed file.
    const preferIncoming =
      locale === "id"
        ? existing.explicitLocale && !explicitLocale
        : !existing.explicitLocale && explicitLocale;

    if (preferIncoming || raw.length > existing.contentLength) {
      docsById.set(id, { doc, explicitLocale, contentLength: raw.length });
    }
  }

  const docs = Array.from(docsById.values())
    .map((v) => v.doc)
    .sort((a, b) => a.id.localeCompare(b.id));
  return docs;
}
