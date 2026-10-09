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

// GrammarPanel.tsx
import { Tooltip } from '@radix-ui/themes';
import { useEffect, useRef, useState } from 'react';
import { AI_STYLES, AiSparkles } from './aiVisuals';
import {
  FaCheckCircle,
  FaChevronDown,
  FaChevronUp,
  FaExclamationTriangle,
  FaTimes,
} from 'react-icons/fa';
import { MdInfoOutline, MdSpellcheck } from 'react-icons/md';
import type { GrammarCheck } from './useGrammarCheck';

interface GrammarPanelProps {
  check: GrammarCheck;
}

const NO_ISSUES_HIDE_MS = 4000;

const PRIVACY_NOTE =
  "Your text is checked on our own servers and isn't shared with anyone else. Suggestions may not always be right, so please review them.";

const iconButton =
  'w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-a3)] transition-colors';

/**
 * Spelling & grammar results as a drawer docked on the toolbar, over the bottom
 * of the editor so the composer layout doesn't move. Minimizing slides it down
 * into a small tab on the toolbar edge. Must be rendered inside a `position:
 * relative; overflow: hidden` wrapper.
 */
const GrammarPanel = ({ check }: GrammarPanelProps) => {
  const { status, error, issues, totalFound, activeId, issueClickCount, fixSummary } = check;
  const [minimized, setMinimized] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const listRef = useRef<HTMLDivElement | null>(null);

  const hasIssues = status === 'done' && issues.length > 0;
  const isOpen = hasIssues && !minimized;

  // New results open the panel
  useEffect(() => {
    if (status === 'done') setMinimized(false);
  }, [status, totalFound]);

  // Clicking an underlined word opens the panel on its suggestion. Only the
  // list itself is scrolled — scrollIntoView would also scroll the editor's
  // clipping wrapper and push the docked panel out of place.
  useEffect(() => {
    if (!activeId) return;
    setMinimized(false);
    const list = listRef.current;
    const item = list?.querySelector<HTMLElement>(`[data-issue-id="${activeId}"]`);
    if (!list || !item) return;
    const top = item.offsetTop;
    const bottom = top + item.offsetHeight;
    if (top < list.scrollTop) {
      list.scrollTo({ top, behavior: 'smooth' });
    } else if (bottom > list.scrollTop + list.clientHeight) {
      list.scrollTo({ top: bottom - list.clientHeight, behavior: 'smooth' });
    }
  }, [activeId, issueClickCount]);

  // "No issues" is just a confirmation — let it go away on its own
  useEffect(() => {
    if (status !== 'done' || issues.length > 0) return;
    const timer = setTimeout(check.clear, NO_ISSUES_HIDE_MS);
    return () => clearTimeout(timer);
  }, [status, issues.length, check.clear]);

  // Leave room under the text so the last lines can scroll above the open panel
  useEffect(() => {
    const panel = panelRef.current;
    const wrapper = panel?.parentElement;
    if (!panel || !wrapper) return;
    const update = () =>
      wrapper.style.setProperty(
        '--grammar-panel-space',
        isOpen ? `${panel.offsetHeight + 8}px` : '0px'
      );
    update();
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    return () => {
      observer.disconnect();
      wrapper.style.setProperty('--grammar-panel-space', '0px');
    };
  }, [isOpen]);

  if (status === 'idle') return null;

  const fixableCount = issues.filter((issue) => issue.replacements.length).length;
  const spellingCount = issues.filter((issue) => issue.kind === 'spelling').length;

  // ── Small pill: checking / result summary / minimized ─────────────────────
  const pill = (() => {
    if (status === 'error') {
      return (
        <>
          <FaExclamationTriangle className="text-[var(--amber-10)]" size={12} />
          <span className="max-w-[240px] truncate" title={error ?? undefined}>
            {error}
          </span>
          <button type="button" onClick={check.clear} className={iconButton} title="Close">
            <FaTimes size={10} />
          </button>
        </>
      );
    }
    if (!hasIssues) {
      return (
        <>
          <FaCheckCircle className="text-[var(--green-10)]" size={12} />
          <span>
            {fixSummary
              ? `Fixed ${fixSummary.fixed} issue${fixSummary.fixed === 1 ? '' : 's'}`
              : totalFound
                ? 'All issues resolved'
                : 'No issues found'}
          </span>
        </>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="inline-flex items-center gap-1.5"
        title="Show suggestions"
      >
        <span
          className={`w-2 h-2 rounded-full ${spellingCount ? 'bg-[var(--red-9)]' : 'bg-[var(--blue-9)]'}`}
        />
        <span className="font-medium text-[var(--gray-12)]">
          {issues.length} issue{issues.length === 1 ? '' : 's'}
        </span>
        <FaChevronUp size={9} className="text-[var(--gray-10)]" />
      </button>
    );
  })();

  return (
    <>
      <style>{AI_STYLES}</style>

      {status === 'checking' && (
        <>
          {/* A soft band gliding over the text while it is being analysed */}
          <div
            className="pointer-events-none absolute inset-0 z-[5] overflow-hidden"
            aria-hidden="true"
          >
            <div className="gc-scan" />
          </div>

          {/* Tab on the toolbar edge with a flowing gradient border */}
          <div
            className="gc-ai-border absolute bottom-0 right-3 z-10 rounded-t-lg pt-px px-px"
            role="status"
            aria-live="polite"
          >
            <div className="flex items-center gap-2 h-7 pl-2.5 pr-1.5 rounded-t-[7px] text-xs bg-[var(--color-panel-solid)]">
              <AiSparkles />
              <span className="gc-ai-text font-medium">
                {check.checkReason === 'afterFixAll'
                  ? 'Re-checking after fixes…'
                  : 'Analyzing your writing…'}
              </span>
              <button
                type="button"
                onClick={check.cancel}
                className={iconButton}
                title="Cancel"
                aria-label="Cancel spelling check"
              >
                <FaTimes size={10} />
              </button>
            </div>
          </div>
        </>
      )}

      {/* Tab on the toolbar edge — shown whenever the full panel isn't */}
      {status !== 'checking' && (
        <div
          className={`absolute bottom-0 right-3 z-10 flex items-center gap-2 h-7 pl-3 pr-2 rounded-t-lg text-xs text-[var(--gray-11)] bg-[var(--color-panel-solid)] border border-b-0 border-[var(--gray-a5)] shadow-[0_-4px_10px_-6px_var(--gray-a6)] transition-transform duration-200 ease-out ${
            isOpen ? 'translate-y-full pointer-events-none' : 'translate-y-0'
          }`}
          role="status"
        >
          {pill}
        </div>
      )}

      {/* Drawer docked on the toolbar — slides down into it when minimized */}
      <div
        ref={panelRef}
        aria-hidden={!isOpen}
        className={`absolute inset-x-0 bottom-0 z-10 flex flex-col max-h-[min(260px,70%)] rounded-t-xl text-[13px] bg-[var(--color-panel-solid)] border border-b-0 border-[var(--gray-a5)] shadow-[0_-8px_20px_-12px_var(--gray-a7)] transition-transform duration-300 ease-out ${
          isOpen ? 'translate-y-0' : 'translate-y-full pointer-events-none'
        }`}
      >
        {/* @container: the header shortens its texts based on the panel's own width
            (the composer can be narrow even on a large screen), never wrapping */}
        <div className="@container flex items-center gap-2 pl-3 pr-1.5 h-9 border-b border-[var(--gray-a4)] flex-shrink-0 whitespace-nowrap">
          <MdSpellcheck size={16} className="flex-shrink-0 text-[var(--accent-11)]" />
          <span className="flex-shrink-0 font-medium text-[var(--gray-12)]">
            {issues.length} issue{issues.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-2 min-w-0 text-xs text-[var(--gray-10)]">
            {spellingCount > 0 && (
              <span className="inline-flex items-center gap-1" title={`${spellingCount} spelling`}>
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--red-9)]" />
                {spellingCount}
                <span className="hidden @2xl:inline">spelling</span>
              </span>
            )}
            {issues.length - spellingCount > 0 && (
              <span
                className="inline-flex items-center gap-1"
                title={`${issues.length - spellingCount} grammar`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue-9)]" />
                {issues.length - spellingCount}
                <span className="hidden @2xl:inline">grammar</span>
              </span>
            )}
          </span>
          {/* Privacy note: the check runs on our servers, nothing goes to a third party */}
          <Tooltip content={PRIVACY_NOTE}>
            <span
              tabIndex={0}
              className="inline-flex items-center gap-1 text-[11px] text-[var(--gray-10)] hover:text-[var(--gray-11)] cursor-help outline-none focus-visible:text-[var(--gray-12)]"
              aria-label={PRIVACY_NOTE}
            >
              <span className="hidden @2xl:inline">Checked privately</span>
              <MdInfoOutline size={12} />
            </span>
          </Tooltip>
          <span className="ml-auto flex flex-shrink-0 items-center gap-0.5">
            {fixableCount > 0 && (
              <button
                type="button"
                onClick={check.applyAll}
                className="h-6 px-2 mr-1 rounded-md text-xs font-medium text-[var(--accent-11)] bg-[var(--accent-a3)] hover:bg-[var(--accent-a4)] transition-colors"
                title="Apply the suggestions (Ctrl+Z to undo)"
              >
                <span className="hidden @md:inline">Fix current issues</span>
                <span className="@md:hidden">Fix</span> ({fixableCount})
              </button>
            )}
            <button
              type="button"
              onClick={() => setMinimized(true)}
              className={iconButton}
              title="Minimize"
              aria-label="Minimize spelling suggestions"
            >
              <FaChevronDown size={10} />
            </button>
            <button
              type="button"
              onClick={check.clear}
              className={iconButton}
              title="Close"
              aria-label="Close spelling check"
            >
              <FaTimes size={10} />
            </button>
          </span>
        </div>

        <div ref={listRef} className="relative overflow-y-auto overscroll-contain py-1">
          {fixSummary && (
            <div className="mx-2 mt-1 mb-1 flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-[var(--gray-11)] bg-[var(--green-a2)]">
              <FaCheckCircle className="flex-shrink-0 text-[var(--green-10)]" size={11} />
              <span>
                Fixed {fixSummary.fixed} issue{fixSummary.fixed === 1 ? '' : 's'}
                {fixSummary.newCount > 0 && ` · ${fixSummary.newCount} new`}
                {fixSummary.noSuggestionCount > 0 &&
                  ` · ${fixSummary.noSuggestionCount} to review manually`}
              </span>
            </div>
          )}
          {issues.map((issue) => (
            <div
              key={issue.id}
              data-issue-id={issue.id}
              onClick={() => check.focusIssue(issue.id)}
              className={`group px-3 py-1.5 cursor-pointer transition-colors ${
                activeId === issue.id ? 'bg-[var(--accent-a3)]' : 'hover:bg-[var(--gray-a2)]'
              }`}
            >
              <div className="flex items-baseline gap-2 min-w-0">
                <span
                  className={`font-medium text-[var(--gray-12)] underline decoration-wavy underline-offset-[3px] ${
                    issue.kind === 'spelling'
                      ? 'decoration-[var(--red-9)]'
                      : 'decoration-[var(--blue-9)]'
                  }`}
                >
                  {issue.original}
                </span>
                {issue.isNew && (
                  <span
                    className="flex-shrink-0 self-center px-1.5 rounded text-[10px] font-medium leading-4 text-[var(--accent-11)] bg-[var(--accent-a4)]"
                    title="Found after fixing"
                  >
                    New
                  </span>
                )}
                <span className="text-xs text-[var(--gray-10)] truncate" title={issue.message}>
                  {issue.message}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
                {issue.replacements.length === 0 && (
                  <span className="h-6 inline-flex items-center px-1 text-xs italic text-[var(--gray-10)]">
                    No suggestion
                  </span>
                )}
                {issue.replacements.map((replacement) => (
                  <button
                    key={replacement}
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      check.apply(issue.id, replacement);
                    }}
                    className="h-6 px-2 rounded-md text-xs text-[var(--accent-11)] bg-[var(--accent-a3)] hover:bg-[var(--accent-a5)] transition-colors"
                    title={`Replace with "${replacement}"`}
                  >
                    {replacement === '' ? '(remove)' : replacement}
                  </button>
                ))}
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    check.ignore(issue.id);
                  }}
                  className="h-6 px-1.5 rounded-md text-xs text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-a3)] transition-colors"
                >
                  Ignore
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </>
  );
};

export default GrammarPanel;
