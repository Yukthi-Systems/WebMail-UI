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

import { Flex, TextField, Button, Table, Dialog } from '@radix-ui/themes';
import { FaPlus, FaTrash, FaTimes } from 'react-icons/fa';
import DropdownWrapper from '../common/DropdownWrapper';
import type { CreateContactData } from '../../utils/contact';
import { useState, useEffect } from 'react';
import { FaEllipsisVertical } from 'react-icons/fa6';

interface BulkCreateViewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contacts: Partial<CreateContactData>[];
  onUpdate: (index: number, field: keyof CreateContactData, value: string) => void;
  onAdd: () => void;
  onRemove: (index: number) => void;
  onSave: () => void;
  isLoading?: boolean;
  onDuplicate: (index: number) => void;
}

export const BulkCreateView = ({
  open,
  onOpenChange,
  contacts,
  onUpdate,
  onAdd,
  onDuplicate,
  onRemove,
  onSave,
  isLoading = false,
}: BulkCreateViewProps) => {
  const [validationErrors, setValidationErrors] = useState<{
    [key: number]: { [field: string]: string };
  }>({});

  // Update the useEffect validation logic
  useEffect(() => {
    const errors: { [key: number]: { [field: string]: string } } = {};

    // Create a map to track email occurrences
    const emailOccurrences = new Map<string, number[]>();

    contacts.forEach((contact, index) => {
      const email = contact.email?.trim().toLowerCase();
      if (email && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        if (!emailOccurrences.has(email)) {
          emailOccurrences.set(email, []);
        }
        emailOccurrences.get(email)?.push(index);
      }
    });

    contacts.forEach((contact, index) => {
      const contactErrors: { [field: string]: string } = {};
      const email = contact.email?.trim();

      // Name validation
      if (!contact.name?.trim()) {
        contactErrors.name = 'Name is required';
      }

      // Email validation
      if (!email) {
        contactErrors.email = 'Email is required';
      } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
        contactErrors.email = 'Invalid email format';
      } else {
        // Check for duplicate emails (case-insensitive)
        const normalizedEmail = email.toLowerCase();
        const duplicateIndices = emailOccurrences.get(normalizedEmail) || [];
        if (duplicateIndices.length > 1 && duplicateIndices.includes(index)) {
          contactErrors.email = 'Email is duplicated in another row';
        }
      }

      // Phone validation
      if (
        contact.phone &&
        !/^[+]?[1-9][\d]{0,15}$/.test(contact.phone.replace(/[\s\-()]/g, ''))
      ) {
        contactErrors.phone = 'Invalid phone format';
      }

      if (Object.keys(contactErrors).length > 0) {
        errors[index] = contactErrors;
      }
    });

    setValidationErrors(errors);
  }, [contacts]);

  const handleSave = () => {
    if (Object.keys(validationErrors).length === 0) {
      onSave();
    }
  };

  const getActionsDropdownItems = (index: number) => [
    {
      key: 'duplicate',
      label: 'Duplicate Row',
      icon: FaPlus,
      color: 'blue',
      onSelect: () => onDuplicate(index),
    },
    {
      key: 'separator',
      label: '',
      separator: true,
    },
    {
      key: 'remove',
      label: 'Remove Row',
      icon: FaTrash,
      color: 'red',
      disabled: contacts.length <= 1,
      onSelect: () => onRemove(index),
    },
  ];

  const validContacts = contacts.filter((contact, index) => {
    const hasRequiredFields = contact.name?.trim() && contact.email?.trim();
    const hasNoErrors = !validationErrors[index];
    return hasRequiredFields && hasNoErrors;
  });
  const hasValidationErrors = Object.keys(validationErrors).length > 0;

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content
        size="4"
        style={{
          width: '95vw',
          maxWidth: '1400px',
          height: '85vh',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* Header */}
        <Flex justify="between" align="center" mb="4" style={{ flexShrink: 0 }}>
          <div>
            <Dialog.Title className="text-xl font-semibold">Bulk Create Contacts</Dialog.Title>
            <p className="text-sm text-[var(--gray-11)] mt-1">
              Add multiple contacts efficiently with validation and smart features
            </p>
          </div>
          <Button variant="ghost" onClick={() => onOpenChange(false)} size="2">
            <FaTimes />
          </Button>
        </Flex>

        {/* Status Bar */}
        <div className="flex items-center justify-between mb-4 text-sm" style={{ flexShrink: 0 }}>
          <div className="flex items-center gap-4">
            <span className="text-[var(--gray-11)]">
              <strong>{contacts.length}</strong> row{contacts.length !== 1 ? 's' : ''}
            </span>
            <span className="text-[var(--green-11)]">
              <strong>{validContacts.length}</strong> valid contact
              {validContacts.length !== 1 ? 's' : ''}
            </span>
            {hasValidationErrors && (
              <span className="text-[var(--red-11)]">
                <strong>{Object.keys(validationErrors).length}</strong> row
                {Object.keys(validationErrors).length !== 1 ? 's' : ''} with errors
              </span>
            )}
          </div>

          <Button onClick={onAdd} disabled={isLoading} variant="soft" size="2">
            <FaPlus className="w-3 h-3 mr-2" />
            Add Row
          </Button>
        </div>

        {/* Table Container with better scrolling */}
        <div className="flex-1 border border-[var(--gray-6)] rounded-lg overflow-hidden bg-[var(--gray-1)] mb-4">
          <div className="overflow-auto h-full">
            <Table.Root>
              <Table.Header className="sticky top-0 bg-[var(--gray-2)] z-10">
                <Table.Row>
                  <Table.ColumnHeaderCell className="font-semibold text-[var(--gray-12)] min-w-[200px]">
                    Name <span className="text-red-500">*</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="font-semibold text-[var(--gray-12)] min-w-[250px]">
                    Email <span className="text-red-500">*</span>
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="font-semibold text-[var(--gray-12)] min-w-[180px]">
                    Phone
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="font-semibold text-[var(--gray-12)] min-w-[200px]">
                    Notes
                  </Table.ColumnHeaderCell>
                  <Table.ColumnHeaderCell className="font-semibold text-[var(--gray-12)] w-[100px]">
                    Actions
                  </Table.ColumnHeaderCell>
                </Table.Row>
              </Table.Header>

              <Table.Body>
                {contacts.map((contact, index) => {
                  const rowErrors = validationErrors[index] || {};
                  const hasRowErrors = Object.keys(rowErrors).length > 0;

                  return (
                    <Table.Row
                      key={index}
                      className={`hover:bg-[var(--gray-1)] ${hasRowErrors ? 'bg-[var(--red-1)]' : ''}`}
                    >
                      <Table.Cell className="p-2">
                        <div className="space-y-1">
                          <TextField.Root
                            placeholder="Enter full name"
                            value={contact.name || ''}
                            onChange={(e) => onUpdate(index, 'name', e.target.value)}
                            className={rowErrors.name ? 'border-[var(--red-7)]' : ''}
                          />
                          {rowErrors.name && (
                            <p className="text-xs text-[var(--red-11)]">{rowErrors.name}</p>
                          )}
                        </div>
                      </Table.Cell>

                      <Table.Cell className="p-2">
                        <div className="space-y-1">
                          <TextField.Root
                            placeholder="email@example.com"
                            type="email"
                            value={contact.email || ''}
                            onChange={(e) => onUpdate(index, 'email', e.target.value)}
                            className={rowErrors.email ? 'border-[var(--red-7)]' : ''}
                          />
                          {rowErrors.email && (
                            <p className="text-xs text-[var(--red-11)]">{rowErrors.email}</p>
                          )}
                        </div>
                      </Table.Cell>

                      <Table.Cell className="p-2">
                        <div className="space-y-1">
                          <TextField.Root
                            placeholder="+1 234 567 8900"
                            value={contact.phone || ''}
                            onChange={(e) => onUpdate(index, 'phone', e.target.value)}
                            className={rowErrors.phone ? 'border-[var(--red-7)]' : ''}
                          />
                          {rowErrors.phone && (
                            <p className="text-xs text-[var(--red-11)]">{rowErrors.phone}</p>
                          )}
                        </div>
                      </Table.Cell>

                      <Table.Cell className="p-2">
                        <TextField.Root
                          placeholder="Additional notes..."
                          value={contact.notes || ''}
                          onChange={(e) => onUpdate(index, 'notes', e.target.value)}
                        />
                      </Table.Cell>

                      <Table.Cell className="p-2">
                        <DropdownWrapper
                          items={getActionsDropdownItems(index)}
                          trigger={
                            <Button
                              size="2"
                              variant="ghost"
                              className="w-10 h-10 flex items-center justify-center !mt-2"
                            >
                              <FaEllipsisVertical className="w-3 h-3" />
                            </Button>
                          }
                        />
                      </Table.Cell>
                    </Table.Row>
                  );
                })}
              </Table.Body>
            </Table.Root>
          </div>
        </div>

        {/* Action Buttons at the bottom */}
        <div className="border-t border-[var(--gray-5)] pt-4" style={{ flexShrink: 0 }}>
          <Flex gap="3" justify="end">
            <Button
              variant="soft"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              size="3"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isLoading || validContacts.length === 0}
              size="3"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                `Save ${validContacts.length} Contact${validContacts.length !== 1 ? 's' : ''}`
              )}
            </Button>
          </Flex>
        </div>
      </Dialog.Content>
    </Dialog.Root>
  );
};
