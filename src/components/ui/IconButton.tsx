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

import { IconButton, Button, Tooltip } from '@radix-ui/themes';
import type { ReactElement } from 'react';

interface CustomIconButtonProps {
  variant?: 'solid' | 'soft' | 'outline' | 'ghost';
  size?: '1' | '2' | '3' | '4';
  onClick: () => void;
  ariaLabel: string;
  icon: ReactElement;
  text?: string;
  title?: string; // Tooltip text
  color?:
    | 'gray'
    | 'gold'
    | 'bronze'
    | 'brown'
    | 'yellow'
    | 'amber'
    | 'orange'
    | 'tomato'
    | 'red'
    | 'ruby'
    | 'crimson'
    | 'pink'
    | 'plum'
    | 'purple'
    | 'violet'
    | 'iris'
    | 'indigo'
    | 'blue'
    | 'cyan'
    | 'teal'
    | 'jade'
    | 'green'
    | 'grass'
    | 'lime'
    | 'mint'
    | 'sky';
  disabled?: boolean;
  style?: React.CSSProperties;
  className?: string;
  onMouseEnter?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onMouseLeave?: (e: React.MouseEvent<HTMLButtonElement>) => void;
}

const CustomIconButton = ({
  variant = 'ghost',
  size = '2',
  onClick,
  ariaLabel,
  icon,
  text,
  title,
  color,
  disabled = false,
  style = {},
  className,
  onMouseEnter,
  onMouseLeave,
}: CustomIconButtonProps) => {
  const buttonWithText = (
    <Button
      variant={variant}
      size={size}
      onClick={onClick}
      aria-label={ariaLabel}
      color={color}
      disabled={disabled}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '6px',
        padding: '8px 12px',
        borderRadius: '8px',
        fontSize: '14px',
        fontWeight: '500',
        transition: 'all 0.15s ease',
        border: 'none',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon}
      {text}
    </Button>
  );

  const iconOnlyButton = (
    <IconButton
      variant={variant}
      size={size}
      onClick={onClick}
      aria-label={ariaLabel}
      color={color}
      disabled={disabled}
      style={{
        borderRadius: '8px',
        transition: 'all 0.15s ease',
        cursor: disabled ? 'not-allowed' : 'pointer',
        ...style,
      }}
      className={className}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
    >
      {icon}
    </IconButton>
  );

  // Choose which button to render
  const buttonElement = text ? buttonWithText : iconOnlyButton;

  // Wrap with tooltip if title is provided and not disabled
  if (title && !disabled) {
    return (
      <Tooltip content={title} side="top" sideOffset={5}>
        {buttonElement}
      </Tooltip>
    );
  }

  return buttonElement;
};

export default CustomIconButton;
