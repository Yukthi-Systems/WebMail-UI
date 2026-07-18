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

import { FaPen } from 'react-icons/fa6';
import { useEffect } from 'react';

export type ComposeButtonStyle = 'default' | 'compact' | 'minimal';

const variantConfig = {
  default: {
    expanded:
      'w-full px-4 py-3 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg font-medium shadow-lg flex items-center justify-center gap-2',
    collapsed:
      'w-full p-3 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-lg shadow-lg flex items-center justify-center',
    expandedIconSize: 14,
    collapsedIconSize: 12,
  },
  compact: {
    expanded:
      'px-8 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md text-sm font-medium flex items-center justify-center gap-2',
    collapsed:
      'w-full p-2.5 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white rounded-md flex items-center justify-center',
    expandedIconSize: 13,
    collapsedIconSize: 13,
  },
  minimal: {
    expanded:
      'px-4 py-2 text-[var(--accent-9)] hover:bg-[var(--accent-2)] rounded-md text-sm font-medium flex items-center justify-center gap-2',
    collapsed:
      'w-full p-2.5 text-[var(--accent-9)] hover:bg-[var(--accent-2)] rounded-md flex items-center justify-center',
    expandedIconSize: 13,
    collapsedIconSize: 13,
  },
} as const;

// ─── Keyframes + hover rules — injected once into <head> ─────────
function useComposeKeyframes() {
  useEffect(() => {
    const id = 'compose-btn-keyframes';
    if (document.getElementById(id)) return;
    const tag = document.createElement('style');
    tag.id = id;
    tag.textContent = `
      @keyframes compose-shimmer {
        0%   { transform: translateX(-100%); }
        100% { transform: translateX(350%); }
      }
      @keyframes compose-border-spin {
        to { transform: rotate(360deg); }
      }

      /* default: shimmer sits off-screen, sweeps once on hover, resets on leave */
      .compose-default .compose-shimmer {
        opacity: 0;
        transform: translateX(-100%);
      }
      .compose-default:hover .compose-shimmer {
        opacity: 1;
        animation: compose-shimmer 1.2s ease-out forwards;
      }

      /* compact: same pattern, slightly tighter timing */
      .compose-compact .compose-shimmer {
        opacity: 0;
        transform: translateX(-100%);
      }
      .compose-compact:hover .compose-shimmer {
        opacity: 1;
        animation: compose-shimmer 1s ease-out forwards;
      }

      /* minimal: conic layer invisible by default, fades in on hover */
      .compose-minimal-wrap .compose-conic {
        opacity: 0;
        transition: opacity 0.25s ease;
      }
      .compose-minimal-wrap:hover .compose-conic {
        opacity: 1;
      }
    `;
    document.head.appendChild(tag);
  }, []);
}

// ─── Component ───────────────────────────────────────────────────
interface ComposeButtonProps {
  variant?: ComposeButtonStyle;
  isExpanded: boolean;
  onClick: () => void;
}

const ComposeButton = ({ variant = 'default', isExpanded, onClick }: ComposeButtonProps) => {
  useComposeKeyframes();
  const cfg = variantConfig[variant];

  /* ── DEFAULT — shimmer sweeps once on hover ── */
  if (variant === 'default') {
    return (
      <button
        className={`compose-default relative overflow-hidden transition-all duration-200 ${
          isExpanded ? cfg.expanded : cfg.collapsed
        }`}
        onClick={onClick}
        title={isExpanded ? undefined : 'Compose'}
      >
        <span
          className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: '45%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          }}
        />
        <FaPen
          size={isExpanded ? cfg.expandedIconSize : cfg.collapsedIconSize}
          className="relative z-10"
        />
        {isExpanded && <span className="relative z-10">Compose</span>}
      </button>
    );
  }

  /* ── COMPACT — same button + one shimmer <span> on hover ── */
  if (variant === 'compact') {
    return (
      <button
        className={`compose-compact relative overflow-hidden transition-all duration-200 ${
          isExpanded ? cfg.expanded : cfg.collapsed
        }`}
        onClick={onClick}
        title={isExpanded ? undefined : 'Compose'}
      >
        {/* shimmer streak — pointer-events-none, lives off-screen until hover */}
        <span
          className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
          style={{
            width: '45%',
            background:
              'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.3) 50%, transparent 100%)',
          }}
        />
        <FaPen
          size={isExpanded ? cfg.expandedIconSize : cfg.collapsedIconSize}
          className="relative z-10"
        />
        {isExpanded && <span className="relative z-10">Compose</span>}
      </button>
    );
  }

  /* ── MINIMAL — wrapper holds the conic layer (invisible until hover),
         inner button is identical to before but needs a solid bg
         so it can "cut out" the gradient in the 1.5 px gap ── */
  return (
    <div
      className={`compose-minimal-wrap relative overflow-hidden ${isExpanded ? 'inline-flex' : 'w-full'}`}
      style={{ padding: '1.5px', borderRadius: '6px' }}
    >
      {/* spinning conic — only ~12 % of the arc is lit */}
      <div
        className="compose-conic absolute"
        style={{
          inset: '-200%',
          background:
            'conic-gradient(from 0deg, transparent 0%, transparent 78%, var(--accent-9) 90%, transparent 100%)',
          animation: 'compose-border-spin 3s linear infinite',
        }}
      />

      {/* inner button — bg matches sidebar so it looks ghost when conic is hidden */}
      <button
        className={`relative bg-[var(--gray-1)] transition-all duration-200 ${
          isExpanded ? cfg.expanded : cfg.collapsed
        }`}
        style={{ borderRadius: '4.5px' }}
        onClick={onClick}
        title={isExpanded ? undefined : 'Compose'}
      >
        <FaPen size={isExpanded ? cfg.expandedIconSize : cfg.collapsedIconSize} />
        {isExpanded && <span>Compose</span>}
      </button>
    </div>
  );
};

export default ComposeButton;
