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

import { Box, Flex, Text, Button, Card } from '@radix-ui/themes';

interface ToastProps {
  open: boolean;
  onClose: () => void;
  title: string;
  description: string;
  variant?: 'error' | 'success' | 'warning' | 'info';
}

const Toast = ({ open, onClose, title, description, variant = 'error' }: ToastProps) => {
  if (!open) return null;

  const getVariantStyles = () => {
    switch (variant) {
      case 'error':
        return {
          backgroundColor: 'var(--red-3)',
          border: '1px solid var(--red-6)',
          titleColor: 'var(--red-11)',
          textColor: 'var(--red-11)',
        };
      case 'success':
        return {
          backgroundColor: 'var(--green-3)',
          border: '1px solid var(--green-6)',
          titleColor: 'var(--green-11)',
          textColor: 'var(--green-11)',
        };
      case 'warning':
        return {
          backgroundColor: 'var(--yellow-3)',
          border: '1px solid var(--yellow-6)',
          titleColor: 'var(--yellow-11)',
          textColor: 'var(--yellow-11)',
        };
      case 'info':
        return {
          backgroundColor: 'var(--blue-3)',
          border: '1px solid var(--blue-6)',
          titleColor: 'var(--blue-11)',
          textColor: 'var(--blue-11)',
        };
      default:
        return {
          backgroundColor: 'var(--red-3)',
          border: '1px solid var(--red-6)',
          titleColor: 'var(--red-11)',
          textColor: 'var(--red-11)',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <Box
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        zIndex: 1000,
        minWidth: '300px',
        maxWidth: '400px',
      }}
    >
      <Card
        style={{
          backgroundColor: styles.backgroundColor,
          border: styles.border,
          padding: '16px',
        }}
      >
        <Flex direction="column" gap="2">
          <Flex justify="between" align="start">
            <Text weight="bold" size="3" style={{ color: styles.titleColor }}>
              {title}
            </Text>
            <Button variant="ghost" size="1" onClick={onClose} style={{ color: styles.titleColor }}>
              ✕
            </Button>
          </Flex>
          <Text size="2" style={{ color: styles.textColor }}>
            {description}
          </Text>
        </Flex>
      </Card>
    </Box>
  );
};

export default Toast;
