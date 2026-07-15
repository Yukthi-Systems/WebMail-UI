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

// ContactCard.tsx
import { FaEdit, FaTrash } from 'react-icons/fa';
import type { Contact } from '../../utils/contact';

interface ContactCardProps {
  contact: Contact;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export function ContactCard({ contact, isSelected, onSelect, onEdit, onDelete }: ContactCardProps) {
  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((part) => part[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div
      className={`bg-[var(--gray-2)] border rounded-lg p-4 transition-colors ${
        isSelected ? 'border-[var(--accent-8)] bg-[var(--accent-3)]' : 'border-[var(--gray-6)]'
      }`}
    >
      <div className="flex items-start gap-3">
        <div className="flex items-center gap-3 flex-1 min-w-0">
          <input
            type="checkbox"
            checked={isSelected}
            onChange={onSelect}
            className="w-4 h-4 text-[var(--accent-9)] bg-[var(--gray-3)] border-[var(--gray-7)] rounded focus:ring-[var(--accent-8)]"
          />

          <div className="flex-shrink-0 w-10 h-10 bg-[var(--accent-9)] rounded-full flex items-center justify-center text-white text-sm font-medium">
            {getInitials(contact.name)}
          </div>

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-[var(--gray-12)] truncate">{contact.name}</h3>
            <p className="text-sm text-[var(--accent-11)] truncate">{contact.email}</p>
            {contact.phone && (
              <p className="text-sm text-[var(--gray-11)] truncate">{contact.phone}</p>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1">
          <button
            onClick={onEdit}
            className="p-2 text-[var(--gray-11)] hover:text-[var(--accent-11)] hover:bg-[var(--gray-4)] rounded transition-colors"
          >
            <FaEdit className="w-4 h-4" />
          </button>
          <button
            onClick={onDelete}
            className="p-2 text-[var(--gray-11)] hover:text-[var(--red-11)] hover:bg-[var(--gray-4)] rounded transition-colors"
          >
            <FaTrash className="w-4 h-4" />
          </button>
        </div>
      </div>

      {contact.notes && (
        <div className="mt-3 pt-3 border-t border-[var(--gray-6)]">
          <p className="text-sm text-[var(--gray-11)] line-clamp-2">{contact.notes}</p>
        </div>
      )}
    </div>
  );
}
