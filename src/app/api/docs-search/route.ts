import MiniSearch from "minisearch";
import { type NextRequest } from "next/server";
import { getSearchDocuments } from "@/lib/docs";
import { defaultLocale, type Locale } from "@/lib/i18n";

export const runtime = "nodejs";

const cached: Record<string, { json: unknown; generatedAt: number }> = {};

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const locale = (searchParams.get("locale") as Locale) || defaultLocale;
  const force = searchParams.get("force") === "true";

  if (cached[locale] && !force) {
    return Response.json(cached[locale].json, {
      headers: { "cache-control": "public, max-age=3600" },
    });
  }

  const docs = await getSearchDocuments(locale);
  const processedDocs = docs.map((d) => ({
    id: d.id,
    title: d.title,
    description: d.description ?? "",
    url: `/${locale}${d.url}`,
    headings: d.headings.join(" "),
    content: d.content,
    slugPath: d.slug.join("/"),
  }));

  const miniSearch = new MiniSearch({
    idField: "id",
    fields: ["title", "description", "content", "headings", "slugPath"],
    storeFields: ["title", "description", "url"],
    searchOptions: { prefix: true, fuzzy: 0.2 },
  });

  // Extra safety: ensure ids are unique to avoid runtime errors.
  const uniqueDocs = Array.from(
    new Map(processedDocs.map((d) => [d.id, d])).values(),
  );
  miniSearch.addAll(uniqueDocs);

  const json = { indexJson: miniSearch.toJSON() };
  cached[locale] = { json, generatedAt: Date.now() };

  return Response.json(json, {
    headers: { "cache-control": "public, max-age=3600" },
  });
}
