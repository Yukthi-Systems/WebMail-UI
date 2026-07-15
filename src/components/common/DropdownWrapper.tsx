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

import React from 'react';
import { DropdownMenu, Button, Box } from '@radix-ui/themes';

export interface DropdownItem {
  key: string;
  label: string;
  icon?: React.ComponentType<{ size?: number; className?: string; style?: React.CSSProperties }>;
  disabled?: boolean;
  separator?: boolean;
  selected?: boolean;
  color?: string; // Changed to string to support any Radix color
  onSelect?: () => void;
}

interface DropdownWrapperProps {
  items: DropdownItem[];
  trigger?: React.ReactNode;
  disabled?: boolean;
  className?: string;
}

const DropdownWrapper: React.FC<DropdownWrapperProps> = ({
  items,
  trigger,
  disabled = false,
  className = '',
}) => {
  const getColorClasses = (color?: string) => {
    if (!color || color === 'default') {
      return {
        text: 'text-[var(--gray-12)]',
        icon: 'text-[var(--gray-11)]',
        hover: 'hover:bg-[var(--gray-3)] hover:text-[var(--gray-12)]',
      };
    }

    // Support any Radix color
    return {
      text: `text-[var(--${color}-11)]`,
      icon: `text-[var(--${color}-11)]`,
      hover: `hover:bg-[var(--${color}-3)] hover:text-[var(--${color}-12)]`,
    };
  };

  const getIconColor = (item: DropdownItem) => {
    if (item.disabled) {
      return 'var(--gray-8)';
    }

    if (item.color && item.color !== 'default') {
      return `var(--${item.color}-9)`;
    }

    return undefined; // Let CSS classes handle it
  };

  return (
    <Box className={className}>
      <DropdownMenu.Root>
        {trigger ? (
          <DropdownMenu.Trigger {...({ asChild: true } as any)}>{trigger}</DropdownMenu.Trigger>
        ) : (
          <DropdownMenu.Trigger>
            <Button variant="soft" disabled={disabled}>
              Select
            </Button>
          </DropdownMenu.Trigger>
        )}
        <DropdownMenu.Content className="bg-[var(--color-panel-solid)] border border-[var(--gray-6)] shadow-lg">
          <div className="max-h-[350px] overflow-auto py-1">
            {items.map((item, index) => (
              <React.Fragment key={item.key}>
                {item.separator && index > 0 && (
                  <DropdownMenu.Separator className="h-px bg-[var(--gray-6)] mx-2 my-1" />
                )}
                {!item.separator && (
                  <DropdownMenu.Item
                    disabled={item.disabled}
                    onSelect={item.onSelect}
                    className={`
                      px-2 py-1.5 mx-1 rounded-md
                      transition-colors duration-200 hover:!bg-[var(--accent-5)]
                      cursor-pointer
                      ${item.disabled ? 'opacity-50 cursor-not-allowed' : ''}
                      ${item.selected ? 'bg-[var(--accent-3)] text-[var(--accent-12)]' : ''}
                      ${!item.selected && !item.disabled ? getColorClasses(item.color).hover : ''}
                    `}
                  >
                    <div className="flex items-center justify-between w-full">
                      <div className="flex items-center gap-2">
                        {item.icon && (
                          <item.icon
                            size={14}
                            className={`
                              transition-colors duration-200
                              ${!getIconColor(item) ? getColorClasses(item.color).icon : ''}
                            `}
                            style={{
                              color: getIconColor(item),
                            }}
                          />
                        )}
                        <span
                          className={`
                            transition-colors duration-200
                            ${item.disabled ? 'text-[var(--gray-8)]' : getColorClasses(item.color).text}
                          `}
                        >
                          {item.label}
                        </span>
                      </div>
                      {item.selected && (
                        <span className="text-[var(--accent-9)] font-medium">✓</span>
                      )}
                    </div>
                  </DropdownMenu.Item>
                )}
              </React.Fragment>
            ))}
          </div>
        </DropdownMenu.Content>
      </DropdownMenu.Root>
    </Box>
  );
};

export default DropdownWrapper;
