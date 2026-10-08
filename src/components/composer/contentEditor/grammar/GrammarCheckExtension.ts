/*
 * Copyright (C) 2026 Yukthi Systems Private Limited
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License version 3
 * as published by the Free Software Foundation.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * version 3 along with this program. If not, see
 * <https://www.gnu.org/licenses/>.
 */

// GrammarCheckExtension.ts
import { Extension } from '@tiptap/core';
import type { Node as ProseMirrorNode } from '@tiptap/pm/model';
import { Plugin, PluginKey, type EditorState, type Transaction } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';

export type GrammarIssueKind = 'spelling' | 'grammar';

/**
 * An issue placed in the document (positions are kept up to date while
 * editing).
 */
export interface GrammarIssueRange {
  id: string;
  from: number;
  to: number;
  kind: GrammarIssueKind;
  /** The flagged text — the underline is dropped once the user changes it. */
  original: string;
}

interface DecorationSpec {
  id: string;
  original: string;
}

interface TextSegment {
  textStart: number; // offset in the checked text
  pos: number; // document position of the first character
  length: number;
}

export interface CheckableText {
  text: string;
  segments: TextSegment[];
}

// Quoted emails (replies/forwards) are someone else's text — don't check them
const SKIPPED_NODES = new Set(['blockquote', 'image', 'table']);

/**
 * Plain text of the document as sent to the checker, plus a map from text
 * offsets back to document positions. Blocks are separated by newlines.
 */
export const buildCheckableText = (doc: ProseMirrorNode): CheckableText => {
  let text = '';
  const segments: TextSegment[] = [];
  const newline = () => {
    if (text && !text.endsWith('\n')) text += '\n';
  };

  doc.descendants((node, pos) => {
    if (SKIPPED_NODES.has(node.type.name)) {
      newline();
      return false;
    }
    if (node.isText && node.text) {
      segments.push({ textStart: text.length, pos, length: node.text.length });
      text += node.text;
      return false;
    }
    if (node.type.name === 'hardBreak') {
      text += '\n';
      return false;
    }
    if (node.isBlock) newline();
    return true;
  });

  return { text, segments };
};

/**
 * The API (Python) counts offsets in Unicode code points, JS strings in UTF-16
 * units — they differ after an emoji or other astral character. Returns a
 * converter from code-point offsets to UTF-16 offsets for `text`.
 */
export const codePointOffsetConverter = (text: string): ((offset: number) => number) => {
  if (!/[\uD800-\uDBFF]/.test(text)) return (offset) => offset;
  const utf16AtCodePoint: number[] = [];
  let utf16 = 0;
  for (const char of text) {
    utf16AtCodePoint.push(utf16);
    utf16 += char.length;
  }
  utf16AtCodePoint.push(utf16);
  return (offset) => utf16AtCodePoint[Math.min(offset, utf16AtCodePoint.length - 1)];
};

/**
 * Document range of a [offset, offset + length) slice of the checked text
 * (UTF-16 offsets).
 */
export const textRangeToDocRange = (
  { segments }: CheckableText,
  offset: number,
  length: number
): { from: number; to: number } | null => {
  const end = offset + length;
  const startSegment = segments.find(
    (s) => offset >= s.textStart && offset < s.textStart + s.length
  );
  const endSegment = segments.find((s) => end > s.textStart && end <= s.textStart + s.length);
  if (!startSegment || !endSegment || length <= 0) return null;
  return {
    from: startSegment.pos + (offset - startSegment.textStart),
    to: endSegment.pos + (end - endSegment.textStart),
  };
};

export const grammarPluginKey = new PluginKey<DecorationSet>('grammarCheck');

type GrammarMeta = { type: 'set'; issues: GrammarIssueRange[] } | { type: 'remove'; ids: string[] };

const buildDecorations = (doc: ProseMirrorNode, issues: GrammarIssueRange[]) =>
  DecorationSet.create(
    doc,
    issues
      .filter((issue) => issue.from < issue.to && issue.to <= doc.content.size)
      .map((issue) =>
        Decoration.inline(
          issue.from,
          issue.to,
          {
            class: `grammar-issue grammar-issue--${issue.kind}`,
            'data-grammar-id': issue.id,
          },
          { id: issue.id, original: issue.original } satisfies DecorationSpec
        )
      )
  );

const applyTransaction = (tr: Transaction, decorations: DecorationSet) => {
  const meta = tr.getMeta(grammarPluginKey) as GrammarMeta | undefined;
  if (meta?.type === 'set') return buildDecorations(tr.doc, meta.issues);

  let next = decorations.map(tr.mapping, tr.doc);
  if (meta?.type === 'remove') {
    const ids = new Set(meta.ids);
    next = next.remove(next.find(undefined, undefined, (spec) => ids.has(spec.id)));
  }

  // Edited inside a flagged word: the issue no longer applies
  if (tr.docChanged) {
    const changed = next
      .find()
      .filter((d) => tr.doc.textBetween(d.from, d.to) !== (d.spec as DecorationSpec).original);
    if (changed.length) next = next.remove(changed);
  }
  return next;
};

export interface GrammarCheckStorage {
  /**
   * Set by the composer UI: called with an issue id when its underline is
   * clicked.
   */
  onIssueClick: ((id: string) => void) | null;
}

/**
 * Underlines spelling/grammar issues and keeps them aligned with the text while
 * editing.
 */
export const GrammarCheckExtension = Extension.create<object, GrammarCheckStorage>({
  name: 'grammarCheck',

  addStorage() {
    return { onIssueClick: null };
  },

  addProseMirrorPlugins() {
    const storage = this.storage;
    return [
      new Plugin<DecorationSet>({
        key: grammarPluginKey,
        state: {
          init: () => DecorationSet.empty,
          apply: (tr, decorations) => applyTransaction(tr, decorations),
        },
        props: {
          decorations: (state) => grammarPluginKey.getState(state),
          handleClick: (view, pos) => {
            const found = grammarPluginKey.getState(view.state)?.find(pos, pos);
            const id = (found?.[0]?.spec as DecorationSpec | undefined)?.id;
            if (id) storage.onIssueClick?.(id);
            return false; // keep normal cursor placement
          },
        },
      }),
    ];
  },
});

/** Current (mapped) ranges of the issues still underlined in the document. */
export const getIssueRanges = (state: EditorState): Map<string, { from: number; to: number }> => {
  const ranges = new Map<string, { from: number; to: number }>();
  grammarPluginKey
    .getState(state)
    ?.find()
    .forEach((d) => ranges.set((d.spec as DecorationSpec).id, { from: d.from, to: d.to }));
  return ranges;
};

export const setGrammarIssues = (tr: Transaction, issues: GrammarIssueRange[]) =>
  tr.setMeta(grammarPluginKey, { type: 'set', issues } satisfies GrammarMeta);

export const removeGrammarIssues = (tr: Transaction, ids: string[]) =>
  tr.setMeta(grammarPluginKey, { type: 'remove', ids } satisfies GrammarMeta);
