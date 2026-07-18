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

//SubjectField.tsx
import { useState } from 'react';

type SubjectFieldProps = {
  value: string;
  onChange: (subject: string) => void;
};

const SubjectField = ({ value, onChange }: SubjectFieldProps) => {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        borderBottom: isFocused ? '2px solid var(--accent-9)' : '2px solid transparent',
        transition: 'border-bottom 0.2s ease',
        padding: '0 4px',
        marginBottom: '8px',
      }}
    >
      <span
        style={{
          padding: '0 8px',
          // color: isFocused ? 'var(--accent-9)' : '#666',
          // fontWeight: 500,
          transition: 'color 0.2s ease',
          whiteSpace: 'nowrap',
        }}
      >
        Subject:
      </span>
      <input
        type="text"
        placeholder="Subject of the email"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        style={{
          flex: 1,
          border: 'none',
          outline: 'none',
          padding: '8px 4px',
          fontSize: '16px',
          background: 'transparent',
        }}
      />
    </div>
  );
};

export default SubjectField;
