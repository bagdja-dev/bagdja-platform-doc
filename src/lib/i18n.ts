export const locales = ["en", "id", "zh", "es", "ar"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";

export function isLocale(value: string): value is Locale {
  return (locales as readonly string[]).includes(value);
}

export const localeLabels: Record<Locale, string> = {
  en: "English",
  id: "Bahasa Indonesia",
  zh: "Chinese",
  es: "Spanish",
  ar: "Arabic",
};

export const translations: Record<Locale, { search: string; searchDocs: string; searchResults: string; noResults: string; documentation: string }> = {
  en: { search: "Search...", searchDocs: "Search documents...", searchResults: "Search Results", noResults: "No results found", documentation: "Documentation" },
  id: { search: "Cari...", searchDocs: "Cari dokumen...", searchResults: "Hasil Pencarian", noResults: "Tidak ada hasil", documentation: "Dokumentasi" },
  zh: { search: "搜索...", searchDocs: "搜索文档...", searchResults: "搜索结果", noResults: "未找到结果", documentation: "文档" },
  es: { search: "Buscar...", searchDocs: "Buscar documentos...", searchResults: "Resultados de búsqueda", noResults: "No se encontraron resultados", documentation: "Documentación" },
  ar: { search: "بحث...", searchDocs: "البحث في المستندات...", searchResults: "نتائج البحث", noResults: "لم يتم العثور على نتائج", documentation: "توثيق" },
};
