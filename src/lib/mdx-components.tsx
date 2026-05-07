import React from "react";

export function getMdxComponents() {
  return {
    h1: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h1 {...props} className="text-3xl font-bold leading-tight tracking-tight text-zinc-100" />
    ),
    h2: (props: React.HTMLAttributes<HTMLHeadingElement>) => (
      <h2 {...props} className="mt-8 text-xl font-bold leading-snug tracking-tight text-zinc-200 border-b border-zinc-800 pb-2" />
    ),
    p: (props: React.HTMLAttributes<HTMLParagraphElement>) => (
      <p {...props} className="mt-4 leading-7 text-zinc-400" />
    ),
    ul: (props: React.HTMLAttributes<HTMLUListElement>) => (
      <ul {...props} className="mt-4 list-disc pl-6 text-zinc-400 space-y-2" />
    ),
    ol: (props: React.HTMLAttributes<HTMLOListElement>) => (
      <ol {...props} className="mt-4 list-decimal pl-6 text-zinc-400 space-y-2" />
    ),
    li: (props: React.HTMLAttributes<HTMLLIElement>) => (
      <li {...props} className="mt-2" />
    ),
    a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
      <a {...props} className="font-bold text-amber-500 hover:text-amber-400 underline underline-offset-4 transition-colors" />
    ),
    pre: (props: React.HTMLAttributes<HTMLPreElement>) => (
      <pre {...props} className="mt-4 overflow-x-auto rounded-xl bg-zinc-900 border border-zinc-800 p-4 text-sm text-zinc-300 shadow-inner" />
    ),
    code: (props: React.HTMLAttributes<HTMLElement>) => (
      <code {...props} className="rounded bg-zinc-800 px-1.5 py-0.5 text-xs font-mono text-amber-500/90 border border-zinc-700" />
    ),
    hr: (props: React.HTMLAttributes<HTMLHRElement>) => (
      <hr {...props} className="my-8 border-zinc-800" />
    ),
  };
}
