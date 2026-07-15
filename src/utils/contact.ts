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

export interface Contact {
  contact_id: number;
  name: string;
  email: string;
  phone: string;
  notes: string;
  created_at: string;
  modified_at: string;
}

export interface ContactsResponse {
  message: string;
  total_count: number;
  current_page: number;
  page_size: number;
  total_pages: number;
  has_next: boolean;
  has_previous: boolean;
  next_page: number | null;
  previous_page: number | null;
  first_page: number;
  last_page: number;
  page_number: number;
  data: Contact[];
}

export type ViewType = 'list' | 'create' | 'bulkCreate' | 'edit';

export interface CreateContactData {
  name: string;
  email: string;
  phone: string;
  notes: string;
}
