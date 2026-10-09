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

// aiVisuals.tsx
import { useId } from 'react';

// "AI is working" visuals for the checking state. Theme colors only, so they
// follow light/dark mode; static for users who prefer reduced motion.
export const AI_STYLES = `
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
/* Check button. A faint gradient ring with a bright arc running around it, a soft
   tint inside, and every few seconds a glint sweeps across while the sparkle pops.
   The ring is the element's own border (one shape, one radius) so it stays crisp. */
@property --gc-angle { syntax: '<angle>'; initial-value: 0deg; inherits: false; }
@keyframes gc-orbit { to { --gc-angle: 360deg; } }
@keyframes gc-glint {
  0%, 62% { transform: translateX(-130%) skewX(-20deg); }
  82%, 100% { transform: translateX(170%) skewX(-20deg); }
}
@keyframes gc-pop {
  0%, 70%, 100% { transform: scale(1) rotate(0deg); opacity: 0.9; }
  78% { transform: scale(1.6) rotate(45deg); opacity: 1; }
  86% { transform: scale(0.9) rotate(90deg); opacity: 0.9; }
}
.gc-check-button {
  position: relative;
  overflow: hidden;
  isolation: isolate;
  color: var(--accent-11);
  border: 1px solid transparent;
  background:
    linear-gradient(120deg, var(--accent-a3), var(--purple-a3), var(--pink-a3)) padding-box,
    linear-gradient(var(--color-panel-solid), var(--color-panel-solid)) padding-box,
    conic-gradient(from var(--gc-angle), var(--purple-a6) 0%, var(--accent-9) 12%, var(--pink-9) 22%, var(--purple-a6) 34%, var(--purple-a6) 100%) border-box;
  animation: gc-orbit 3.2s linear infinite;
  transition: filter 0.15s;
}
.gc-check-button::after {
  content: '';
  position: absolute;
  inset: -2px;
  z-index: -1;
  pointer-events: none;
  background: linear-gradient(90deg, transparent 30%, rgba(255, 255, 255, 0.75) 50%, transparent 70%);
  animation: gc-glint 4.5s ease-in-out infinite;
}
.dark .gc-check-button::after, .dark-theme .gc-check-button::after {
  background: linear-gradient(90deg, transparent 30%, rgba(255, 255, 255, 0.22) 50%, transparent 70%);
}
.gc-check-button .gc-star { animation: gc-pop 4.5s ease-in-out infinite; }
.gc-check-button:hover { filter: saturate(1.5) brightness(0.97); }
.gc-check-button:hover .gc-star { animation: gc-twinkle 1.2s ease-in-out infinite; }
.gc-check-button[data-checking='true'] { animation-duration: 1.4s; }
.gc-check-button:focus-visible { outline: 2px solid var(--accent-8); outline-offset: 2px; }
@media (prefers-reduced-motion: reduce) {
  .gc-ai-border, .gc-ai-text, .gc-star, .gc-check-button, .gc-check-button::after { animation: none !important; }
  .gc-check-button::after { display: none; }
  .gc-scan { display: none; }
}
`;

/** Three twinkling sparkles with the AI gradient. */
export const AiSparkles = () => {
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
