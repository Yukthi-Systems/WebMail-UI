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

import { Checkbox } from '@radix-ui/themes';
import { FaEdit, FaTrash } from 'react-icons/fa';
import type { Contact } from '../../utils/contact';
import { userSettingsAtom } from '../../state/settings';
import { useAtomValue } from 'jotai';

interface ContactTableProps {
  contacts: Contact[];
  selectedContacts: number[];
  toggleSelectContact: (contactId: number) => void;
  toggleSelectAll: () => void;
  onEdit: (contact: Contact) => void;
  onDelete: (contact: Contact) => void;
}

export const ContactTable = ({
  contacts,
  selectedContacts,
  toggleSelectContact,
  toggleSelectAll,
  onEdit,
  onDelete,
}: ContactTableProps) => {
  const userSettings = useAtomValue(userSettingsAtom);
  const {
    show_name = true,
    show_email = true,
    show_phone = true,
    show_notes = true,
  } = userSettings?.contacts ?? {};

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse">
        <thead className="bg-[var(--gray-2)] sticky top-0 z-10">
          <tr className="border-b border-[var(--gray-5)]">
            <th className="w-10 px-4 py-3 text-left">
              <Checkbox
                checked={selectedContacts.length === contacts.length && contacts.length > 0}
                onCheckedChange={toggleSelectAll}
              />
            </th>
            {show_name && (
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--gray-12)]">
                Name
              </th>
            )}
            {show_email && (
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--gray-12)]">
                Email
              </th>
            )}
            {show_phone && (
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--gray-12)]">
                Phone
              </th>
            )}
            {show_notes && (
              <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--gray-12)]">
                Notes
              </th>
            )}
            <th className="px-4 py-3 text-left text-sm font-semibold text-[var(--gray-12)] w-32">
              Actions
            </th>
          </tr>
        </thead>

        <tbody>
          {contacts.map((contact, index) => (
            <tr
              key={contact.contact_id}
              className={`
                border-b border-[var(--gray-5)] hover:bg-[var(--gray-2)] transition-colors
                ${index % 2 === 0 ? 'bg-[var(--gray-1)]' : 'bg-[var(--gray-1)]'}
              `}
            >
              <td className="px-4 py-1">
                <Checkbox
                  checked={selectedContacts.includes(contact.contact_id)}
                  onCheckedChange={() => toggleSelectContact(contact.contact_id)}
                />
              </td>
              {show_name && (
                <td className="px-4 py-1 text-sm text-[var(--gray-12)]">{contact.name}</td>
              )}
              {show_email && (
                <td className="px-4 py-1 text-sm text-[var(--gray-11)]">{contact.email}</td>
              )}
              {show_phone && (
                <td className="px-4 py-1 text-sm text-[var(--gray-11)]">{contact.phone}</td>
              )}
              {show_notes && (
                <td className="px-4 py-1 text-sm text-[var(--gray-11)] max-w-[200px]">
                  <div className="truncate">{contact.notes}</div>
                </td>
              )}
              <td className="px-4 py-1">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onEdit(contact)}
                    className="p-2 text-[var(--gray-11)] hover:text-[var(--accent-11)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
                    title="Edit"
                  >
                    <FaEdit className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onDelete(contact)}
                    className="p-2 text-[var(--gray-11)] hover:text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-md transition-colors"
                    title="Delete"
                  >
                    <FaTrash className="w-3.5 h-3.5" />
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};
