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

import { useEffect, useState } from 'react';
import { useRouter } from '@tanstack/react-router';

export const GlobalLoader = () => {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const unsubscribeBeforeLoad = router.subscribe('onBeforeLoad', () => {
      setIsLoading(true);
    });

    const unsubscribeResolved = router.subscribe('onResolved', () => {
      setIsLoading(false);
    });

    return () => {
      unsubscribeBeforeLoad();
      unsubscribeResolved();
    };
  }, [router]);

  if (!isLoading) return null;

  return (
    <div className="fixed inset-0 bg-[var(--gray-1)]/80 backdrop-blur-md flex items-center justify-center z-[9999]">
      <div className="relative">
        <div className="absolute inset-0 rounded-full">
          <div className="w-16 h-16 border-4 border-[var(--accent-3)] rounded-full animate-ping opacity-75"></div>
        </div>

        <div className="relative w-16 h-16 border-4 border-[var(--gray-4)] border-t-[var(--accent-9)] rounded-full animate-spin"></div>

        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-3 h-3 bg-[var(--accent-9)] rounded-full animate-pulse"></div>
        </div>
      </div>
    </div>
  );
};
