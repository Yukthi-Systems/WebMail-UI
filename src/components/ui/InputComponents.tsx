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

import { TextField } from '@radix-ui/themes';
import { useFormContext } from 'react-hook-form';

interface InputProps {
  label?: string;
  type?:
    | 'date'
    | 'datetime-local'
    | 'email'
    | 'hidden'
    | 'month'
    | 'number'
    | 'password'
    | 'search'
    | 'tel'
    | 'text'
    | 'time'
    | 'url'
    | 'week';
  name: string;
  customStyle?: string;
  disabled?: boolean;
  placeholder?: string;
  variant?: 'surface' | 'classic' | 'soft';
  size?: '1' | '2' | '3';
}

export function Input({
  label = '',
  type = 'text',
  name,
  customStyle = '',
  disabled = false,
  placeholder = '',
  variant = 'surface',
  size = '2',
}: InputProps) {
  const {
    register,
    formState: { errors },
  } = useFormContext();

  // Helper function to get nested errors
  const getNestedError = (obj: unknown, path: string) => {
    return path
      .split('.')
      .reduce((o, key) => (o ? (o as Record<string, unknown>)[key] : undefined), obj);
  };

  const error = getNestedError(errors, name) as { message?: string } | undefined;

  return (
    <div className={`${customStyle} w-full mb-3`}>
      {label && (
        <label htmlFor={name} className="block text-left text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <TextField.Root
        id={name}
        type={type}
        disabled={disabled}
        placeholder={placeholder}
        variant={error ? 'soft' : variant}
        color={error ? 'red' : undefined}
        size={size}
        className="w-full"
        {...register(name)}
      />
      {error && <p className="text-sm text-red-500 mt-1">{error.message}</p>}
    </div>
  );
}
