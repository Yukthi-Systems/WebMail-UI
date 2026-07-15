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

import React, { useState, forwardRef } from 'react';
import { useBIMI } from '../../hooks/useBimi';

interface BIMIAvatarProps {
  email: string;
  name?: string;
  size?: number;
  className?: string;
  isLoading?: boolean;
}

const AVATAR_COLORS = [
  { bg: '#5B4CF5', text: '#ffffff' }, // indigo
  { bg: '#E05C2A', text: '#ffffff' }, // orange
  { bg: '#2A9E6F', text: '#ffffff' }, // teal-green
  { bg: '#D4357A', text: '#ffffff' }, // pink
  { bg: '#2A7EC2', text: '#ffffff' }, // blue
  { bg: '#C47D0E', text: '#ffffff' }, // amber
  { bg: '#7B3FA8', text: '#ffffff' }, // purple
  { bg: '#1E8A8A', text: '#ffffff' }, // cyan
  { bg: '#B03A2E', text: '#ffffff' }, // red
  { bg: '#2E7D32', text: '#ffffff' }, // green
  { bg: '#C0392B', text: '#ffffff' }, // crimson
  { bg: '#1A6B8A', text: '#ffffff' }, // steel blue
  { bg: '#6D4C41', text: '#ffffff' }, // brown
  { bg: '#00695C', text: '#ffffff' }, // dark teal
  { bg: '#AD1457', text: '#ffffff' }, // deep pink
  { bg: '#4527A0', text: '#ffffff' }, // deep purple
];

function getAvatarColor(seed: string): { bg: string; text: string } {
  if (!seed) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < seed.length; i++) {
    hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

const SPINNER_STYLES = `
  @keyframes google-rotate {
    100% { transform: rotate(360deg); }
  }
  @keyframes google-dash {
    0%   { stroke-dasharray: 1, 150; stroke-dashoffset: 0; }
    50%  { stroke-dasharray: 90, 150; stroke-dashoffset: -35; }
    100% { stroke-dasharray: 90, 150; stroke-dashoffset: -124; }
  }
  @keyframes google-color {
    0%   { stroke: #4285F4; }
    25%  { stroke: #EA4335; }
    50%  { stroke: #FBBC05; }
    75%  { stroke: #34A853; }
    100% { stroke: #4285F4; }
  }
`;

const BIMIAvatar = forwardRef<HTMLDivElement | HTMLImageElement, BIMIAvatarProps>(
  ({ email, name, size = 40, className = '', isLoading = false }, ref) => {
    const { logoUrl, loading, error } = useBIMI(email);
    const [imageError, setImageError] = useState(false);

    const getInitials = () => {
      if (!email) return '?';
      if (name) {
        let cleanedName = name.trim();
        cleanedName = cleanedName.replace(/\\"/g, '');
        cleanedName = cleanedName.replace(/"/g, '');
        cleanedName = cleanedName.replace(/\\/g, '');
        cleanedName = cleanedName.trim();
        if (!cleanedName) return email.charAt(0).toUpperCase();
        const parts = cleanedName.split(/[\s.]+/);
        const initials = parts
          .filter((p) => p.length > 0)
          .map((p) => p.charAt(0))
          .join('');
        return initials.length > 0
          ? initials.substring(0, 2).toUpperCase()
          : email.charAt(0).toUpperCase();
      }
      return email.charAt(0).toUpperCase();
    };

    const r = size / 2 + 2;
    const center = size / 2;

    const Spinner = () => (
      <>
        <style>{SPINNER_STYLES}</style>
        <svg
          viewBox={`0 0 ${size} ${size}`}
          className="absolute inset-0 pointer-events-none z-10"
          style={{
            width: size,
            height: size,
            overflow: 'visible',
            animation: 'google-rotate 2s linear infinite',
          }}
        >
          <circle
            cx={center}
            cy={center}
            r={r}
            fill="none"
            strokeWidth="2"
            strokeLinecap="round"
            style={{
              animation:
                'google-dash 1.5s ease-in-out infinite, google-color 4s ease-in-out infinite',
            }}
          />
        </svg>
      </>
    );

    if (logoUrl && !loading && !imageError) {
      return (
        <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
          {isLoading && <Spinner />}
          <img
            ref={ref as React.Ref<HTMLImageElement>}
            src={logoUrl}
            alt={`${name || email} logo`}
            className={`absolute inset-0 rounded-full object-cover ${className}`}
            style={{ width: size, height: size, aspectRatio: '1 / 1' }}
            onError={() => setImageError(true)}
          />
        </div>
      );
    }

    const color = getAvatarColor(email);

    return (
      <div className="relative flex-shrink-0" style={{ width: size, height: size }}>
        {isLoading && <Spinner />}
        <div
          ref={ref as React.Ref<HTMLDivElement>}
          className={`absolute inset-0 inline-flex items-center justify-center rounded-full font-medium ${className}`}
          style={{
            fontSize: size < 32 ? '10px' : '14px',
            aspectRatio: '1 / 1',
            backgroundColor: color.bg,
            color: color.text,
          }}
          title={name || email}
        >
          {getInitials()}
        </div>
      </div>
    );
  }
);

BIMIAvatar.displayName = 'BIMIAvatar';
export default BIMIAvatar;
