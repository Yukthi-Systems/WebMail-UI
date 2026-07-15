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

import { useEffect, useRef, useState, useId } from 'react';
import { FaXmark, FaExpand, FaCompress, FaMinus } from 'react-icons/fa6';
import { Button } from '@radix-ui/themes';
import { MdRestartAlt } from 'react-icons/md';
import { useMinimizedModals } from '../common/MinimizedModalContext';
import { useIsMobile } from '../../hooks/use-mobile';

interface CustomModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  isFullView?: boolean;
  onToggleFullView?: () => void;
  position?: 'center' | 'bottom-right';
  blocking?: boolean;
  draggable?: boolean;
}

const CustomModal = ({
  isOpen,
  onClose,
  title,
  children,
  footer,
  isFullView = false,
  onToggleFullView,
  position = 'center',
  blocking = true,
  draggable = true,
}: CustomModalProps) => {
  const modalRef = useRef<HTMLDivElement>(null);
  const [modalPosition, setModalPosition] = useState({ x: 0, y: 0 });
  const [isMinimized, setIsMinimized] = useState(false);
  const isDraggingRef = useRef(false); // ← ref, not state
  const modalId = useId();
  const { register, unregister } = useMinimizedModals();
  const isMobile = useIsMobile();

  const dragCache = useRef({
    startX: 0,
    startY: 0,
    initialModalX: 0,
    initialModalY: 0,
    rect: null as DOMRect | null,
    headerHeight: 60,
    viewportW: 0,
    viewportH: 0,
    lastValidX: 0,
    lastValidY: 0,
  });

  useEffect(() => {
    if (isMinimized && isOpen) {
      register({
        id: modalId,
        title,
        onRestore: () => setIsMinimized(false),
        onClose: onClose,
      });
    } else {
      unregister(modalId);
    }
    return () => unregister(modalId);
  }, [isMinimized, isOpen, title]);

  useEffect(() => {
    if (isFullView) {
      setModalPosition({ x: 0, y: 0 });
      setIsMinimized(false);
    }
  }, [isFullView]);

  useEffect(() => {
    if (isOpen && blocking && !isMinimized) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, blocking, isMinimized]);

  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen && !isMinimized) onClose();
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isOpen, onClose, isMinimized]);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!draggable || isFullView || isMinimized || !modalRef.current) return;

    isDraggingRef.current = true;

    const rect = modalRef.current.getBoundingClientRect();
    const headerElement = modalRef.current.firstElementChild as HTMLElement;

    dragCache.current = {
      startX: e.clientX,
      startY: e.clientY,
      initialModalX: modalPosition.x,
      initialModalY: modalPosition.y,
      lastValidX: modalPosition.x,
      lastValidY: modalPosition.y,
      rect,
      headerHeight: headerElement?.offsetHeight || 60,
      viewportW: window.innerWidth,
      viewportH: window.innerHeight,
    };

    // Disable transition immediately via DOM (no re-render)
    modalRef.current.style.transition = 'none';

    // Seed the transform so there's no jump on first mousemove
    const prefix = position === 'center' ? 'translate(-50%, -50%)' : 'translate(0, 0)';
    modalRef.current.style.transform = `${prefix} translate(${modalPosition.x}px, ${modalPosition.y}px)`;

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!modalRef.current || !isDraggingRef.current) return;

    const {
      startX,
      startY,
      initialModalX,
      initialModalY,
      rect,
      headerHeight,
      viewportW,
      viewportH,
    } = dragCache.current;

    if (!rect) return;

    const deltaX = e.clientX - startX;
    const deltaY = e.clientY - startY;

    const proposedVisualTop = rect.top + deltaY;
    const proposedVisualLeft = rect.left + deltaX;

    let finalY = initialModalY + deltaY;
    if (proposedVisualTop < 0) {
      finalY = initialModalY - rect.top;
    } else if (proposedVisualTop > viewportH - headerHeight) {
      finalY = initialModalY - rect.top + (viewportH - headerHeight);
    }

    let finalX = initialModalX + deltaX;
    const proposedVisualRight = proposedVisualLeft + rect.width;
    if (proposedVisualRight > viewportW) {
      finalX = initialModalX + (viewportW - rect.right);
    } else if (proposedVisualLeft < -(rect.width * 0.7)) {
      const limit = -(rect.width * 0.7);
      finalX = initialModalX + (limit - rect.left);
    }

    const prefix = position === 'center' ? 'translate(-50%, -50%)' : 'translate(0, 0)';
    modalRef.current.style.transform = `${prefix} translate(${finalX}px, ${finalY}px)`;

    dragCache.current.lastValidX = finalX;
    dragCache.current.lastValidY = finalY;
  };

  const handleMouseUp = () => {
    isDraggingRef.current = false;
    document.removeEventListener('mousemove', handleMouseMove);
    document.removeEventListener('mouseup', handleMouseUp);

    const { lastValidX, lastValidY, initialModalX, initialModalY } = dragCache.current;

    // Restore transition via DOM before React re-renders
    if (modalRef.current) {
      modalRef.current.style.transition = '';
      modalRef.current.style.transform = ''; // let React take over
    }

    if (lastValidX !== initialModalX || lastValidY !== initialModalY) {
      setModalPosition({ x: lastValidX, y: lastValidY });
    }
  };

  const getContainerClasses = () => {
    const baseClasses =
      'fixed bg-[var(--color-background)] rounded-lg z-[9999] flex flex-col' +
      ' shadow-[0_-4px_24px_-2px_rgba(0,0,0,0.18),0_8px_32px_-4px_rgba(0,0,0,0.18),0_0_0_1px_rgba(0,0,0,0.06)]';
    if (isMinimized) return 'hidden';
    if (isMobile) {
      return `${baseClasses} w-screen h-screen top-0 left-0 rounded-none`;
    }
    if (isFullView) {
      return `${baseClasses} w-[95vw] max-h-[90vh] top-1/2 left-1/2 transition-all duration-300 ease-in-out`;
    }
    const posClass = position === 'bottom-right' ? 'bottom-5 right-5' : 'top-1/2 left-1/2';
    // Always include transition — during drag we disable it directly on the DOM element
    return `${baseClasses} transition-all duration-300 ease-in-out w-[95vw] lg:w-[950px] max-h-[90vh] ${posClass}`;
  };

  const getTransform = () => {
    if (isMobile) return 'none';
    if (isFullView) return 'translate(-50%, -50%)';
    if (isMinimized) return 'translate(0, 0)';
    if (position === 'center') {
      return `translate(-50%, -50%) translate(${modalPosition.x}px, ${modalPosition.y}px)`;
    }
    return `translate(${modalPosition.x}px, ${modalPosition.y}px)`;
  };

  const handleResetPosition = (e: React.MouseEvent) => {
    e.stopPropagation();
    setModalPosition({ x: 0, y: 0 });
  };

  const toggleMinimize = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsMinimized((prev) => !prev);
  };

  if (!isOpen) return null;

  return (
    <>
      {blocking && !isMinimized && (
        <div className="fixed inset-0 bg-black/50 z-[9998] animate-fadeIn" onClick={onClose} />
      )}
      <div
        ref={modalRef}
        className={getContainerClasses()}
        style={{ transform: getTransform(), opacity: 1 }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className={`px-5 py-4 border-b border-[var(--gray-5)] flex items-center justify-between shrink-0 shadow-[0_1px_4px_rgba(0,0,0,0.08)]
            ${draggable && !isFullView ? 'cursor-move' : ''}`}
          onMouseDown={handleMouseDown}
        >
          <h2 className="text-lg font-semibold m-0 select-none truncate pr-4">{title}</h2>
          <div className="flex gap-4 items-center">
            {!isFullView && (
              <Button
                variant="ghost"
                size="1"
                onClick={toggleMinimize}
                onMouseDown={(e) => e.stopPropagation()}
                title="Minimize"
              >
                <FaMinus size={16} />
              </Button>
            )}
            {!isFullView && (modalPosition.x !== 0 || modalPosition.y !== 0) && (
              <Button
                variant="ghost"
                size="2"
                onClick={handleResetPosition}
                onMouseDown={(e) => e.stopPropagation()}
                title="Reset position"
              >
                <MdRestartAlt size={20} />
              </Button>
            )}
            {onToggleFullView && !isMobile && (
              <Button
                variant="ghost"
                size="1"
                onClick={onToggleFullView}
                onMouseDown={(e) => e.stopPropagation()}
                title={isFullView ? 'Compress' : 'Expand'}
              >
                {isFullView ? <FaCompress size={16} /> : <FaExpand size={16} />}
              </Button>
            )}
            <Button
              variant="ghost"
              size="1"
              onClick={onClose}
              onMouseDown={(e) => e.stopPropagation()}
              color="red"
              title="Close"
            >
              <FaXmark size={20} />
            </Button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto px-5 py-4 min-h-0 animate-fadeIn">{children}</div>
        {footer && (
          <div className="px-5 py-3 border-t border-[var(--gray-5)] bg-[var(--gray-1)] rounded-b-lg shrink-0">
            {footer}
          </div>
        )}
      </div>
      <style>{`
        @keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
        .animate-fadeIn { animation: fadeIn 0.2s ease-out; }
      `}</style>
    </>
  );
};

export default CustomModal;
