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
import { Button, Spinner } from '@radix-ui/themes';
import { useEffect, useRef } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaTimes } from 'react-icons/fa';
import type { GrammarCheck } from './useGrammarCheck';

interface GrammarPanelProps {
  check: GrammarCheck;
}

/** Results of the spelling & grammar check, shown under the editor. */
const GrammarPanel = ({ check }: GrammarPanelProps) => {
  const { status, error, issues, totalFound, activeId } = check;
  const listRef = useRef<HTMLDivElement | null>(null);

  // Clicking an underlined word in the editor brings its suggestion into view
  useEffect(() => {
    if (!activeId) return;
    listRef.current
      ?.querySelector(`[data-issue-id="${activeId}"]`)
      ?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [activeId]);

  if (status === 'idle') return null;

  const fixableCount = issues.filter((issue) => issue.replacements.length).length;

  return (
    <div className="mx-2 mb-1 rounded-lg border border-[var(--gray-6)] bg-[var(--gray-2)] text-[13px]">
      <div className="flex items-center gap-2 px-3 py-2 border-b border-[var(--gray-5)]">
        {status === 'checking' && (
          <>
            <Spinner size="1" />
            <span className="text-[var(--gray-11)]">Checking spelling and grammar…</span>
            <Button
              size="1"
              variant="ghost"
              color="gray"
              onClick={check.cancel}
              className="ml-auto"
            >
              Cancel
            </Button>
          </>
        )}

        {status === 'error' && (
          <>
            <FaExclamationTriangle className="text-[var(--amber-10)] flex-shrink-0" />
            <span className="text-[var(--gray-11)]">{error}</span>
          </>
        )}

        {status === 'done' && issues.length === 0 && (
          <>
            <FaCheckCircle className="text-[var(--green-10)] flex-shrink-0" />
            <span className="text-[var(--gray-11)]">
              {totalFound ? 'All issues resolved.' : 'No spelling or grammar issues found.'}
            </span>
          </>
        )}

        {status === 'done' && issues.length > 0 && (
          <>
            <span className="font-medium text-[var(--gray-12)]">
              {issues.length} issue{issues.length === 1 ? '' : 's'}
            </span>
            {fixableCount > 1 && (
              <Button size="1" variant="soft" onClick={check.applyAll} className="ml-auto">
                Fix all ({fixableCount})
              </Button>
            )}
          </>
        )}

        {status !== 'checking' && (
          <button
            type="button"
            onClick={check.clear}
            className={`p-1 rounded text-[var(--gray-10)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] ${
              status === 'done' && fixableCount > 1 ? '' : 'ml-auto'
            }`}
            title="Close"
            aria-label="Close spelling check"
          >
            <FaTimes size={11} />
          </button>
        )}
      </div>

      {issues.length > 0 && (
        <div ref={listRef} className="max-h-44 overflow-y-auto divide-y divide-[var(--gray-4)]">
          {issues.map((issue) => (
            <div
              key={issue.id}
              data-issue-id={issue.id}
              onClick={() => check.focusIssue(issue.id)}
              className={`flex items-start gap-2 px-3 py-2 cursor-pointer transition-colors ${
                activeId === issue.id ? 'bg-[var(--accent-3)]' : 'hover:bg-[var(--gray-3)]'
              }`}
            >
              <span
                className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${
                  issue.kind === 'spelling' ? 'bg-[var(--red-9)]' : 'bg-[var(--blue-9)]'
                }`}
                title={issue.kind === 'spelling' ? 'Spelling' : 'Grammar'}
              />
              <div className="flex-1 min-w-0">
                <div className="text-[var(--gray-12)]">
                  <span className="font-medium">“{issue.original}”</span>
                  <span className="text-[var(--gray-11)]"> — {issue.message}</span>
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
                      className="px-2 py-0.5 rounded-full border border-[var(--accent-7)] text-[var(--accent-11)] bg-[var(--color-surface)] hover:bg-[var(--accent-4)]"
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
                    className="px-2 py-0.5 text-[var(--gray-10)] hover:text-[var(--gray-12)]"
                  >
                    Ignore
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default GrammarPanel;
