# Bagdja Platform Docs

A modern, multi-language documentation hub for the Bagdja Platform — powered by **Next.js (App Router)** and **MDX**.

It ships with a **public docs site**, **full-text search**, and an **admin console** for editing docs in both **Raw MDX** and **Visual (WYSIWYG)** modes.

## Features

- **Multi-language routing**: locale-first URLs like `/{locale}/docs/...` (`en`, `id`, `zh`, `es`, `ar`)
- **MDX rendering**: MDX compiled on the server with GitHub-flavored markdown support
- **Docs tree & ordering**: sidebar navigation built from the `docs/` folder + frontmatter ordering
- **Full-text search**: MiniSearch-based index served from an API route and consumed client-side
- **Admin console**:
  - Auth via a simple cookie session
  - Create / edit / delete docs across all languages
  - **Raw editor** with a floating icon toolbox (quick inserts for headings, lists, code blocks, etc.)
  - **Visual editor** using `@mdxeditor/editor`
  - Preview via an **embed-friendly public route** (no shell UI)

## Tech stack

- **Next.js** `16.x`
- **React** `19.x`
- **Tailwind CSS** `4.x`
- **MDX**: `next-mdx-remote/rsc`, `remark-gfm`
- **Search**: `minisearch`

## Getting started

Install dependencies:

```bash
npm install
```

Run development server:

```bash
npm run dev
```

Open the app:

- Public docs: `http://localhost:3000/en/docs/overview/introduction`
- Admin: `http://localhost:3000/en/admin`

## Environment variables

Create a `.env.local`:

```bash
ADMIN_PASSWORD=your-strong-password
```

If `ADMIN_PASSWORD` is not set, the admin route falls back to a default password (recommended to override in all environments).

## Docs authoring

Docs live in the `docs/` folder as `.mdx` (or `.md`) files.

### File naming & locales

- Default (Indonesian): `docs/<slug>.mdx`
- Localized: `docs/<slug>.<locale>.mdx` (example: `docs/overview/introduction.en.mdx`)

### Frontmatter

The docs engine reads frontmatter for:

- `title`: page title
- `description`: short page description
- `order`: numeric ordering for sidebar
- `id`: canonical ID to link translations of the same page across locales

Example:

```md
---
id: overview/introduction
title: Overview
description: The Integrated Distribution Platform for Modern Developers
order: 1
---
```

## Public routes

- Docs: `/{locale}/docs/[...slug]`
- Embed-only docs (no shell UI; best for iframes): `/{locale}/docs-embed/[...slug]`

## Admin routes

- Admin UI: `/{locale}/admin`
- Auth API: `/api/admin/auth`
- Docs CRUD API: `/api/admin/docs`
- Search index API: `/api/docs-search?locale=<locale>`

## Repo structure (high-level)

- `docs/`: MDX content (source of truth)
- `src/app/[locale]/docs/`: docs pages + shell layout + sidebar
- `src/app/[locale]/admin/`: admin console UI + preview
- `src/app/api/`: admin/search API routes
- `src/lib/docs.ts`: docs filesystem reader, tree builder, search document extraction
- `src/lib/i18n.ts`: locales + labels + UI translations

## Notes

- This project reads/writes docs from the local filesystem (`docs/`). In production, ensure your deployment strategy supports persistent content changes (or replace the storage layer).

