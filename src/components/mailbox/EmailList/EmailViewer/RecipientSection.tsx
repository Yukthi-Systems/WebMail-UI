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

import { useState, useRef, useLayoutEffect } from 'react';
import { ContextMenu } from '@radix-ui/themes';
import { getInitialName } from '../../../../utils/emailUtils';
import { useToast } from '../../../../hooks/useToast';

interface Recipient {
  name: string;
  email: string;
  original: string;
}

interface RecipientSectionProps {
  recipients: Recipient[];
  label: string;
  className?: string;
  maxLines?: number;
}

export const RecipientSection = ({
  recipients,
  label,
  className = '',
  maxLines = 2,
}: RecipientSectionProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showButton, setShowButton] = useState(false);
  const textContainerRef = useRef<HTMLDivElement>(null);
  const toast = useToast();

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast.success({ description: 'Email address copied' });
  };

  useLayoutEffect(() => {
    const checkOverflow = () => {
      const el = textContainerRef.current;
      if (!el) return;

      if (!isExpanded) {
        // Check if content is actually overflowing
        const isOverflowing = el.scrollHeight > el.clientHeight + 1;
        setShowButton(isOverflowing);
      } else {
        // If expanded, keep button visible so user can collapse it
        setShowButton(true);
      }
    };

    checkOverflow();
    window.addEventListener('resize', checkOverflow);
    return () => window.removeEventListener('resize', checkOverflow);
  }, [recipients, isExpanded, maxLines]);

  const handleToggle = (e: React.MouseEvent) => {
    e.stopPropagation();

    // GUARD: If the button isn't shown (text fits), don't allow toggling
    if (!showButton && !isExpanded) return;

    // Prevent toggle if user is selecting text to copy
    const selection = window.getSelection();
    if (selection && selection.toString().length > 0) return;

    setIsExpanded(!isExpanded);
  };

  if (recipients.length === 0) return null;

  const recipientList = recipients.map((recipient, index) => (
    <span key={index}>
      <ContextMenu.Root>
        <ContextMenu.Trigger>
          <span className="cursor-default hover:text-[var(--gray-12)] rounded px-0.5 -mx-0.5 transition-colors">
            {getInitialName(recipient.name) || recipient.email}
            {recipient.name && recipient.email && (
              <span className="text-[var(--gray-10)]"> &lt;{recipient.email}&gt;</span>
            )}
          </span>
        </ContextMenu.Trigger>
        <ContextMenu.Content size="1">
          <ContextMenu.Item shortcut="" onClick={() => handleCopy(recipient.email)}>
            Copy email address
          </ContextMenu.Item>
        </ContextMenu.Content>
      </ContextMenu.Root>
      {index < recipients.length - 1 && ', '}
    </span>
  ));

  return (
    <div
      // Only show pointer cursor if the section is expandable (showButton is true)
      className={`flex items-baseline gap-1 text-sm group ${
        showButton ? 'cursor-pointer' : ''
      } ${className}`}
      onClick={handleToggle}
    >
      <span className="shrink-0 text-[var(--gray-11)] font-medium select-none">{label}:</span>

      <div className="relative flex-1 min-w-0">
        <div
          ref={textContainerRef}
          className="break-words text-[var(--gray-12)] transition-all duration-200"
          style={
            !isExpanded
              ? {
                  display: '-webkit-box',
                  WebkitLineClamp: maxLines,
                  WebkitBoxOrient: 'vertical',
                  overflow: 'hidden',
                  wordBreak: 'break-all', // ← add this
                }
              : {}
          }
        >
          {recipientList}
        </div>

        {showButton && (
          <div className="absolute bottom-0 right-0 flex items-center">
            {/* Gradient Mask: Fades out text when collapsed */}
            {!isExpanded && (
              <div
                className="w-12 h-[1.5em] pointer-events-none"
                style={{
                  background:
                    'linear-gradient(to right, transparent, var(--color-panel-solid) 80%)',
                }}
              />
            )}

            {/* Toggle Indicator */}
            <span className="bg-[var(--color-panel-solid)] pl-1 text-xs font-medium text-[var(--accent-9)] group-hover:text-[var(--accent-10)] group-hover:underline whitespace-nowrap select-none">
              {isExpanded ? 'Show less' : 'Show more'}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
