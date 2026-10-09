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

// useGrammarCheck.ts
import type { Editor } from '@tiptap/core';
import { Mapping } from '@tiptap/pm/transform';
import { useCallback, useEffect, useRef, useState } from 'react';
import { checkSpellGrammar } from '../../../../api/grammar';
import {
  buildCheckableText,
  codePointOffsetConverter,
  getIssueRanges,
  removeGrammarIssues,
  setGrammarIssues,
  textRangeToDocRange,
  type GrammarCheckStorage,
  type GrammarIssueKind,
  type GrammarIssueRange,
} from './GrammarCheckExtension';

export interface GrammarIssue {
  id: string;
  kind: GrammarIssueKind;
  message: string;
  /** The flagged text as it was when checked. */
  original: string;
  replacements: string[];
}

export type GrammarCheckStatus = 'idle' | 'checking' | 'done' | 'error';

const MAX_REPLACEMENTS = 5;

const getStorage = (editor: Editor) =>
  (editor.storage as unknown as { grammarCheck: GrammarCheckStorage }).grammarCheck;

/**
 * Runs the server spelling/grammar check on the editor's own text (quoted
 * emails are skipped) and manages the resulting issues. Uses the API's
 * `matches` (offsets + replacements) — its `corrected` text is not reliable.
 */
export function useGrammarCheck(editor: Editor | null) {
  const [status, setStatus] = useState<GrammarCheckStatus>('idle');
  const [error, setError] = useState<string | null>(null);
  const [issues, setIssues] = useState<GrammarIssue[]>([]);
  // Issues still underlined in the document (fixed/ignored/edited ones drop out)
  const [openIds, setOpenIds] = useState<string[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  // Bumped on every click on an underline (even the same one twice), so the
  // panel can reopen after being minimized
  const [issueClickCount, setIssueClickCount] = useState(0);
  const abortRef = useRef<AbortController | null>(null);

  // Keep the list in sync with the underlines while the user edits
  useEffect(() => {
    if (!editor) return;
    const sync = () => {
      const ids = [...getIssueRanges(editor.state).keys()];
      setOpenIds((prev) => (prev.join('|') === ids.join('|') ? prev : ids));
    };
    editor.on('transaction', sync);
    getStorage(editor).onIssueClick = (id) => {
      setActiveId(id);
      setIssueClickCount((count) => count + 1);
    };
    return () => {
      editor.off('transaction', sync);
      if (!editor.isDestroyed) getStorage(editor).onIssueClick = null;
    };
  }, [editor]);

  useEffect(() => () => abortRef.current?.abort(), []);

  const clear = useCallback(() => {
    abortRef.current?.abort();
    setStatus('idle');
    setError(null);
    setIssues([]);
    setActiveId(null);
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(setGrammarIssues(editor.state.tr, []));
    }
  }, [editor]);

  const run = useCallback(async () => {
    if (!editor || editor.isDestroyed) return;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    const checkable = buildCheckableText(editor.state.doc);
    if (!checkable.text.trim()) {
      setIssues([]);
      setError('Write something first, then check it.');
      setStatus('error');
      return;
    }

    // The check takes seconds and the user may keep typing: collect the edits
    // made meanwhile so the results can be placed on the current text.
    const mapping = new Mapping();
    const collect = ({
      transaction,
    }: {
      transaction: { docChanged: boolean; mapping: Mapping };
    }) => {
      if (transaction.docChanged) mapping.appendMapping(transaction.mapping);
    };
    editor.on('transaction', collect);

    setStatus('checking');
    setError(null);
    setActiveId(null);
    editor.view.dispatch(setGrammarIssues(editor.state.tr, []));

    try {
      const response = await checkSpellGrammar(checkable.text, controller.signal);
      if (controller.signal.aborted || editor.isDestroyed) return;

      const toUtf16 = codePointOffsetConverter(checkable.text);
      const doc = editor.state.doc;
      const runId = Date.now().toString(36);
      const ranges: GrammarIssueRange[] = [];
      const found: GrammarIssue[] = [];

      (response.matches ?? []).forEach((match, index) => {
        const start = toUtf16(match.offset);
        const end = toUtf16(match.offset + match.error_length);
        const original = checkable.text.slice(start, end);
        const range = textRangeToDocRange(checkable, start, end - start);
        if (!range || !original.trim()) return;

        const from = mapping.map(range.from, 1);
        const to = mapping.map(range.to, -1);
        // Skip issues whose text was edited while the check was running
        if (from >= to || doc.textBetween(from, to) !== original) return;

        const id = `${runId}-${index}`;
        const kind: GrammarIssueKind =
          match.rule_issue_type === 'misspelling' || match.category === 'TYPOS'
            ? 'spelling'
            : 'grammar';
        ranges.push({ id, from, to, kind, original });
        found.push({
          id,
          kind,
          message: match.message,
          original,
          replacements: (match.replacements ?? []).slice(0, MAX_REPLACEMENTS),
        });
      });

      editor.view.dispatch(setGrammarIssues(editor.state.tr, ranges));
      setIssues(found);
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Spelling check failed. Please try again.');
      setStatus('error');
    } finally {
      editor.off('transaction', collect);
    }
  }, [editor]);

  const cancel = useCallback(() => {
    abortRef.current?.abort();
    setStatus(issues.length ? 'done' : 'idle');
  }, [issues.length]);

  /** Replaces the flagged text with `replacement` (keeps its formatting). */
  const apply = useCallback(
    (id: string, replacement: string) => {
      if (!editor || editor.isDestroyed) return;
      const range = getIssueRanges(editor.state).get(id);
      if (!range) return;
      const tr = editor.state.tr.insertText(replacement, range.from, range.to);
      editor.view.dispatch(removeGrammarIssues(tr, [id]));
      editor.commands.focus();
    },
    [editor]
  );

  /**
   * Applies the first suggestion of every open issue that has one, in one
   * undoable step.
   */
  const applyAll = useCallback(() => {
    if (!editor || editor.isDestroyed) return;
    const ranges = getIssueRanges(editor.state);
    const fixes = issues
      .filter((issue) => issue.replacements.length && ranges.has(issue.id))
      .map((issue) => ({ issue, range: ranges.get(issue.id)! }))
      // Back to front so earlier positions stay valid
      .sort((a, b) => b.range.from - a.range.from);
    if (!fixes.length) return;

    const tr = editor.state.tr;
    fixes.forEach(({ issue, range }) => tr.insertText(issue.replacements[0], range.from, range.to));
    editor.view.dispatch(
      removeGrammarIssues(
        tr,
        fixes.map(({ issue }) => issue.id)
      )
    );
    editor.commands.focus();
  }, [editor, issues]);

  const ignore = useCallback(
    (id: string) => {
      if (!editor || editor.isDestroyed) return;
      editor.view.dispatch(removeGrammarIssues(editor.state.tr, [id]));
    },
    [editor]
  );

  /** Selects the flagged text in the editor and scrolls to it. */
  const focusIssue = useCallback(
    (id: string) => {
      setActiveId(id);
      if (!editor || editor.isDestroyed) return;
      const range = getIssueRanges(editor.state).get(id);
      if (range) editor.chain().focus().setTextSelection(range).scrollIntoView().run();
    },
    [editor]
  );

  const openIssues = issues.filter((issue) => openIds.includes(issue.id));

  return {
    status,
    error,
    issues: openIssues,
    totalFound: issues.length,
    activeId,
    issueClickCount,
    run,
    cancel,
    clear,
    apply,
    applyAll,
    ignore,
    focusIssue,
  };
}

export type GrammarCheck = ReturnType<typeof useGrammarCheck>;
