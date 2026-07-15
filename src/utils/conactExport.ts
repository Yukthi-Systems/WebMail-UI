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

// utils/contactExport.ts
import * as XLSX from 'xlsx';
import type { Contact } from './contact';

export function exportToCSV(contacts: Contact[]): void {
  const headers = ['Name', 'Email', 'Phone', 'Notes', 'Created At'];
  const rows = contacts.map((contact) => [
    contact.name,
    contact.email,
    contact.phone || '',
    contact.notes || '',
    new Date(contact.created_at).toLocaleString(),
  ]);

  const csvContent = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell}"`).join(',')),
  ].join('\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.csv`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function exportToXLSX(contacts: Contact[]): void {
  const data = contacts.map((contact) => ({
    Name: contact.name,
    Email: contact.email,
    Phone: contact.phone || '',
    Notes: contact.notes || '',
    'Created At': new Date(contact.created_at).toLocaleString(),
  }));

  const worksheet = XLSX.utils.json_to_sheet(data);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Contacts');

  // Auto-size columns
  const maxWidth = data.reduce((w, r) => Math.max(w, r.Name.length), 10);
  worksheet['!cols'] = [{ wch: maxWidth }, { wch: 30 }, { wch: 15 }, { wch: 40 }, { wch: 20 }];

  XLSX.writeFile(workbook, `contacts_${new Date().toISOString().split('T')[0]}.xlsx`);
}

export function exportToVCard(contacts: Contact[]): void {
  const vcards = contacts
    .map((contact) => {
      const lines = ['BEGIN:VCARD', 'VERSION:3.0', `FN:${contact.name}`, `EMAIL:${contact.email}`];

      if (contact.phone) {
        lines.push(`TEL:${contact.phone}`);
      }

      if (contact.notes) {
        lines.push(`NOTE:${contact.notes.replace(/\n/g, '\\n')}`);
      }

      lines.push('END:VCARD');
      return lines.join('\r\n');
    })
    .join('\r\n\r\n');

  const blob = new Blob([vcards], { type: 'text/vcard;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', `contacts_${new Date().toISOString().split('T')[0]}.vcf`);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export async function fetchAllContacts(
  fetchPage: (page: number) => Promise<{ data: Contact[]; total_pages: number }>,
  onProgress?: (current: number, total: number, percentage: number) => void,
  shouldCancel?: () => boolean
): Promise<Contact[]> {
  const allContacts: Contact[] = [];

  // Fetch first page to get total pages
  const firstPage = await fetchPage(1);
  allContacts.push(...firstPage.data);

  const totalPages = firstPage.total_pages;

  if (onProgress) {
    onProgress(1, totalPages, Math.round((1 / totalPages) * 100));
  }

  // Fetch remaining pages
  for (let page = 2; page <= totalPages; page++) {
    if (shouldCancel && shouldCancel()) {
      throw new Error('Export cancelled by user');
    }

    const pageData = await fetchPage(page);
    allContacts.push(...pageData.data);

    if (onProgress) {
      onProgress(page, totalPages, Math.round((page / totalPages) * 100));
    }
  }

  return allContacts;
}
