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

import React, { useState, useRef, useEffect } from 'react';
import { FiChevronDown, FiCheck } from 'react-icons/fi';

interface SelectOption {
  value: string;
  label: string;
  disabled?: boolean;
}

interface CustomSelectProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  options: SelectOption[];
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  value,
  onValueChange,
  placeholder = 'Select...',
  options,
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleEscape);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && highlightedIndex >= 0 && dropdownRef.current) {
      const highlightedElement = dropdownRef.current.children[highlightedIndex] as HTMLElement;
      highlightedElement?.scrollIntoView({ block: 'nearest' });
    }
  }, [highlightedIndex, isOpen]);

  const handleKeyDown = (event: React.KeyboardEvent) => {
    if (disabled) return;

    switch (event.key) {
      case 'Enter':
      case ' ':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
        } else if (highlightedIndex >= 0) {
          const option = options[highlightedIndex];
          if (!option.disabled) {
            onValueChange(option.value);
            setIsOpen(false);
          }
        }
        break;
      case 'ArrowDown':
        event.preventDefault();
        if (!isOpen) {
          setIsOpen(true);
          setHighlightedIndex(0);
        } else {
          setHighlightedIndex((prev) => {
            let next = prev + 1;
            while (next < options.length && options[next].disabled) {
              next++;
            }
            return next < options.length ? next : prev;
          });
        }
        break;
      case 'ArrowUp':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex((prev) => {
            let next = prev - 1;
            while (next >= 0 && options[next].disabled) {
              next--;
            }
            return next >= 0 ? next : prev;
          });
        }
        break;
      case 'Home':
        event.preventDefault();
        if (isOpen) {
          setHighlightedIndex(options.findIndex((opt) => !opt.disabled));
        }
        break;
      case 'End':
        event.preventDefault();
        if (isOpen) {
          for (let i = options.length - 1; i >= 0; i--) {
            if (!options[i].disabled) {
              setHighlightedIndex(i);
              break;
            }
          }
        }
        break;
    }
  };

  const handleSelect = (option: SelectOption) => {
    if (option.disabled) return;
    onValueChange(option.value);
    setIsOpen(false);
    setHighlightedIndex(-1);
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        onKeyDown={handleKeyDown}
        disabled={disabled}
        className={`
          w-full
          inline-flex items-center justify-between gap-2
          px-3 py-2 
          bg-[var(--gray-1)] 
          border border-[var(--gray-6)] 
          text-[var(--gray-12)] 
          rounded-md 
          transition-all duration-150
          outline-none
          ${!disabled && 'hover:border-[var(--gray-7)] hover:bg-[var(--gray-2)] hover:shadow-sm'}
          ${isOpen && 'border-[var(--accent-8)] ring-2 ring-[var(--accent-5)]'}
          ${disabled && 'opacity-50 cursor-not-allowed'}
          ${!selectedOption && 'text-[var(--gray-9)]'}
        `}
      >
        <span className="truncate">{selectedOption?.label || placeholder}</span>
        <FiChevronDown
          className={`
            w-4 h-4 text-[var(--gray-11)] 
            transition-transform duration-200
            ${isOpen && 'rotate-180'}
          `}
        />
      </button>

      {isOpen && (
        <div
          ref={dropdownRef}
          className="
            absolute top-full left-0 right-0
            mt-1
            bg-[var(--gray-1)] 
            border border-[var(--gray-6)]
            rounded-md 
            shadow-xl
            overflow-hidden
            z-50
            animate-in fade-in slide-in-from-top-1 duration-150
          "
        >
          <div className="max-h-[300px] overflow-y-auto p-1">
            {options.map((option, index) => {
              const isSelected = option.value === value;
              const isHighlighted = index === highlightedIndex;

              return (
                <button
                  key={option.value}
                  type="button"
                  title={option.label}
                  onClick={() => handleSelect(option)}
                  onMouseEnter={() => !option.disabled && setHighlightedIndex(index)}
                  disabled={option.disabled}
                  className={`
                    w-full
                    relative 
                    flex items-center 
                    gap-2
                    px-8 py-2 
                    text-sm text-left
                    text-[var(--gray-12)] 
                    rounded 
                    outline-none
                    transition-colors duration-100
                    ${!option.disabled && 'cursor-pointer'}
                    ${isHighlighted && !option.disabled && 'bg-[var(--accent-3)]'}
                    ${option.disabled && 'opacity-50 cursor-not-allowed'}
                  `}
                >
                  {isSelected && (
                    <span className="absolute left-2 inline-flex items-center">
                      <FiCheck className="w-4 h-4 text-[var(--accent-11)]" />
                    </span>
                  )}
                  <span className="truncate">{option.label}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
