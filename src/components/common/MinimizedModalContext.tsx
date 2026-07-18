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

import { useState, useCallback } from 'react';
import { FaXmark } from 'react-icons/fa6';
import { MinimizedModalsContext, type MinimizedModal } from './minimizedModalsContext';

export const MinimizedModalsProvider = ({ children }: { children: React.ReactNode }) => {
  const [minimizedModals, setMinimizedModals] = useState<MinimizedModal[]>([]);

  const register = useCallback((modal: MinimizedModal) => {
    setMinimizedModals((prev) => (prev.find((m) => m.id === modal.id) ? prev : [...prev, modal]));
  }, []);

  const unregister = useCallback((id: string) => {
    setMinimizedModals((prev) => prev.filter((m) => m.id !== id));
  }, []);

  return (
    <MinimizedModalsContext.Provider value={{ minimizedModals, register, unregister }}>
      {children}

      {/* Global bottom tab bar */}
      {minimizedModals.length > 0 && (
        <div className="fixed bottom-0 right-4 z-[10000] flex items-end gap-2">
          {minimizedModals.map((modal) => (
            <div
              key={modal.id}
              className="flex items-center gap-2 bg-[var(--gray-3)] border border-[var(--gray-5)] 
                         border-b-0 rounded-t-lg px-3 py-2 shadow-lg min-w-[200px] max-w-[280px]
                         cursor-pointer hover:bg-[var(--gray-4)] transition-colors group"
              onClick={modal.onRestore}
            >
              <span className="text-sm font-medium text-[var(--gray-12)] truncate flex-1">
                {modal.title}
              </span>
              <button
                className="text-[var(--gray-10)] hover:text-[var(--red-9)] transition-colors flex-shrink-0"
                onClick={(e) => {
                  e.stopPropagation();
                  modal.onClose();
                }}
              >
                <FaXmark size={12} />
              </button>
            </div>
          ))}
        </div>
      )}
    </MinimizedModalsContext.Provider>
  );
};
