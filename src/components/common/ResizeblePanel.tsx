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

import type { ReactNode } from '@tanstack/react-router';
import { useState, useRef, useEffect } from 'react';

interface ResizablePanelProps {
  direction?: 'horizontal' | 'vertical';
  defaultSize?: number;
  minSize?: number;
  maxSize?: number;
  minPixelSize?: number; // Minimum pixel size for LEFT panel
  minPixelSizeRight?: number; // ✅ NEW: Minimum pixel size for RIGHT panel (viewer)
  children: [ReactNode, ReactNode];
  className?: string;
  onSizeChange?: (size: number) => void;
}

const ResizablePanel = ({
  direction = 'horizontal',
  defaultSize = 33.33,
  minSize = 20,
  maxSize = 80,
  minPixelSize = 0,
  minPixelSizeRight = 0, // ✅ NEW
  children,
  className = '',
  onSizeChange,
}: ResizablePanelProps) => {
  const [size, setSize] = useState(defaultSize);
  const [isDragging, setIsDragging] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setSize(defaultSize);
  }, [defaultSize]);

  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current) return;

      const container = containerRef.current;
      const rect = container.getBoundingClientRect();
      const containerSize = direction === 'horizontal' ? rect.width : rect.height;

      // Calculate minimum percentage for left panel
      const minPixelPercent = minPixelSize ? (minPixelSize / containerSize) * 100 : 0;
      const effectiveMin = Math.max(minSize, minPixelPercent);

      // ✅ NEW: Calculate maximum percentage for left panel based on right panel's minimum
      const minPixelPercentRight = minPixelSizeRight
        ? (minPixelSizeRight / containerSize) * 100
        : 0;
      const effectiveMax = Math.min(maxSize, 100 - minPixelPercentRight);

      let newSize: number;
      if (direction === 'horizontal') {
        const mouseX = e.clientX - rect.left;
        newSize = (mouseX / rect.width) * 100;
      } else {
        const mouseY = e.clientY - rect.top;
        newSize = (mouseY / rect.height) * 100;
      }

      // Clamp using both effective min and max
      newSize = Math.max(effectiveMin, Math.min(effectiveMax, newSize));
      setSize(newSize);
    };

    const handleMouseUp = () => {
      setIsDragging(false);
      if (onSizeChange) {
        onSizeChange(size);
      }
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, [
    isDragging,
    direction,
    minSize,
    maxSize,
    minPixelSize,
    minPixelSizeRight,
    size,
    onSizeChange,
  ]);

  const handleMouseDown = (e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const [leftPanel, rightPanel] = children;

  return (
    <div
      ref={containerRef}
      className={`w-full h-full flex ${direction === 'horizontal' ? 'flex-row' : 'flex-col'} ${className}`}
      style={{
        cursor: isDragging ? (direction === 'horizontal' ? 'ew-resize' : 'ns-resize') : 'default',
      }}
    >
      <div
        style={{
          [direction === 'horizontal' ? 'width' : 'height']: `${size}%`,
          [direction === 'horizontal' ? 'minWidth' : 'minHeight']: minPixelSize
            ? `${minPixelSize}px`
            : undefined,
          flexShrink: 0,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
        className="overflow-auto"
      >
        {leftPanel}
      </div>

      <div
        onMouseDown={handleMouseDown}
        style={{
          cursor: direction === 'horizontal' ? 'ew-resize' : 'ns-resize',
        }}
        className={`
          relative flex-shrink-0 
          transition-colors duration-150 group z-10
          ${direction === 'horizontal' ? 'w-[3px] hover:w-[3px]' : 'h-[3px] hover:h-[3px]'}
          ${isDragging ? 'bg-[var(--accent-9)]' : 'bg-[var(--gray-6)] hover:bg-[var(--gray-7)]'}
        `}
      >
        <div
          className={`
            absolute
            ${
              direction === 'horizontal'
                ? 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[1px] h-10'
                : 'left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-10 h-[1px]'
            }
            transition-all duration-150
            ${
              isDragging
                ? 'bg-white opacity-60'
                : 'bg-[var(--gray-9)] opacity-0 group-hover:opacity-40'
            }
          `}
        />
      </div>

      <div
        className="flex-1 overflow-auto"
        style={{
          // ✅ NEW: Enforce minimum pixel size for right panel too
          [direction === 'horizontal' ? 'minWidth' : 'minHeight']: minPixelSizeRight
            ? `${minPixelSizeRight}px`
            : undefined,
          pointerEvents: isDragging ? 'none' : 'auto',
        }}
      >
        {rightPanel}
      </div>
    </div>
  );
};

export default ResizablePanel;
