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

import { useState, useEffect } from 'react';

/**
 * Custom hook to track window width Returns the current window width and
 * updates on resize Includes debouncing for performance optimization.
 */
export const useWindowWidth = (): number => {
  const [windowWidth, setWindowWidth] = useState<number>(() => {
    // Initialize with current window width
    if (typeof window !== 'undefined') {
      return window.innerWidth;
    }
    return 0; // Default for SSR
  });

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    let timeoutId: NodeJS.Timeout | null = null;

    const handleResize = () => {
      // Debounce resize events for better performance
      if (timeoutId) {
        clearTimeout(timeoutId);
      }

      timeoutId = setTimeout(() => {
        setWindowWidth(window.innerWidth);
      }, 150); // 150ms debounce
    };

    // Add event listener
    window.addEventListener('resize', handleResize);

    // Cleanup
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  return windowWidth;
};

/**
 * Hook with additional breakpoint helpers Returns width and common breakpoint
 * booleans.
 */
export const useWindowSize = () => {
  const width = useWindowWidth();

  return {
    width,
    isMobile: width < 768,
    isTablet: width >= 768 && width < 1024,
    isDesktop: width >= 1024,
    isSmall: width < 640,
    isMedium: width >= 640 && width < 1024,
    isLarge: width >= 1024 && width < 1280,
    isXLarge: width >= 1280,
  };
};

export default useWindowWidth;
