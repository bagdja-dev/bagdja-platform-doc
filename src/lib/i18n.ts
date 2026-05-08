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

export const translations: Record<Locale, { search: string; searchDocs: string; searchResults: string; noResults: string; documentation: string; noDocsTitle: string; noDocsDesc: string }> = {
  en: { 
    search: "Search...", 
    searchDocs: "Search documents...", 
    searchResults: "Search Results", 
    noResults: "No results found", 
    documentation: "Documentation",
    noDocsTitle: "Documentation not available",
    noDocsDesc: "Add .md/.mdx files to the docs/ folder to start writing documentation."
  },
  id: { 
    search: "Cari...", 
    searchDocs: "Cari dokumen...", 
    searchResults: "Hasil Pencarian", 
    noResults: "Tidak ada hasil", 
    documentation: "Dokumentasi",
    noDocsTitle: "Dokumentasi belum tersedia",
    noDocsDesc: "Tambahkan file .md/.mdx ke folder docs/ untuk mulai menulis dokumentasi."
  },
  zh: { 
    search: "搜索...", 
    searchDocs: "搜索文档...", 
    searchResults: "搜索结果", 
    noResults: "未找到结果", 
    documentation: "文档",
    noDocsTitle: "文档不可用",
    noDocsDesc: "将 .md/.mdx 文件添加到 docs/ 文件夹以开始编写文档。"
  },
  es: { 
    search: "Buscar...", 
    searchDocs: "Buscar documentos...", 
    searchResults: "Resultados de búsqueda", 
    noResults: "No se encontraron resultados", 
    documentation: "Documentación",
    noDocsTitle: "Documentación no tersedia",
    noDocsDesc: "Agregue archivos .md/.mdx a la carpeta docs/ untuk mulai menulis dokumentasi."
  },
  ar: { 
    search: "بحث...", 
    searchDocs: "البحث في المستندات...", 
    searchResults: "نتائج البحث", 
    noResults: "لم يتم العثور على نتائج", 
    documentation: "توثiq",
    noDocsTitle: "التوثيق غير متوفر",
    noDocsDesc: "أضف ملفات .md/.mdx إلى مجلد docs/ لبدء كتابة التوثيق."
  },
};
