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

// GrammarCheckButton.tsx
import { MdSpellcheck } from 'react-icons/md';
import { AI_STYLES } from './aiVisuals';

interface GrammarCheckButtonProps {
  onClick: () => void;
  isChecking: boolean;
}

const SPARKLE = 'M12 0 L13.9 10.1 L24 12 L13.9 13.9 L12 24 L10.1 13.9 L0 12 L10.1 10.1 Z';

/**
 * Spell-check button at the end of the composer toolbar: same size as the other
 * toolbar buttons, with a soft AI-gradient tint and a small sparkle so it is
 * noticeable without standing out too much.
 */
const GrammarCheckButton = ({ onClick, isChecking }: GrammarCheckButtonProps) => (
  <>
    <style>{AI_STYLES}</style>
    <button
      type="button"
      onClick={onClick}
      disabled={isChecking}
      data-checking={isChecking}
      className="gc-check-button relative flex-shrink-0 inline-flex items-center justify-center w-[30px] h-6 rounded-[var(--radius-2)] disabled:cursor-progress"
      title={isChecking ? 'Checking…' : 'Check spelling'}
      aria-label="Check spelling and grammar"
    >
      <MdSpellcheck size={14} />
      <svg
        width="7"
        height="7"
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="absolute top-[3px] right-[4px]"
      >
        <path className="gc-star" d={SPARKLE} fill="var(--purple-9)" />
      </svg>
    </button>
  </>
);

export default GrammarCheckButton;
