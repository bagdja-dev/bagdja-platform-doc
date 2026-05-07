"use client";

import type { ForwardedRef } from "react";
import {
  toolbarPlugin,
  linkDialogPlugin,
  UndoRedo,
  BoldItalicUnderlineToggles,
  BlockTypeSelect,
  CreateLink,
  InsertTable,
  InsertThematicBreak,
  ListsToggle,
  CodeToggle,
  headingsPlugin,
  listsPlugin,
  quotePlugin,
  thematicBreakPlugin,
  markdownShortcutPlugin,
  linkPlugin,
  tablePlugin,
  codeBlockPlugin,
  frontmatterPlugin,
  MDXEditor,
  type MDXEditorMethods,
  type MDXEditorProps,
} from "@mdxeditor/editor";

export default function InitializedMDXEditor({
  editorRef,
  ...props
}: { editorRef: ForwardedRef<MDXEditorMethods> | null } & MDXEditorProps) {
  return (
    <MDXEditor
      plugins={[
        frontmatterPlugin(),
        toolbarPlugin({
          toolbarContents: () => (
            <>
              <UndoRedo />
              <span className="mx-1 h-6 w-px bg-zinc-800" />
              <BoldItalicUnderlineToggles />
              <CodeToggle />
              <span className="mx-1 h-6 w-px bg-zinc-800" />
              <BlockTypeSelect />
              <ListsToggle />
              <span className="mx-1 h-6 w-px bg-zinc-800" />
              <CreateLink />
              <InsertTable />
              <InsertThematicBreak />
            </>
          ),
        }),
        headingsPlugin(),
        listsPlugin(),
        quotePlugin(),
        thematicBreakPlugin(),
        linkPlugin(),
        linkDialogPlugin(),
        tablePlugin(),
        codeBlockPlugin(),
        markdownShortcutPlugin(),
      ]}
      {...props}
      ref={editorRef}
    />
  );
}

