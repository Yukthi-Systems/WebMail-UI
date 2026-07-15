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

import { useQuery, keepPreviousData, useMutation } from '@tanstack/react-query';
import {
  getContacts,
  createBulkContact,
  createContact,
  deleteContact,
  editContact,
  type Contact,
} from '../api/contacts';
import type { CreateContactData } from '../utils/contact';

export function useContacts(page: number = 1, perPage: number = 50) {
  return useQuery({
    queryKey: ['contacts', page, perPage],
    queryFn: () => getContacts(page, perPage),
    placeholderData: keepPreviousData,
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 15,
    retry: 5,
    retryDelay: () => 500,
    refetchOnWindowFocus: false,
  });
}

export function useCreateContact() {
  return useMutation<Contact, Error, CreateContactData>({
    mutationKey: ['create_contact'],
    mutationFn: (contactData: CreateContactData) => createContact(contactData),
  });
}

export function useEditContact() {
  return useMutation<
    Contact,
    Error,
    { contactData: CreateContactData; contact_id: string | number }
  >({
    mutationKey: ['edit_contact'],
    mutationFn: ({ contactData, contact_id }) => editContact(contactData, contact_id),
  });
}

export function useDeleteContact() {
  return useMutation<Contact, Error, { contact_id: string | number }>({
    mutationKey: ['delete_contact'],
    mutationFn: ({ contact_id }) => deleteContact(contact_id),
  });
}

export function useCreateBulkContact() {
  return useMutation<Contact, Error, CreateContactData[]>({
    mutationKey: ['create_bulk_contact'],
    mutationFn: (contactData: CreateContactData[]) => createBulkContact(contactData),
  });
}
