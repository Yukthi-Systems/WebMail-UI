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

// ContactPage.tsx - Fixed Layout Version
import { useState, useRef } from 'react';
import { FaPlus, FaTrash, FaChevronDown, FaFileCsv, FaFileExport } from 'react-icons/fa6';
import { FaEdit, FaExclamationTriangle } from 'react-icons/fa';
import { FiRefreshCcw } from 'react-icons/fi';

import {
  useContacts,
  useCreateBulkContact,
  useCreateContact,
  useDeleteContact,
  useEditContact,
} from '../../hooks/useContacts';
import { ContactTable } from './ContactTable';
import { Pagination } from './Pagination';
import { ContactForm } from './ContactForm';
import { BulkCreateView } from './BulkCreateView';
import { DeleteConfirmationModal } from './DeleteConfirm';
import { ExportModal } from './ExportModal';
import DropdownWrapper from '../common/DropdownWrapper';
import type { Contact, ContactsResponse, CreateContactData } from '../../utils/contact';
import CSVImportModal from './CSVImport';
import { deleteContact, getContacts } from '../../api/contacts';
import { useToast } from '../../hooks/useToast';
import {
  exportToCSV,
  exportToVCard,
  exportToXLSX,
  fetchAllContacts,
} from '../../utils/conactExport';
import { useIsMobile } from '../../hooks/use-mobile';
import { ContactCard } from './ContactCard';

function ContactPage() {
  const isMobile = useIsMobile();
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(15);
  const [selectedContacts, setSelectedContacts] = useState<number[]>([]);
  const [editingContact, setEditingContact] = useState<Contact | null>(null);
  const [isBulkDeleting, setIsBulkDeleting] = useState(false);
  const cancelExportRef = useRef(false);

  // Modal states
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkCreateModal, setShowBulkCreateModal] = useState(false);
  const [showCSVImportModal, setShowCSVImportModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);

  const toast = useToast();

  const [deleteType, setDeleteType] = useState<'single' | 'bulk'>('single');
  const [contactToDelete, setContactToDelete] = useState<Contact | null>(null);

  const [newContacts, setNewContacts] = useState<Partial<CreateContactData>[]>([
    { name: '', email: '', phone: '', notes: '' },
  ]);

  const { data, isPending, refetch, isError } = useContacts(page, perPage);
  const { mutate: createSingleContact, isPending: isLoadingCreateSingleContact } =
    useCreateContact();
  const { mutate: editSingleContact, isPending: isLoadingEditSingleContact } = useEditContact();
  const { mutate: createBulkContact, isPending: isLoadingBulkCreate } = useCreateBulkContact();
  const { mutate: deleteSingleContact, isPending: isLoadingDelete } = useDeleteContact();

  const contactsData = data as ContactsResponse;
  const contacts = contactsData?.data || [];
  const hasContacts = contacts?.length > 0;

  const bulkActionItems = [
    {
      key: 'manual',
      label: 'Manual Bulk Create',
      icon: FaEdit,
      onSelect: () => setShowBulkCreateModal(true),
    },
    {
      key: 'csv',
      label: 'Import Contacts',
      icon: FaFileCsv,
      onSelect: () => setShowCSVImportModal(true),
    },
    {
      key: 'export',
      label: 'Export Contacts',
      icon: FaFileExport,
      onSelect: () => setShowExportModal(true),
    },
  ];

  const handleExport = async (
    format: 'csv' | 'xlsx' | 'vcard',
    onProgress: (current: number, total: number) => void,
    shouldCancel: () => boolean
  ) => {
    try {
      cancelExportRef.current = false;

      const allContacts = await fetchAllContacts(
        async (pageNum: number) => {
          const response = await getContacts(pageNum, 100);
          return {
            // api/contacts.ts's Contact (nullable phone/notes/contact_id) differs
            // slightly from utils/contact.ts's Contact (non-nullable) — pre-existing
            // mismatch between the two Contact shapes, bridged via cast rather than
            // reconciled here.
            data: response.data as unknown as Contact[],
            total_pages: response.total_pages,
          };
        },
        onProgress,
        shouldCancel
      );

      if (shouldCancel()) {
        toast.success({ description: 'Export cancelled' });
        return;
      }

      switch (format) {
        case 'csv':
          exportToCSV(allContacts);
          break;
        case 'xlsx':
          exportToXLSX(allContacts);
          break;
        case 'vcard':
          exportToVCard(allContacts);
          break;
      }

      toast.success({ description: `Exported ${allContacts.length} contacts successfully` });
    } catch (error) {
      if (error instanceof Error && error.message.includes('cancelled')) {
        toast.success({ description: 'Export cancelled' });
      } else {
        console.error('Export failed:', error);
        toast.error({ description: 'Failed to export contacts' });
      }
    }
  };

  const toggleSelectAll = () => {
    if (selectedContacts.length === contacts.length) {
      setSelectedContacts([]);
    } else {
      setSelectedContacts(contacts.map((contact) => contact.contact_id));
    }
  };

  const toggleSelectContact = (contactId: number) => {
    if (selectedContacts.includes(contactId)) {
      setSelectedContacts(selectedContacts.filter((id) => id !== contactId));
    } else {
      setSelectedContacts([...selectedContacts, contactId]);
    }
  };

  const handleCreateContact = async (contactData: Partial<Contact>) => {
    if (!contactData.name || !contactData.email) return;

    createSingleContact(
      {
        name: contactData.name,
        email: contactData.email,
        phone: contactData.phone || '',
        notes: contactData.notes || '',
      },
      {
        onSuccess: () => {
          refetch();
          setShowCreateModal(false);
        },
      }
    );
  };

  const handleEditContact = async (contactData: Partial<Contact>) => {
    if (!contactData.name || !contactData.email || !editingContact?.contact_id) return;

    editSingleContact(
      {
        contactData: {
          name: contactData.name,
          email: contactData.email,
          phone: contactData.phone || '',
          notes: contactData.notes || '',
        },
        contact_id: editingContact.contact_id,
      },
      {
        onSuccess: () => {
          refetch();
          setShowEditModal(false);
          setEditingContact(null);
        },
      }
    );
  };

  const handleDeleteContact = (contact: Contact) => {
    setContactToDelete(contact);
    setDeleteType('single');
    setShowDeleteModal(true);
  };

  const handleBulkDelete = () => {
    if (selectedContacts.length === 0) return;
    setDeleteType('bulk');
    setShowDeleteModal(true);
  };

  const executeDelete = async () => {
    if (deleteType === 'single' && contactToDelete) {
      deleteSingleContact(
        { contact_id: contactToDelete.contact_id },
        {
          onSuccess: () => {
            refetch();
            setShowDeleteModal(false);
            setSelectedContacts((prev) => prev.filter((id) => id !== contactToDelete.contact_id));
            setContactToDelete(null);
          },
        }
      );
    } else if (deleteType === 'bulk' && selectedContacts.length > 0) {
      setIsBulkDeleting(true);

      for (const contactId of selectedContacts) {
        try {
          await deleteContact(contactId);
        } catch (error) {
          console.error(`Failed to delete contact ${contactId}:`, error);
        }
      }

      setShowDeleteModal(false);
      refetch();
      setSelectedContacts([]);
      setIsBulkDeleting(false);
    }
  };

  const handleBulkCreate = async () => {
    const validContacts = newContacts.filter((contact) => contact.name && contact.email);
    if (validContacts.length === 0) {
      toast.error({ description: 'Please add at least one contact with name and email' });
      return;
    }

    createBulkContact(validContacts as CreateContactData[], {
      onSuccess: () => {
        refetch();
        setShowBulkCreateModal(false);
        setNewContacts([{ name: '', email: '', phone: '', notes: '' }]);
        toast.success({
          description: `Successfully created ${validContacts.length} contact${validContacts.length > 1 ? 's' : ''}`,
        });
      },
      onError: (error) => {
        // error is a plain Error here, so .response is never actually present —
        // pre-existing defensive fallback for a shape this API doesn't produce.
        const response = (error as unknown as { response?: { data?: { message?: string; error?: string } } })
          .response;
        const errorMessage =
          response?.data?.message ||
          response?.data?.error ||
          error?.message ||
          'Failed to create contacts. Please try again.';

        toast.error({ description: errorMessage });
      },
    });
  };

  const handleCSVImport = async (contacts: CreateContactData[]) => {
    if (!contacts || contacts.length === 0) {
      toast.error({ description: 'No valid contacts found in the CSV file.' });
      return;
    }

    const loadingId = toast.loading({
      description: `Importing ${contacts.length} contact${contacts.length > 1 ? 's' : ''}...`,
    });

    createBulkContact(contacts, {
      onSuccess: () => {
        refetch();
        setShowCSVImportModal(false);
        toast.dismiss(loadingId);
        toast.success({
          description: `Successfully imported contact${contacts.length > 1 ? 's' : ''}.`,
        });
      },
      onError: (error) => {
        console.error('CSV import failed:', error);
        toast.dismiss(loadingId);
        const response = (error as unknown as { response?: { data?: { message?: string; error?: string } } })
          .response;
        const errorMessage =
          response?.data?.message ||
          response?.data?.error ||
          error?.message ||
          'Failed to import contacts from CSV. Please try again.';

        toast.error({ description: errorMessage });
      },
    });
  };

  const addNewContactField = () => {
    setNewContacts([...newContacts, { name: '', email: '', phone: '', notes: '' }]);
  };

  const duplicateNewContact = (index: number) => {
    const contactToDuplicate = newContacts[index];
    const updatedContacts = [...newContacts];
    updatedContacts.splice(index + 1, 0, { ...contactToDuplicate });
    setNewContacts(updatedContacts);
  };

  const removeNewContactField = (index: number) => {
    if (newContacts.length > 1) {
      const updatedContacts = [...newContacts];
      updatedContacts.splice(index, 1);
      setNewContacts(updatedContacts);
    }
  };

  const updateNewContact = (index: number, field: keyof CreateContactData, value: string) => {
    const updatedContacts = [...newContacts];
    updatedContacts[index] = { ...updatedContacts[index], [field]: value };
    setNewContacts(updatedContacts);
  };

  const handleEditClick = (contact: Contact) => {
    setEditingContact(contact);
    setShowEditModal(true);
  };

  const handleBulkCreateModalClose = (open: boolean) => {
    setShowBulkCreateModal(open);
    if (!open) {
      setNewContacts([{ name: '', email: '', phone: '', notes: '' }]);
    }
  };

  if (isPending) {
    return (
      <div className="min-h-screen bg-[var(--gray-1)] flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[var(--accent-9)] mx-auto mb-4"></div>
          <p className="text-[var(--gray-11)]">Loading contacts...</p>
        </div>
      </div>
    );
  }

  return (
    <div className=" bg-[var(--gray-1)] flex flex-col">
      <div className="flex-shrink-0 p-6 max-w-[1800px] mx-auto w-full">
        <div className="mb-1 pb-4 flex justify-between border-b border-[var(--gray-5)]">
          <div>
            <h1 className="text-2xl font-bold text-[var(--gray-12)]">Contact Manager</h1>
            <p className="text-sm text-[var(--gray-11)] mt-1">Manage your contact directory</p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={() => setShowCreateModal(true)}
              className="px-4 py-2 bg-[var(--accent-9)] text-white rounded-md hover:bg-[var(--accent-10)] transition-colors flex items-center gap-2 text-sm font-medium"
            >
              <FaPlus className="w-3.5 h-3.5" />
              {isMobile ? ' ' : 'Create Contact'}
            </button>

            <DropdownWrapper
              items={bulkActionItems}
              trigger={
                <button className="px-4 py-2 bg-[var(--gray-3)] text-[var(--gray-12)] border border-[var(--gray-6)] rounded-md hover:bg-[var(--gray-4)] transition-colors flex items-center gap-2 text-sm font-medium">
                  {!isMobile && <FaPlus className="w-3.5 h-3.5" />}
                  {isMobile ? 'Actions ' : 'Bulk Actions'}
                  <FaChevronDown className="w-3 h-3" />
                </button>
              }
            />

            {selectedContacts.length > 0 && !isError && (
              <button
                onClick={handleBulkDelete}
                className="px-4 py-2 bg-[var(--red-9)] text-white rounded-md hover:bg-[var(--red-10)] transition-colors flex items-center gap-2 text-sm font-medium"
              >
                <FaTrash className="w-3.5 h-3.5" />
                Delete ({selectedContacts.length})
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex-1 min-h-0 px-6 max-w-[1800px] mx-auto w-full pb-6">
        {isError ? (
          <div className="bg-[var(--gray-1)] rounded-lg border border-[var(--red-5)] p-12 text-center">
            <FaExclamationTriangle className="w-12 h-12 text-[var(--red-9)] mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">
              Failed to Load Contacts
            </h3>
            <p className="text-[var(--gray-11)] mb-4">
              Failed to load contacts - No contacts present/Add your first contact.
              {/* {error?.message &&  || 'Unable to fetch contacts. You can still create new contacts.'} */}
            </p>
            <button
              onClick={() => refetch()}
              className="px-4 py-2 bg-[var(--accent-9)] text-white rounded-md hover:bg-[var(--accent-10)] transition-colors flex items-center gap-2 mx-auto"
            >
              <FiRefreshCcw className="w-4 h-4" />
              Retry
            </button>
          </div>
        ) : (
          <div className="bg-[var(--gray-1)] rounded-lg border border-[var(--gray-5)] flex flex-col h-full overflow-hidden">
            {hasContacts ? (
              <>
                <div className="h-[70vh] overflow-auto">
                  {isMobile ? (
                    <div className="p-4 space-y-3">
                      {contacts.map((contact) => (
                        <ContactCard
                          key={contact.contact_id}
                          contact={contact}
                          isSelected={selectedContacts.includes(contact.contact_id)}
                          onSelect={() => toggleSelectContact(contact.contact_id)}
                          onEdit={() => handleEditClick(contact)}
                          onDelete={() => handleDeleteContact(contact)}
                        />
                      ))}
                    </div>
                  ) : (
                    <ContactTable
                      contacts={contacts}
                      selectedContacts={selectedContacts}
                      toggleSelectContact={toggleSelectContact}
                      toggleSelectAll={toggleSelectAll}
                      onEdit={handleEditClick}
                      onDelete={handleDeleteContact}
                    />
                  )}
                </div>
                <div className="flex-shrink-0 p-4 border-t border-[var(--gray-5)] bg-[var(--gray-1)]">
                  <Pagination
                    perPage={perPage}
                    data={contactsData}
                    onPageChange={setPage}
                    onPerPageChange={(newPerPage) => {
                      setPerPage(newPerPage);
                      setPage(1);
                    }}
                  />
                </div>
              </>
            ) : (
              <div className="text-center py-12 flex-1 flex flex-col items-center justify-center">
                <div className="text-6xl mb-4">📋</div>
                <h3 className="text-lg font-semibold text-[var(--gray-12)] mb-2">
                  No contacts found
                </h3>
                <p className="text-[var(--gray-11)] mb-4">
                  Get started by creating contacts or importing from CSV.
                </p>
                <div className="flex items-center justify-center gap-3">
                  <button
                    onClick={() => setShowCreateModal(true)}
                    className="px-4 py-2 bg-[var(--accent-9)] text-white rounded-md hover:bg-[var(--accent-10)] transition-colors flex items-center gap-2"
                  >
                    <FaPlus className="w-3.5 h-3.5" />
                    Create Contact
                  </button>
                  <button
                    onClick={() => setShowCSVImportModal(true)}
                    className="px-4 py-2 bg-[var(--gray-3)] text-[var(--gray-12)] border border-[var(--gray-6)] rounded-md hover:bg-[var(--gray-4)] transition-colors flex items-center gap-2"
                  >
                    <FaFileCsv className="w-3.5 h-3.5" />
                    Import CSV
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <ContactForm
        open={showCreateModal}
        onOpenChange={setShowCreateModal}
        onSubmit={handleCreateContact}
        title="Create New Contact"
        isLoading={isLoadingCreateSingleContact}
      />

      {editingContact && (
        <ContactForm
          open={showEditModal}
          onOpenChange={setShowEditModal}
          contact={editingContact}
          onSubmit={handleEditContact}
          title="Edit Contact"
          isLoading={isLoadingEditSingleContact}
        />
      )}

      <BulkCreateView
        open={showBulkCreateModal}
        onOpenChange={handleBulkCreateModalClose}
        contacts={newContacts}
        onUpdate={updateNewContact}
        onAdd={addNewContactField}
        onRemove={removeNewContactField}
        onDuplicate={duplicateNewContact}
        onSave={handleBulkCreate}
        isLoading={isLoadingBulkCreate}
      />

      <CSVImportModal
        open={showCSVImportModal}
        onOpenChange={setShowCSVImportModal}
        onImport={handleCSVImport}
        isLoading={isLoadingBulkCreate}
      />

      <ExportModal
        open={showExportModal}
        onOpenChange={setShowExportModal}
        onExport={handleExport}
      />

      <DeleteConfirmationModal
        open={showDeleteModal}
        onOpenChange={setShowDeleteModal}
        onConfirm={executeDelete}
        isLoading={isLoadingDelete || isBulkDeleting}
        type={deleteType}
        contact={contactToDelete || undefined}
        selectedCount={selectedContacts.length}
      />
    </div>
  );
}

export default ContactPage;
