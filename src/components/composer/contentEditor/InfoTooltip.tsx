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

import { useEffect, useRef, useState } from 'react';

export const InfoTooltip = () => {
  const [visible, setVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setVisible(false);
      }
    };
    if (visible) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [visible]);

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-flex', alignItems: 'center' }}>
      <button
        type="button"
        onClick={() => setVisible((v) => !v)}
        title="How does this editor work?"
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          border: '1.5px solid var(--gray-8)',
          background: 'transparent',
          color: 'var(--gray-9)',
          fontSize: 10,
          fontWeight: 700,
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
          lineHeight: 1,
          flexShrink: 0,
        }}
      >
        ?
      </button>
      {visible && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 6px)',
            right: 0,
            width: 250,
            background: 'var(--gray-1)',
            border: '1px solid var(--gray-5)',
            borderRadius: 8,
            boxShadow: '0 4px 16px rgba(0,0,0,0.12)',
            padding: '10px 12px',
            zIndex: 100,
            fontSize: 11,
            color: 'var(--gray-11)',
            lineHeight: 1.6,
          }}
        >
          <div style={{ fontWeight: 600, marginBottom: 6, color: 'var(--gray-12)', fontSize: 12 }}>
            Editor modes
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>✏️ Rich Text</span> — Visual editor. Good for plain
            text emails.{' '}
            <span style={{ color: 'var(--red-9)' }}>⚠ Will strip any existing HTML styling</span> —
            avoid if your content uses custom HTML.
          </div>
          <div style={{ marginBottom: 6 }}>
            <span style={{ fontWeight: 600 }}>&lt;/&gt; HTML</span> — Edit raw HTML directly. Use
            this if your email has custom styles, layouts, or templates. This is the source of
            truth.
          </div>
          <div>
            <span style={{ fontWeight: 600 }}>👁 Preview</span> — Shows exactly how the email will
            render, in a sandboxed iframe.
          </div>
        </div>
      )}
    </div>
  );
};
