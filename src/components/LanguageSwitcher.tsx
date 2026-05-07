"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, usePathname, useRouter } from "next/navigation";
import { type Locale, localeLabels, locales } from "@/lib/i18n";

const localeFlags: Record<Locale, string> = {
  en: "🇺🇸",
  id: "🇮🇩",
  zh: "🇨🇳",
  es: "🇪🇸",
  ar: "🇸🇦",
};

export default function LanguageSwitcher({
  className = "",
}: {
  className?: string;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const params = useParams();
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const currentLocale = (params.locale as Locale) || "en";

  const handleLocaleChange = (newLocale: string) => {
    // Replace the current locale in the pathname with the new one
    // Pathname example: /en/docs/overview/introduction
    const segments = pathname.split("/");
    segments[1] = newLocale;
    const newPathname = segments.join("/");
    router.push(newPathname);
    setOpen(false);
  };

  useEffect(() => {
    const onClickOutside = (event: MouseEvent) => {
      if (!rootRef.current) return;
      if (!rootRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    };

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    window.addEventListener("mousedown", onClickOutside);
    window.addEventListener("keydown", onEscape);
    return () => {
      window.removeEventListener("mousedown", onClickOutside);
      window.removeEventListener("keydown", onEscape);
    };
  }, []);

  return (
    <div
      ref={rootRef}
      className={[
        "relative",
        className,
      ].join(" ")}
    >
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="inline-flex min-w-[170px] items-center justify-between gap-2 rounded-lg border border-zinc-700 bg-zinc-800 px-4 py-2 text-sm text-zinc-200 shadow-md transition-all hover:border-amber-500/50 hover:bg-zinc-750"
      >
        <span className="inline-flex items-center gap-2 truncate font-bold">
          <span>{localeFlags[currentLocale]}</span>
          <span>{localeLabels[currentLocale]}</span>
        </span>
        <span className={["text-[10px] transition-transform opacity-50", open ? "rotate-180" : ""].join(" ")}>
          ▼
        </span>
      </button>

      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-[calc(100%+8px)] z-50 w-full overflow-hidden rounded-lg border border-zinc-700 bg-zinc-800 shadow-2xl"
        >
          {locales.map((locale) => {
            const active = locale === currentLocale;
            return (
              <button
                key={locale}
                type="button"
                onClick={() => handleLocaleChange(locale)}
                className={[
                  "flex w-full items-center px-4 py-2.5 text-left text-sm transition-colors",
                  active
                    ? "bg-amber-600/20 font-bold text-amber-500"
                    : "text-zinc-400 hover:bg-zinc-700 hover:text-zinc-100",
                ].join(" ")}
              >
                <span className="mr-3">{localeFlags[locale]}</span>
                {localeLabels[locale]}
              </button>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}
