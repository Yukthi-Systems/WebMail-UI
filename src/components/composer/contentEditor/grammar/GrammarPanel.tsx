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
import { useEffect, useId, useRef, useState } from 'react';
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

// "AI is working" visuals for the checking state. Theme colors only, so they
// follow light/dark mode; static for users who prefer reduced motion.
const AI_STYLES = `
@keyframes gc-flow { from { background-position: 0% 50%; } to { background-position: 300% 50%; } }
@keyframes gc-shimmer { from { background-position: 100% 0; } to { background-position: 0% 0; } }
@keyframes gc-twinkle {
  0%, 100% { transform: scale(0.55) rotate(0deg); opacity: 0.55; }
  50% { transform: scale(1) rotate(90deg); opacity: 1; }
}
@keyframes gc-scan { from { transform: translateY(-110%); } to { transform: translateY(260%); } }
@keyframes gc-rise { from { transform: translateY(100%); opacity: 0; } to { transform: translateY(0); opacity: 1; } }
@keyframes gc-glow {
  0%, 100% { box-shadow: 0 -4px 14px -6px var(--accent-a7); }
  50% { box-shadow: 0 -6px 18px -4px var(--purple-a7); }
}
.gc-ai-border {
  background: linear-gradient(90deg, var(--accent-9), var(--purple-9), var(--pink-9), var(--blue-9), var(--accent-9));
  background-size: 300% 100%;
  animation: gc-flow 3s linear infinite, gc-glow 2.4s ease-in-out infinite, gc-rise 0.25s ease-out;
}
.gc-ai-text {
  background-image: linear-gradient(90deg, var(--gray-11) 0%, var(--gray-11) 38%, var(--purple-11) 46%, var(--accent-11) 50%, var(--pink-11) 54%, var(--gray-11) 62%, var(--gray-11) 100%);
  background-size: 250% 100%;
  -webkit-background-clip: text;
  background-clip: text;
  color: transparent;
  animation: gc-shimmer 2s linear infinite;
}
.gc-star { transform-origin: center; transform-box: fill-box; animation: gc-twinkle 1.6s ease-in-out infinite; }
g:nth-of-type(2) > .gc-star { animation-delay: 0.5s; }
g:nth-of-type(3) > .gc-star { animation-delay: 1s; }
.gc-scan {
  height: 45%;
  background: linear-gradient(180deg, transparent, var(--accent-a2) 35%, var(--purple-a3) 55%, var(--pink-a2) 70%, transparent);
  animation: gc-scan 2.6s cubic-bezier(0.45, 0, 0.25, 1) infinite;
}
@media (prefers-reduced-motion: reduce) {
  .gc-ai-border, .gc-ai-text, .gc-star { animation: none; }
  .gc-scan { display: none; }
}
`;

/** Three twinkling sparkles with the AI gradient. */
const AiSparkles = () => {
  const gradientId = `gc-sparkle-${useId().replace(/:/g, '')}`;
  const star = 'M12 0 L13.9 10.1 L24 12 L13.9 13.9 L12 24 L10.1 13.9 L0 12 L10.1 10.1 Z';
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="flex-shrink-0">
      <defs>
        <linearGradient id={gradientId} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--accent-9)" />
          <stop offset="55%" stopColor="var(--purple-9)" />
          <stop offset="100%" stopColor="var(--pink-9)" />
        </linearGradient>
      </defs>
      <g transform="translate(4 4) scale(0.66)">
        <path className="gc-star" d={star} fill={`url(#${gradientId})`} />
      </g>
      <g transform="translate(0 0) scale(0.3)">
        <path className="gc-star" d={star} fill={`url(#${gradientId})`} />
      </g>
      <g transform="translate(16.5 15.5) scale(0.3)">
        <path className="gc-star" d={star} fill={`url(#${gradientId})`} />
      </g>
    </svg>
  );
};

const iconButton =
  'w-6 h-6 inline-flex items-center justify-center rounded-md text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-a3)] transition-colors';

/**
 * Spelling & grammar results as a drawer docked on the toolbar, over the bottom
 * of the editor so the composer layout doesn't move. Minimizing slides it down
 * into a small tab on the toolbar edge. Must be rendered inside a `position:
 * relative; overflow: hidden` wrapper.
 */
const GrammarPanel = ({ check }: GrammarPanelProps) => {
  const { status, error, issues, totalFound, activeId, issueClickCount } = check;
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
          <span>{totalFound ? 'All issues resolved' : 'No spelling or grammar issues'}</span>
        </>
      );
    }
    return (
      <button
        type="button"
        onClick={() => setMinimized(false)}
        className="inline-flex items-center gap-1.5"
        title="Show spelling suggestions"
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
              <span className="gc-ai-text font-medium">Analyzing your writing…</span>
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
        <div className="flex items-center gap-2 pl-3 pr-1.5 h-9 border-b border-[var(--gray-a4)] flex-shrink-0">
          <MdSpellcheck size={16} className="text-[var(--accent-11)]" />
          <span className="font-medium text-[var(--gray-12)]">
            {issues.length} issue{issues.length === 1 ? '' : 's'}
          </span>
          <span className="flex items-center gap-2 text-xs text-[var(--gray-10)]">
            {spellingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--red-9)]" />
                {spellingCount} spelling
              </span>
            )}
            {issues.length - spellingCount > 0 && (
              <span className="inline-flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue-9)]" />
                {issues.length - spellingCount} grammar
              </span>
            )}
          </span>
          <Tooltip content="Suggestions are generated by AI and may not always be correct. Review each change before sending.">
            <span
              tabIndex={0}
              className="inline-flex text-[var(--gray-9)] hover:text-[var(--gray-11)] cursor-help outline-none focus-visible:text-[var(--gray-12)]"
              aria-label="Suggestions are generated by AI and may not always be correct. Review each change before sending."
            >
              <MdInfoOutline size={14} />
            </span>
          </Tooltip>
          <span className="ml-auto flex items-center gap-0.5">
            {fixableCount > 1 && (
              <button
                type="button"
                onClick={check.applyAll}
                className="h-6 px-2 mr-1 rounded-md text-xs font-medium text-[var(--accent-11)] bg-[var(--accent-a3)] hover:bg-[var(--accent-a4)] transition-colors"
                title="Apply the first suggestion to every issue — review the result, AI suggestions can be wrong (Ctrl+Z to undo)"
              >
                Fix all
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
              title="Close and remove underlines"
              aria-label="Close spelling check"
            >
              <FaTimes size={10} />
            </button>
          </span>
        </div>

        <div ref={listRef} className="relative overflow-y-auto overscroll-contain py-1">
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
                <span className="text-xs text-[var(--gray-10)] truncate" title={issue.message}>
                  {issue.message}
                </span>
              </div>
              <div className="flex flex-wrap items-center gap-1 mt-1">
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
