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

import { useAtomValue } from 'jotai';
import { useState, useRef, useEffect } from 'react';
import { FaAngleLeft, FaAngleRight, FaChevronDown } from 'react-icons/fa6';
import { userSettingsAtom } from '../../state/settings';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  totalCount: number;
  onPageChange: (page: number) => void;
}

const Pagination = ({ currentPage, totalPages, totalCount, onPageChange }: PaginationProps) => {
  const [inputValue, setInputValue] = useState(currentPage.toString());
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const userSettings = useAtomValue(userSettingsAtom);

  const threadedView = userSettings?.email?.mail_thead_view || 'all threads';

  useEffect(() => {
    setInputValue(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const handlePrevPage = () => {
    if (currentPage > 1) {
      onPageChange(currentPage - 1);
    }
  };

  const handleNextPage = () => {
    if (currentPage < totalPages) {
      onPageChange(currentPage + 1);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '' || /^\d+$/.test(value)) {
      setInputValue(value);
    }
  };

  const handleInputBlur = (e: React.FocusEvent) => {
    // Don't blur if clicking inside dropdown
    if (dropdownRef.current?.contains(e.relatedTarget as Node)) {
      return;
    }

    const pageNum = parseInt(inputValue, 10);
    if (!isNaN(pageNum) && pageNum >= 1 && pageNum <= totalPages) {
      onPageChange(pageNum);
    } else {
      setInputValue(currentPage.toString());
    }
    setIsOpen(false);
  };

  const handleInputKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      inputRef.current?.blur();
      setIsOpen(false);
    } else if (e.key === 'Escape') {
      setInputValue(currentPage.toString());
      setIsOpen(false);
      inputRef.current?.blur();
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      setIsOpen(true);
      setHighlightedIndex(0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setIsOpen(true);
    }
  };

  const handleInputFocus = () => {
    setIsOpen(true);
    setTimeout(() => {
      inputRef.current?.select();
    }, 0);
  };

  const generatePageItems = () => {
    const items: number[] = [];
    const maxQuickPages = 10;

    const basePages = Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1);
    basePages.forEach((p) => items.push(p));

    if (totalPages <= maxQuickPages) {
      return items;
    }

    const showPages = new Set<number>(items);

    showPages.add(totalPages);

    for (let i = Math.max(11, currentPage - 2); i <= Math.min(totalPages, currentPage + 2); i++) {
      showPages.add(i);
    }

    [25, 50, 100, 250, 500].forEach((milestone) => {
      if (milestone < totalPages) showPages.add(milestone);
    });

    return Array.from(showPages).sort((a, b) => a - b);
  };

  const pageItems = generatePageItems();
  const typedNum = parseInt(inputValue, 10);
  const isValidTyped = !isNaN(typedNum) && typedNum >= 1 && typedNum <= totalPages;

  return (
    <div className="flex items-center gap-3">
      <div
        className="flex items-center gap-2 "
        title={threadedView === 'all threads' ? 'Displayed count groups emails by thread' : ''}
      >
        <span className="text-sm text-[var(--gray-11)]">Page</span>

        <div className="relative" ref={dropdownRef}>
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={handleInputChange}
            onBlur={handleInputBlur}
            onKeyDown={handleInputKeyDown}
            onFocus={handleInputFocus}
            className="w-11 pl-2 pr-2 py-1 text-sm text-center text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded transition-colors focus:outline-none focus:border-[var(--accent-7)] focus:ring-2 focus:ring-[var(--accent-8)]"
            title="Type page number"
          />

          {isOpen && (
            <div className="absolute top-full left-0 mt-1 w-20 max-h-72 overflow-auto bg-[var(--color-panel-solid)] border border-[var(--gray-6)] rounded-md shadow-lg z-50 py-1">
              {pageItems.map((page, idx) => {
                const isSelected = page === currentPage;
                const isTypedMatch = isValidTyped && page === typedNum;

                return (
                  <button
                    key={page}
                    type="button"
                    onClick={() => {
                      onPageChange(page);
                      setIsOpen(false);
                      inputRef.current?.blur();
                    }}
                    onMouseEnter={() => setHighlightedIndex(idx)}
                    className={`
                      w-full px-3 py-1.5 text-left text-sm transition-colors
                      ${isSelected ? 'bg-[var(--accent-3)] text-[var(--accent-12)]' : 'text-[var(--gray-12)]'}
                      ${highlightedIndex === idx && !isSelected ? 'bg-[var(--gray-3)]' : ''}
                      ${isTypedMatch && !isSelected ? 'bg-[var(--accent-3)] text-[var(--accent-11)]' : ''}
                      hover:bg-[var(--accent-5)]
                    `}
                  >
                    <div className="flex items-center justify-between">
                      <span>{page}</span>
                      {isSelected && <span className="text-[var(--accent-9)]">✓</span>}
                      {isTypedMatch && !isSelected && (
                        <span className="text-[var(--accent-9)]">→</span>
                      )}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        <span className="text-sm text-[var(--gray-11)] text-nowrap">of {totalPages}</span>
        <span className="text-sm text-[var(--gray-11)] text-nowrap">• {totalCount} emails</span>
      </div>

      <div className="flex gap-1">
        <button
          onClick={handlePrevPage}
          disabled={currentPage === 1}
          className="flex items-center justify-center w-8 h-8 text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-3)] disabled:hover:border-[var(--gray-6)]"
          aria-label="Previous Page"
          title="Previous page"
        >
          <FaAngleLeft size={16} />
        </button>
        <button
          onClick={handleNextPage}
          disabled={currentPage === totalPages}
          className="flex items-center justify-center w-8 h-8 text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-6)] hover:border-[var(--gray-7)] rounded-md transition-colors disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-3)] disabled:hover:border-[var(--gray-6)]"
          aria-label="Next Page"
          title="Next page"
        >
          <FaAngleRight size={16} />
        </button>
      </div>
    </div>
  );
};

export default Pagination;
