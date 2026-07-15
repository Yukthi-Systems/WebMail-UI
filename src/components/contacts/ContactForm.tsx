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

import { Flex, TextField, Button, Box, Dialog } from '@radix-ui/themes';
import type { Contact } from '../../utils/contact';
import { FaTimes } from 'react-icons/fa';

interface ContactFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  contact?: Partial<Contact>;
  onSubmit: (contactData: Partial<Contact>) => void;
  title: string;
  isLoading?: boolean;
}

export const ContactForm = ({
  open,
  onOpenChange,
  contact,
  onSubmit,
  title,
  isLoading,
}: ContactFormProps) => {
  const handleSubmit = (contactData: Partial<Contact>) => {
    onSubmit(contactData);
    onOpenChange(false);
  };

  const handleCancel = () => {
    onOpenChange(false);
  };

  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Content size="2" style={{ width: '500px', maxWidth: '90vw' }}>
        <Flex justify="between" align="center" mb="4">
          <Dialog.Title>{title}</Dialog.Title>
          <Button variant="ghost" onClick={handleCancel}>
            <FaTimes />
          </Button>
        </Flex>

        <Box mb="4">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const formData = new FormData(e.target as HTMLFormElement);
              const contactData = {
                name: formData.get('name') as string,
                email: formData.get('email') as string,
                phone: formData.get('phone') as string,
                notes: formData.get('notes') as string,
              };
              handleSubmit(contactData);
            }}
          >
            <Flex direction="column" gap="4">
              <div>
                <label className="block text-sm font-medium text-[var(--gray-12)] mb-2">
                  Name <span className="text-red-500">*</span>
                </label>
                <TextField.Root
                  name="name"
                  defaultValue={contact?.name}
                  placeholder="Enter full name"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-12)] mb-2">
                  Email <span className="text-red-500">*</span>
                </label>
                <TextField.Root
                  name="email"
                  type="email"
                  defaultValue={contact?.email}
                  placeholder="email@example.com"
                  required
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-12)] mb-2">
                  Phone
                </label>
                <TextField.Root
                  name="phone"
                  defaultValue={contact?.phone}
                  placeholder="+1 234 567 8900"
                  className="w-full"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-[var(--gray-12)] mb-2">
                  Notes
                </label>
                <TextField.Root
                  name="notes"
                  defaultValue={contact?.notes}
                  placeholder="Additional notes about this contact..."
                  className="w-full"
                />
              </div>
            </Flex>

            <Flex gap="3" mt="6" justify="end">
              <Button type="button" variant="soft" onClick={handleCancel} disabled={isLoading}>
                Cancel
              </Button>
              <Button type="submit" disabled={isLoading}>
                {isLoading
                  ? 'Saving...'
                  : contact?.contact_id
                    ? 'Update Contact'
                    : 'Create Contact'}
              </Button>
            </Flex>
          </form>
        </Box>
      </Dialog.Content>
    </Dialog.Root>
  );
};
