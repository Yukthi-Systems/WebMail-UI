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
import { checkSpellGrammar, type GrammarMatch } from '../../../../api/grammar';
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
  /**
   * Found only by the re-check after "Fix all" (e.g. grammar a misspelling was
   * hiding).
   */
  isNew?: boolean;
}

export type GrammarCheckStatus = 'idle' | 'checking' | 'done' | 'error';

/**
 * Outcome of "Fix current issues", shown at the top of the panel. There is no
 * automatic re-check (server load); `rechecked` is set once the user checks
 * again.
 */
export interface FixAllSummary {
  fixed: number;
  rechecked: boolean;
  /** Issues that appeared only after the fixes. */
  newCount: number;
  /** Issues left that the checker has no suggestion for. */
  noSuggestionCount: number;
}

// Identifies "the same issue" across checks: same rule on the same text
const issueKey = (ruleId: string, original: string) => `${ruleId}|${original}`;

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
  const [checkReason, setCheckReason] = useState<'manual' | 'afterFixAll'>('manual');
  const [fixSummary, setFixSummary] = useState<FixAllSummary | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  // Issues the user ignored stay ignored on later checks (this composer only)
  const ignoredKeysRef = useRef(new Set<string>());
  const keyById = useRef(new Map<string, string>());
  // Last server result: checking the very same text again reuses it (no request)
  const lastResultRef = useRef<{ text: string; matches: GrammarMatch[] } | null>(null);
  // Set by "Fix current issues": the next check marks what the fixes uncovered
  const pendingFixAllRef = useRef<{ fixed: number; carriedKeys: Set<string> } | null>(null);

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
    setFixSummary(null);
    if (editor && !editor.isDestroyed) {
      editor.view.dispatch(setGrammarIssues(editor.state.tr, []));
    }
  }, [editor]);

  /**
   * Checks the editor text. If it is exactly the text of the last check, that
   * result is reused instead of sending another request. A check following "Fix
   * current issues" marks issues the fixes uncovered as new.
   */
  const runCheck = useCallback(async () => {
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

    const cachedMatches =
      lastResultRef.current?.text === checkable.text ? lastResultRef.current.matches : null;
    const afterFixAll = cachedMatches ? null : pendingFixAllRef.current;

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

    if (!cachedMatches) setStatus('checking');
    setCheckReason(afterFixAll ? 'afterFixAll' : 'manual');
    setFixSummary(null);
    setError(null);
    setActiveId(null);
    editor.view.dispatch(setGrammarIssues(editor.state.tr, []));

    try {
      // Unchanged since the last check: reuse its result, no server request
      const matches =
        cachedMatches ?? (await checkSpellGrammar(checkable.text, controller.signal)).matches ?? [];
      if (controller.signal.aborted || editor.isDestroyed) return;
      if (!cachedMatches) {
        lastResultRef.current = { text: checkable.text, matches };
        pendingFixAllRef.current = null;
      }

      const toUtf16 = codePointOffsetConverter(checkable.text);
      const doc = editor.state.doc;
      const runId = Date.now().toString(36);
      const ranges: GrammarIssueRange[] = [];
      const found: GrammarIssue[] = [];

      matches.forEach((match, index) => {
        const start = toUtf16(match.offset);
        const end = toUtf16(match.offset + match.error_length);
        const original = checkable.text.slice(start, end);
        const range = textRangeToDocRange(checkable, start, end - start);
        if (!range || !original.trim()) return;

        const from = mapping.map(range.from, 1);
        const to = mapping.map(range.to, -1);
        // Skip issues whose text was edited while the check was running
        if (from >= to || doc.textBetween(from, to) !== original) return;

        const key = issueKey(match.rule_id, original);
        if (ignoredKeysRef.current.has(key)) return;

        const id = `${runId}-${index}`;
        const kind: GrammarIssueKind =
          match.rule_issue_type === 'misspelling' || match.category === 'TYPOS'
            ? 'spelling'
            : 'grammar';
        ranges.push({ id, from, to, kind, original });
        keyById.current.set(id, key);
        found.push({
          id,
          kind,
          message: match.message,
          original,
          replacements: (match.replacements ?? []).slice(0, MAX_REPLACEMENTS),
          isNew: afterFixAll ? !afterFixAll.carriedKeys.has(key) : undefined,
        });
      });

      editor.view.dispatch(setGrammarIssues(editor.state.tr, ranges));
      setIssues(found);
      if (afterFixAll) {
        setFixSummary({
          fixed: afterFixAll.fixed,
          rechecked: true,
          newCount: found.filter((issue) => issue.isNew).length,
          noSuggestionCount: found.filter((issue) => !issue.replacements.length).length,
        });
      }
      setStatus('done');
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(err instanceof Error ? err.message : 'Spelling check failed. Please try again.');
      setStatus('error');
    } finally {
      editor.off('transaction', collect);
    }
  }, [editor]);

  /** Check button: a fresh check (also safe as an onClick handler). */
  const run = useCallback(() => {
    void runCheck();
  }, [runCheck]);

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

    // Issues left after this (no suggestion): remembered so the re-check can
    // tell them apart from issues the fixes uncovered
    const fixedIds = new Set(fixes.map(({ issue }) => issue.id));
    const carriedKeys = new Set(
      issues
        .filter((issue) => ranges.has(issue.id) && !fixedIds.has(issue.id))
        .map((issue) => keyById.current.get(issue.id))
        .filter((key): key is string => !!key)
    );

    const tr = editor.state.tr;
    fixes.forEach(({ issue, range }) => tr.insertText(issue.replacements[0], range.from, range.to));
    editor.view.dispatch(removeGrammarIssues(tr, [...fixedIds]));
    editor.commands.focus();

    // No automatic re-check (server load). Fixes can uncover new issues (e.g.
    // "employes has" → "employees has"), so the panel suggests checking again,
    // and that check marks what is new.
    pendingFixAllRef.current = { fixed: fixes.length, carriedKeys };
    setFixSummary({
      fixed: fixes.length,
      rechecked: false,
      newCount: 0,
      noSuggestionCount: carriedKeys.size,
    });
  }, [editor, issues]);

  const ignore = useCallback(
    (id: string) => {
      if (!editor || editor.isDestroyed) return;
      const key = keyById.current.get(id);
      if (key) ignoredKeysRef.current.add(key);
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
    checkReason,
    fixSummary,
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
