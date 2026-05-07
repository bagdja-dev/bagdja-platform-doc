import fs from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import matter from "gray-matter";
import { locales } from "@/lib/i18n";

const DOCS_DIR = path.join(process.cwd(), "docs");

// Helper untuk mendapatkan file path berdasarkan slug dan locale
function getFilePath(slug: string[], locale?: string) {
  const relPath = slug.join(path.sep);
  const ext = ".mdx";
  if (locale && locale !== "id") {
    return path.join(DOCS_DIR, `${relPath}.${locale}${ext}`);
  }
  return path.join(DOCS_DIR, `${relPath}${ext}`);
}

// GET: List docs or read specific doc
export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const slugStr = searchParams.get("slug");
  const canonicalId = searchParams.get("canonicalId");
  
  if (!slugStr && !canonicalId) {
    // Return list of all docs with their localized slugs and canonical IDs
    try {
      try { await fs.access(DOCS_DIR); } catch { await fs.mkdir(DOCS_DIR, { recursive: true }); }

      const allFiles: string[] = [];
      async function walk(dir: string) {
        if (dir.includes('node_modules') || dir.includes('.next')) return;
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) await walk(res);
          else if (entry.name.endsWith(".mdx")) allFiles.push(res);
        }
      }
      await walk(DOCS_DIR);
      
      const mapping: Record<string, any> = {};
      
      for (const file of allFiles) {
        const raw = await fs.readFile(file, "utf8");
        const parsed = matter(raw);
        const rel = path.relative(DOCS_DIR, file);
        
        // Split slug and locale
        const segments = rel.replace(/\.mdx$/, "").split(".");
        const fileLocale = segments.length > 1 ? segments.pop() : "id";
        const fileSlug = segments.join(".");
        
        const id = parsed.data.id || fileSlug;
        
        if (!mapping[id]) mapping[id] = { id, locales: {} };
        mapping[id].locales[fileLocale!] = fileSlug;
      }
      
      return NextResponse.json({ docs: Object.values(mapping) });
    } catch (error) {
      return NextResponse.json({ error: "Failed to list docs" }, { status: 500 });
    }
  }

  // Jika ada canonicalId, cari semua file yang memiliki ID tersebut
  let targetMapping: any = null;
  if (canonicalId) {
    const allDocsRes = await (await GET(new Request(request.url.split('?')[0]))).json();
    targetMapping = allDocsRes.docs.find((d: any) => d.id === canonicalId);
  }

  const contents: Record<string, { slug: string, content: string }> = {};
  const langs = ["id", "en", "es", "zh", "ar"];

  for (const lang of langs) {
    let slugToRead = slugStr;
    if (targetMapping && targetMapping.locales[lang]) {
      slugToRead = targetMapping.locales[lang];
    }

    if (slugToRead) {
      const filePath = getFilePath(slugToRead.split("/"), lang === "id" ? undefined : lang);
      try {
        const content = await fs.readFile(filePath, "utf8");
        contents[lang] = { slug: slugToRead, content };
      } catch {
        contents[lang] = { slug: slugToRead, content: "" };
      }
    } else {
      contents[lang] = { slug: "", content: "" };
    }
  }

  return NextResponse.json({ id: canonicalId || slugStr, contents });
}

// POST: Save doc contents with localized slugs
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { id: canonicalId, contents } = body; // contents: { id: { slug, content }, en: { slug, content } }

    for (const [lang, data] of Object.entries(contents) as any) {
      const { slug: slugStr, content } = data;
      if (!slugStr) continue;

      const slug = slugStr.split("/");
      const filePath = getFilePath(slug, lang === "id" ? undefined : lang);
      
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      
      // Sisipkan/Update ID di frontmatter
      const parsed = matter(content);
      parsed.data.id = canonicalId;
      const newContent = matter.stringify(parsed.content, parsed.data);

      await fs.writeFile(filePath, newContent, "utf8");
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: "Failed to save document" }, { status: 500 });
  }
}

// DELETE: Remove all files associated with a canonical ID or folder
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    const isFolder = searchParams.get("isFolder") === "true";
    const folderPath = searchParams.get("path");

    if (isFolder && folderPath) {
      // Hapus seluruh folder di dalam docs/
      const fullPath = path.join(DOCS_DIR, folderPath);
      await fs.rm(fullPath, { recursive: true, force: true });
      return NextResponse.json({ success: true });
    }

    if (id) {
      // Cari semua file yang memiliki canonical ID tersebut
      const allFiles: string[] = [];
      async function walk(dir: string) {
        if (!await fs.stat(dir).then(s => s.isDirectory()).catch(() => false)) return;
        const entries = await fs.readdir(dir, { withFileTypes: true });
        for (const entry of entries) {
          const res = path.resolve(dir, entry.name);
          if (entry.isDirectory()) await walk(res);
          else if (entry.name.endsWith(".mdx") || entry.name.endsWith(".md")) {
            const raw = await fs.readFile(res, "utf8");
            const parsed = matter(raw);
            const segments = path.relative(DOCS_DIR, res).replace(/\.(mdx|md)$/, "").split(".");
            const fileSlug = (segments.length > 1 && locales.includes(segments[segments.length - 1] as any)) 
              ? segments.slice(0, -1).join(".") 
              : segments.join(".");
            
            const docId = parsed.data.id || fileSlug;
            if (docId === id) allFiles.push(res);
          }
        }
      }
      await walk(DOCS_DIR);

      for (const file of allFiles) {
        await fs.unlink(file);
      }
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: "Missing ID or Path" }, { status: 400 });
  } catch (error) {
    console.error("Delete error:", error);
    return NextResponse.json({ error: "Failed to delete" }, { status: 500 });
  }
}
