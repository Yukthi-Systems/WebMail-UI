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

// src/components/ui/TourTip.tsx
import { useEffect, useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { useAtom } from 'jotai';
import { atom } from 'jotai';
import { HiXMark, HiLightBulb } from 'react-icons/hi2';
import { tourTipsAtom } from '../../state/tourTips';
import { useSettingsBridge } from '../../hooks/useSettingsBridge';

// Global atom to track which tooltip is currently active
export const activeTourTipAtom = atom<string | null>(null);

interface TourTipProps {
  id: string;
  title: string;
  description: string;
  placement?: 'top' | 'bottom' | 'left' | 'right';
  children: React.ReactNode;
  autoShow?: boolean;
  delay?: number;
  offset?: number;
  className?: string;
  priority?: number; // Lower number = higher priority (shows first)
}

export const TourTip = ({
  id,
  title,
  description,
  placement = 'right',
  children,
  autoShow = true,
  delay = 500,
  offset = 12,
  className = '',
  priority = 0,
}: TourTipProps) => {
  const [tourTips, setTourTips] = useAtom(tourTipsAtom);
  const [activeTourTip, setActiveTourTip] = useAtom(activeTourTipAtom);
  const { updateSettings } = useSettingsBridge();
  const [isVisible, setIsVisible] = useState(false);
  const [showOverlay, setShowOverlay] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const [arrowOffset, setArrowOffset] = useState({ top: '50%', left: '50%' });
  const targetRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

  const isDismissed = tourTips[id]?.dismissed;

  useEffect(() => {
    if (!autoShow || isDismissed) {
      if (!autoShow) setIsVisible(false);
      return;
    }

    const timer = setTimeout(() => {
      // Only show if no other tooltip is active
      if (!activeTourTip) {
        setActiveTourTip(id);
        setShowOverlay(true);
        setIsVisible(true);
        setTimeout(() => setShowOverlay(false), 1000);
      }
    }, delay);

    return () => clearTimeout(timer);
  }, [autoShow, isDismissed, delay, activeTourTip]);

  useEffect(() => {
    if (!isVisible || !targetRef.current || !tooltipRef.current) return;

    const updatePosition = () => {
      const target = targetRef.current!.getBoundingClientRect();
      const tooltip = tooltipRef.current!.getBoundingClientRect();

      let top = 0;
      let left = 0;

      switch (placement) {
        case 'top':
          top = target.top - tooltip.height - offset;
          left = target.left + target.width / 2 - tooltip.width / 2;
          break;
        case 'bottom':
          top = target.bottom + offset;
          left = target.left + target.width / 2 - tooltip.width / 2;
          break;
        case 'left':
          top = target.top + target.height / 2 - tooltip.height / 2;
          left = target.left - tooltip.width - offset;
          break;
        case 'right':
          top = target.top + target.height / 2 - tooltip.height / 2;
          left = target.right + offset;
          break;
      }

      // Apply viewport constraints
      const padding = 12;
      top = Math.max(padding, Math.min(top, window.innerHeight - tooltip.height - padding));
      left = Math.max(padding, Math.min(left, window.innerWidth - tooltip.width - padding));

      setPosition({ top, left });

      // Calculate arrow offset based on target position relative to tooltip
      const targetCenter = {
        x: target.left + target.width / 2,
        y: target.top + target.height / 2,
      };

      let arrowTop = '50%';
      let arrowLeft = '50%';

      if (placement === 'right' || placement === 'left') {
        // Vertical alignment - adjust arrow's top position
        const tooltipTop = top;
        const relativeTargetY = targetCenter.y - tooltipTop;
        arrowTop = `${Math.max(16, Math.min(relativeTargetY, tooltip.height - 16))}px`;
      }

      if (placement === 'top' || placement === 'bottom') {
        // Horizontal alignment - adjust arrow's left position
        const tooltipLeft = left;
        const relativeTargetX = targetCenter.x - tooltipLeft;
        arrowLeft = `${Math.max(16, Math.min(relativeTargetX, tooltip.width - 16))}px`;
      }

      setArrowOffset({ top: arrowTop, left: arrowLeft });
    };

    updatePosition();
    window.addEventListener('resize', updatePosition);
    window.addEventListener('scroll', updatePosition);

    return () => {
      window.removeEventListener('resize', updatePosition);
      window.removeEventListener('scroll', updatePosition);
    };
  }, [isVisible, placement, offset]);

  const handleDismiss = async (shouldSyncToApi: boolean) => {
    setIsVisible(false);
    setShowOverlay(false);

    // Clear active tooltip
    if (activeTourTip === id) {
      setActiveTourTip(null);
    }

    const dismissedAt = new Date().toISOString();

    // 1. ALWAYS update local atom
    setTourTips((prev) => ({
      ...prev,
      [id]: { dismissed: true, dismissedAt },
    }));

    // 2. ONLY update API if 'Don't show again' was clicked
    if (shouldSyncToApi) {
      try {
        await updateSettings((prev) => ({
          tour_tips: {
            ...(prev.tour_tips || {}),
            [id]: { dismissed: true, dismissed_at: dismissedAt },
          },
        }));
      } catch (error) {
        console.error('Failed to save tour tip dismissal to API:', error);
      }
    }
  };

  const getArrowStyles = () => {
    const arrowBase = 'absolute w-3 h-3 bg-[var(--gray-12)]';
    switch (placement) {
      case 'top':
        return `${arrowBase} bottom-[-6px]`;
      case 'bottom':
        return `${arrowBase} top-[-6px]`;
      case 'left':
        return `${arrowBase} right-[-6px]`;
      case 'right':
        return `${arrowBase} left-[-6px]`;
    }
  };

  const getArrowTransform = () => {
    // Separate translation and rotation for clean rendering
    switch (placement) {
      case 'top':
      case 'bottom':
        return 'translateX(-50%) rotate(45deg)';
      case 'left':
      case 'right':
        return 'translateY(-50%) rotate(45deg)';
    }
  };

  return (
    <>
      <div ref={targetRef} className={className}>
        {children}
      </div>

      {isVisible &&
        !isDismissed &&
        createPortal(
          <>
            {showOverlay && (
              <div
                className="fixed inset-0 bg-black/20 z-[9998] transition-opacity duration-300 pointer-events-none"
                style={{ animation: 'fadeOut 1s ease-out forwards' }}
              />
            )}

            <div
              ref={tooltipRef}
              className="fixed z-[9999] max-w-xs w-full"
              style={{
                top: `${position.top}px`,
                left: `${position.left}px`,
                animation: 'scaleIn 0.2s cubic-bezier(0.16, 1, 0.3, 1)',
              }}
            >
              <div className="bg-[var(--gray-12)] text-[var(--gray-1)] rounded-lg shadow-xl overflow-hidden border border-[var(--gray-11)]">
                {/* Arrow with proper positioning */}
                <div
                  className={getArrowStyles()}
                  style={{
                    top:
                      placement === 'right' || placement === 'left' ? arrowOffset.top : undefined,
                    left:
                      placement === 'top' || placement === 'bottom' ? arrowOffset.left : undefined,
                    transform: getArrowTransform(),
                  }}
                />
                <div className="relative z-10 p-4">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 mt-0.5 text-[var(--gray-5)]">
                      <HiLightBulb className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-sm mb-1 text-white">{title}</h3>
                      <p className="text-xs text-[var(--gray-6)] leading-relaxed">{description}</p>
                    </div>
                    <button
                      onClick={() => handleDismiss(false)}
                      className="flex-shrink-0 -mr-1 -mt-1 p-1.5 text-[var(--gray-8)] hover:text-white rounded-full hover:bg-white/10 transition-colors"
                    >
                      <HiXMark className="w-4 h-4" />
                    </button>
                  </div>
                  <div className="flex items-center justify-between mt-4 pt-3 border-t border-white/10">
                    <button
                      onClick={() => handleDismiss(true)}
                      className="text-xs text-[var(--gray-8)] hover:text-white transition-colors"
                    >
                      Don't show again
                    </button>

                    <button
                      onClick={() => handleDismiss(false)}
                      className="text-xs bg-white text-black hover:bg-[var(--gray-4)] px-3 py-1.5 rounded font-medium transition-colors"
                    >
                      Got it
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </>,
          document.body
        )}

      <style>{`
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; } }
        @keyframes scaleIn { from { opacity: 0; transform: scale(0.95); } to { opacity: 1; transform: scale(1); } }
      `}</style>
    </>
  );
};
