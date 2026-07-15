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

import { useNavigate, Link } from '@tanstack/react-router';
import { useEffect, useState, useRef } from 'react';
import BrandingManager from './BrandingManager';
import { FiLayers, FiGlobe } from 'react-icons/fi';
import {
  FiEdit2,
  FiTrash2,
  FiPlus,
  FiMoreVertical,
  FiChevronLeft,
  FiChevronRight,
  FiChevronsLeft,
  FiChevronsRight,
  FiServer,
  FiX,
  FiUploadCloud,
  FiRefreshCw,
  FiDownload,
  FiChevronDown,
} from 'react-icons/fi';
import { useAtomValue } from 'jotai';
import * as DropdownMenu from '@radix-ui/react-dropdown-menu';
import { apiKeyAtom } from '../../../state/auth';
import { useToast } from '../../ui/ToastComponent';
import DomainDetailsModal from './DomainDetailsModal';
import { useDeleteDomain, useListDomains } from '../../../hooks/useAdminDomain';
import { getDomainList } from '../../../api/admin-domain';
import { formatEmailDate } from '../../../utils/dateFormat';
import DomainBulkImportModal from './BulkImport';
import DomainBulkEditModal from './BulkEdit';
import { useDebounce } from '../../../hooks/useDebounce';

function DomainList() {
  const navigate = useNavigate();
  const apiKey = useAtomValue(apiKeyAtom);
  const [activeTab, setActiveTab] = useState<'domains' | 'branding'>('domains');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(10);
  const [pageInput, setPageInput] = useState('1');
  const [isEditingPage, setIsEditingPage] = useState(false);
  const pageInputRef = useRef<HTMLInputElement>(null);
  const [bulkOpen, setBulkOpen] = useState(false);
  const [bulkEditOpen, setBulkEditOpen] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const { mutate: deleteDomain, isPending: isDeleting } = useDeleteDomain();
  const toast = useToast();
  const debouncedSearch = useDebounce(searchQuery, 400);

  const { data, isLoading, isFetching, refetch } = useListDomains(
    currentPage,
    pageSize,
    debouncedSearch
  );

  const [deleteOpen, setDeleteOpen] = useState(false);
  const [deleteDomainName, setDeleteDomainName] = useState('');
  const [viewOpen, setViewOpen] = useState(false);
  const [selectedDomain, setSelectedDomain] = useState<any>(null);

  // Note: 'openDropdown' state is no longer needed as Radix handles this internally per instance.

  const domainList = data?.data ?? [];
  const pagination = {
    totalCount: data?.total_count ?? 0,
    currentPage: data?.current_page ?? 1,
    totalPages: data?.total_pages ?? 1,
    hasNext: data?.has_next ?? false,
    hasPrevious: data?.has_previous ?? false,
    pageSize: data?.page_size ?? pageSize,
  };

  const handleDelete = (domain: string) => {
    setDeleteDomainName(domain);
    setDeleteOpen(true);
  };

  const confirmDelete = () => {
    deleteDomain(deleteDomainName, {
      onSuccess: () => setDeleteOpen(false),
      onError: (error) => toast.error({ description: error.message }),
    });
  };

  const goToPage = (page: number) => {
    if (page >= 1 && page <= pagination.totalPages) {
      setCurrentPage(page);
      setPageInput(page.toString());
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  const handlePageInputSubmit = () => {
    const page = parseInt(pageInput);
    if (!isNaN(page) && page >= 1 && page <= pagination.totalPages) {
      goToPage(page);
      setIsEditingPage(false);
    } else {
      setPageInput(currentPage.toString());
      setIsEditingPage(false);
    }
  };

  const handlePageInputKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handlePageInputSubmit();
    } else if (e.key === 'Escape') {
      setPageInput(currentPage.toString());
      setIsEditingPage(false);
    }
  };

  const downloadCSV = async () => {
    setIsDownloading(true);
    try {
      const result = await getDomainList(1, 100000, debouncedSearch || undefined);
      const domains = result?.data ?? [];
      const header =
        'domain,smtp_server,smtp_port,imap_server,imap_port,sieve_server,sieve_port,is_active,is_v2_user\n';
      const body = domains
        .map((d: any) =>
          [
            d.domain,
            d.smtp_server,
            d.smtp_port,
            d.imap_server,
            d.imap_port,
            d.sieve_server,
            d.sieve_port,
            d.is_active,
            d.is_v2_user,
          ].join(',')
        )
        .join('\n');
      const blob = new Blob([header + body], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `domains-export-${Date.now()}.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      toast.error({ description: err.message || 'Failed to download CSV' });
    } finally {
      setIsDownloading(false);
    }
  };

  useEffect(() => {
    setCurrentPage(1);
  }, [debouncedSearch]);

  const getPageNumbers = () => {
    const pages: (number | string)[] = [];
    const { currentPage, totalPages } = pagination;

    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 4) {
        for (let i = 1; i <= 5; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 3) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 4; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push('...');
        pages.push(totalPages);
      }
    }
    return pages;
  };

  const startRecord = (pagination.currentPage - 1) * pagination.pageSize + 1;
  const endRecord = Math.min(pagination.currentPage * pagination.pageSize, pagination.totalCount);

  useEffect(() => {
    if (isEditingPage && pageInputRef.current) {
      pageInputRef.current.focus();
      pageInputRef.current.select();
    }
  }, [isEditingPage]);

  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  useEffect(() => {
    if (!apiKey) {
      navigate({ to: '/1219/admin/login' });
    }
  }, [apiKey, navigate]);

  useEffect(() => {
    if (!apiKey) {
      navigate({ to: '/1219/admin/login' });
    }
  }, []);
  return (
    <>
      <div className="min-h-screen bg-[var(--gray-1)]">
        <div className="fixed inset-0 bg-gradient-to-br from-[var(--accent-3)] via-transparent to-[var(--accent-2)] pointer-events-none opacity-30" />

        <div className="relative max-w-[1400px] mx-auto p-4 lg:p-6">
          {/* Header */}
          <div className="mb-4">
            <div className="flex items-end justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-3xl font-bold text-[var(--gray-12)] mb-1 tracking-tight">
                  {activeTab === 'domains' ? 'Domain Management' : 'Company Branding'}
                </h1>
                <p className="text-base text-[var(--gray-11)] font-medium">
                  {activeTab === 'domains'
                    ? 'Configure and manage your email domain infrastructure'
                    : 'Manage logos and backgrounds for company login pages'}
                </p>
              </div>
              <div className="flex items-center gap-2">
                {/* Tab switcher */}
                <div className="flex items-center bg-[var(--gray-3)] rounded-lg p-0.5 border border-[var(--gray-5)]">
                  <button
                    onClick={() => setActiveTab('domains')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'domains'
                        ? 'bg-[var(--gray-1)] text-[var(--gray-12)] shadow-sm'
                        : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]'
                    }`}
                  >
                    <FiGlobe className="w-3.5 h-3.5" />
                    Domains
                  </button>
                  <button
                    onClick={() => setActiveTab('branding')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all ${
                      activeTab === 'branding'
                        ? 'bg-[var(--gray-1)] text-[var(--gray-12)] shadow-sm'
                        : 'text-[var(--gray-10)] hover:text-[var(--gray-12)]'
                    }`}
                  >
                    <FiLayers className="w-3.5 h-3.5" />
                    Branding
                  </button>
                </div>

                {activeTab === 'domains' && (
                  <>
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="Search domains..."
                      className="px-4 py-2 rounded-lg border border-[var(--gray-5)] bg-[var(--gray-1)] focus:outline-none focus:border-[var(--accent-9)] focus:ring-2 focus:ring-[var(--accent-8)] transition-all"
                    />
                    <button
                      onClick={() => refetch()}
                      disabled={isFetching}
                      title="Refresh"
                      className="p-2.5 text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-2)] hover:bg-[var(--gray-4)] border border-[var(--gray-5)] hover:border-[var(--gray-7)] rounded-lg transition-all duration-200 disabled:opacity-50"
                    >
                      <FiRefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    </button>
                    <DropdownMenu.Root>
                      <DropdownMenu.Trigger asChild>
                        <button className="px-4 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] bg-[var(--gray-2)] hover:bg-[var(--gray-4)] border border-[var(--gray-5)] hover:border-[var(--gray-7)] rounded-lg transition-all duration-200 flex items-center gap-2 outline-none">
                          Bulk Actions
                          <FiChevronDown className="w-4 h-4" />
                        </button>
                      </DropdownMenu.Trigger>
                      <DropdownMenu.Portal>
                        <DropdownMenu.Content
                          className="min-w-[12rem] bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg shadow-xl z-50 overflow-hidden p-1 animate-in fade-in zoom-in-95 duration-100"
                          align="end"
                          sideOffset={5}
                        >
                          <DropdownMenu.Item
                            onSelect={() => setBulkOpen(true)}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--gray-12)] hover:bg-[var(--accent-3)] hover:text-[var(--accent-11)] rounded-md cursor-pointer outline-none transition-colors"
                          >
                            <FiUploadCloud className="w-4 h-4" />
                            Bulk Import
                          </DropdownMenu.Item>
                          <DropdownMenu.Item
                            onSelect={() => setBulkEditOpen(true)}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--gray-12)] hover:bg-[var(--accent-3)] hover:text-[var(--accent-11)] rounded-md cursor-pointer outline-none transition-colors"
                          >
                            <FiEdit2 className="w-4 h-4" />
                            Bulk Edit
                          </DropdownMenu.Item>
                          <DropdownMenu.Separator className="h-px bg-[var(--gray-5)] my-1" />
                          <DropdownMenu.Item
                            onSelect={downloadCSV}
                            disabled={isDownloading}
                            className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--gray-12)] hover:bg-[var(--accent-3)] hover:text-[var(--accent-11)] rounded-md cursor-pointer outline-none transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            <FiDownload
                              className={`w-4 h-4 ${isDownloading ? 'animate-bounce' : ''}`}
                            />
                            {isDownloading ? 'Downloading...' : 'Download CSV'}
                          </DropdownMenu.Item>
                        </DropdownMenu.Content>
                      </DropdownMenu.Portal>
                    </DropdownMenu.Root>
                    <Link
                      to="/1219/admin/domain/add"
                      className="group px-4 py-2.5 text-sm font-semibold text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-all duration-200 flex items-center gap-2 shadow-sm"
                    >
                      <FiPlus className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" />
                      Add Domain
                    </Link>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Branding Tab */}
          {activeTab === 'branding' && <BrandingManager />}

          {/* Main Card — Domains tab only */}
          {activeTab === 'domains' && (
            <div className="bg-[var(--gray-2)] rounded-xl border border-[var(--gray-4)] overflow-hidden">
              {isLoading ? (
                <div className="flex flex-col items-center justify-center p-16 space-y-4 min-h-[500px]">
                  <div className="relative">
                    <div className="w-14 h-14 border-4 border-[var(--gray-5)] border-t-[var(--accent-9)] rounded-full animate-spin" />
                    <div
                      className="w-14 h-14 border-4 border-transparent border-t-[var(--accent-11)] rounded-full animate-spin absolute inset-0 opacity-50"
                      style={{ animationDuration: '1.5s', animationDirection: 'reverse' }}
                    />
                  </div>
                  <p className="text-[var(--gray-11)] font-medium">Loading domains...</p>
                </div>
              ) : domainList.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-16 min-h-[500px]">
                  <div className="w-20 h-20 rounded-xl bg-[var(--accent-3)] flex items-center justify-center mb-5">
                    <FiServer className="w-10 h-10 text-[var(--accent-11)]" />
                  </div>
                  <h3 className="text-xl font-bold text-[var(--gray-12)] mb-2">
                    No domains configured
                  </h3>
                  <p className="text-[var(--gray-11)] mb-6 text-center max-w-md">
                    Get started by adding your first email domain
                  </p>
                  <Link
                    to="/1219/admin/domain/add"
                    className="px-6 py-2.5 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-semibold rounded-lg transition-all"
                  >
                    Add Your First Domain
                  </Link>
                </div>
              ) : (
                <div className="flex flex-col min-h-[calc(100vh-200px)]">
                  {/* Table Container with min-height */}
                  <div className="flex-1 overflow-x-auto">
                    <table className="w-full">
                      <thead className="sticky top-0 z-10">
                        <tr className="bg-[var(--gray-3)] border-b-2 border-[var(--gray-5)]">
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide">
                            Domain
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide">
                            IMAP Server
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide">
                            SMTP Server
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide text-center">
                            Status
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide text-center">
                            V2 User
                          </th>
                          <th className="py-3 px-6 text-left text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide">
                            Created
                          </th>
                          <th className="py-3 px-6 text-center text-xs font-bold text-[var(--gray-11)] uppercase tracking-wide">
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody className="bg-[var(--gray-1)]">
                        {domainList.map((domain: any, index: number) => (
                          <tr
                            key={domain.domain}
                            className={`border-b border-[var(--gray-4)] hover:bg-[var(--accent-2)] transition-colors duration-150 ${
                              index % 2 === 0 ? 'bg-[var(--gray-1)]' : 'bg-[var(--gray-2)]'
                            }`}
                          >
                            <td className="py-3 px-6">
                              <button
                                onClick={() => {
                                  setSelectedDomain(domain);
                                  setViewOpen(true);
                                }}
                                className="text-[var(--accent-11)] hover:text-[var(--accent-12)] font-semibold hover:underline transition-colors font-mono text-sm"
                              >
                                {domain.domain}
                              </button>
                            </td>
                            <td className="py-3 px-6">
                              <span className="text-[var(--gray-11)] font-mono text-xs">
                                {domain.imap_server || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <span className="text-[var(--gray-11)] font-mono text-xs">
                                {domain.smtp_server || '-'}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex items-center justify-center w-full">
                                <div
                                  className={`w-6 h-6 rounded-full ${
                                    domain.is_active
                                      ? 'bg-[var(--green-9)] text-white'
                                      : 'bg-[var(--red-9)] text-white'
                                  }`}
                                ></div>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex items-center justify-center w-full">
                                <div
                                  className={`w-6 h-6 rounded-full ${
                                    domain.is_v2_user
                                      ? 'bg-[var(--green-9)] text-white'
                                      : 'bg-[var(--red-9)] text-white'
                                  }`}
                                ></div>
                              </div>
                            </td>
                            <td className="py-3 px-6">
                              <span className="text-[var(--gray-11)] text-xs font-medium">
                                {formatEmailDate(domain.created_at)}
                              </span>
                            </td>
                            <td className="py-3 px-6">
                              <div className="flex justify-center">
                                {/* Radix Dropdown Implementation */}
                                <DropdownMenu.Root>
                                  <DropdownMenu.Trigger asChild>
                                    <button className="p-2 hover:bg-[var(--gray-4)] rounded-lg transition-colors outline-none focus:ring-2 focus:ring-[var(--accent-8)]">
                                      <FiMoreVertical className="w-4 h-4 text-[var(--gray-11)]" />
                                    </button>
                                  </DropdownMenu.Trigger>

                                  {/* Portal moves content outside the table's stacking context */}
                                  <DropdownMenu.Portal>
                                    <DropdownMenu.Content
                                      className="min-w-[12rem] bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg shadow-xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 p-1"
                                      align="end"
                                      sideOffset={5}
                                    >
                                      <DropdownMenu.Item asChild>
                                        <Link
                                          to="/1219/admin/domain/edit/$domain"
                                          params={{ domain: domain.domain }}
                                          className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--gray-12)] hover:bg-[var(--accent-3)] hover:text-[var(--accent-11)] rounded-md cursor-pointer outline-none transition-colors"
                                        >
                                          <FiEdit2 className="w-4 h-4" />
                                          Edit Domain
                                        </Link>
                                      </DropdownMenu.Item>

                                      <DropdownMenu.Separator className="h-px bg-[var(--gray-5)] my-1" />

                                      <DropdownMenu.Item
                                        onSelect={() => handleDelete(domain.domain)}
                                        className="flex items-center gap-3 px-3 py-2 text-sm font-medium text-[var(--red-11)] hover:bg-[var(--red-3)] rounded-md cursor-pointer outline-none transition-colors"
                                      >
                                        <FiTrash2 className="w-4 h-4" />
                                        Delete Domain
                                      </DropdownMenu.Item>
                                    </DropdownMenu.Content>
                                  </DropdownMenu.Portal>
                                </DropdownMenu.Root>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Pagination - Always at bottom */}
                  <div className="bg-[var(--gray-3)] px-6 py-4 border-t border-[var(--gray-5)] mt-auto">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      {/* Results info */}
                      <div className="text-xs text-[var(--gray-11)] font-medium">
                        Showing{' '}
                        <span className="text-[var(--gray-12)] font-semibold">{startRecord}</span> -{' '}
                        <span className="text-[var(--gray-12)] font-semibold">{endRecord}</span> of{' '}
                        <span className="text-[var(--gray-12)] font-semibold">
                          {pagination.totalCount}
                        </span>{' '}
                        domains
                      </div>

                      {/* Pagination controls */}
                      {pagination.totalPages > 1 && (
                        <div className="flex items-center gap-1">
                          {/* First page */}
                          <button
                            onClick={() => goToPage(1)}
                            disabled={!pagination.hasPrevious}
                            className="p-2 rounded-md bg-[var(--gray-2)] hover:bg-[var(--gray-4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-2)] transition-colors border border-[var(--gray-5)]"
                            title="First page"
                          >
                            <FiChevronsLeft className="w-4 h-4 text-[var(--gray-11)]" />
                          </button>

                          {/* Previous page */}
                          <button
                            onClick={() => goToPage(pagination.currentPage - 1)}
                            disabled={!pagination.hasPrevious}
                            className="p-2 rounded-md bg-[var(--gray-2)] hover:bg-[var(--gray-4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-2)] transition-colors border border-[var(--gray-5)]"
                            title="Previous page"
                          >
                            <FiChevronLeft className="w-4 h-4 text-[var(--gray-11)]" />
                          </button>

                          {/* Page numbers */}
                          <div className="hidden sm:flex items-center gap-1 mx-1">
                            {getPageNumbers().map((page, index) =>
                              page === '...' ? (
                                <span
                                  key={`ellipsis-${index}`}
                                  className="px-2 text-[var(--gray-9)] text-sm"
                                >
                                  ⋯
                                </span>
                              ) : (
                                <button
                                  key={page}
                                  onClick={() => goToPage(page as number)}
                                  className={`min-w-[32px] px-3 py-1.5 rounded-md font-semibold text-xs transition-all border ${
                                    pagination.currentPage === page
                                      ? 'bg-[var(--accent-9)] text-white border-[var(--accent-9)] shadow-md'
                                      : 'bg-[var(--gray-2)] text-[var(--gray-12)] hover:bg-[var(--gray-4)] border-[var(--gray-5)]'
                                  }`}
                                >
                                  {page}
                                </button>
                              )
                            )}
                          </div>

                          {/* Editable page input */}
                          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-[var(--gray-2)] rounded-md mx-1 border border-[var(--gray-5)]">
                            <span className="text-xs font-medium text-[var(--gray-11)]">Page</span>
                            {isEditingPage ? (
                              <input
                                ref={pageInputRef}
                                type="number"
                                min="1"
                                max={pagination.totalPages}
                                value={pageInput}
                                onChange={(e) => setPageInput(e.target.value)}
                                onBlur={handlePageInputSubmit}
                                onKeyDown={handlePageInputKeyDown}
                                className="w-12 px-1.5 py-0.5 text-center text-xs font-semibold text-[var(--gray-12)] bg-[var(--gray-1)] rounded outline-none focus:ring-2 focus:ring-[var(--accent-8)] border border-[var(--gray-5)]"
                              />
                            ) : (
                              <button
                                onClick={() => setIsEditingPage(true)}
                                className="min-w-[2rem] px-2 py-0.5 text-xs font-semibold text-[var(--accent-11)] hover:bg-[var(--gray-4)] rounded transition-colors"
                              >
                                {pagination.currentPage}
                              </button>
                            )}
                            <span className="text-xs font-medium text-[var(--gray-11)]">
                              of {pagination.totalPages}
                            </span>
                          </div>

                          {/* Next page */}
                          <button
                            onClick={() => goToPage(pagination.currentPage + 1)}
                            disabled={!pagination.hasNext}
                            className="p-2 rounded-md bg-[var(--gray-2)] hover:bg-[var(--gray-4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-2)] transition-colors border border-[var(--gray-5)]"
                            title="Next page"
                          >
                            <FiChevronRight className="w-4 h-4 text-[var(--gray-11)]" />
                          </button>

                          {/* Last page */}
                          <button
                            onClick={() => goToPage(pagination.totalPages)}
                            disabled={!pagination.hasNext}
                            className="p-2 rounded-md bg-[var(--gray-2)] hover:bg-[var(--gray-4)] disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:bg-[var(--gray-2)] transition-colors border border-[var(--gray-5)]"
                            title="Last page"
                          >
                            <FiChevronsRight className="w-4 h-4 text-[var(--gray-11)]" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <DomainDetailsModal
        isOpen={viewOpen}
        onClose={() => setViewOpen(false)}
        data={selectedDomain}
      />

      <DomainBulkImportModal isOpen={bulkOpen} onClose={() => setBulkOpen(false)} />
      <DomainBulkEditModal isOpen={bulkEditOpen} onClose={() => setBulkEditOpen(false)} />

      {/* Delete Confirmation Modal */}
      {deleteOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setDeleteOpen(false)}
          />
          <div className="relative bg-[var(--gray-2)] rounded-xl p-6 max-w-md w-full shadow-2xl border border-[var(--gray-5)]">
            <button
              onClick={() => setDeleteOpen(false)}
              className="absolute top-3 right-3 p-1.5 hover:bg-[var(--gray-4)] rounded-lg transition-colors"
            >
              <FiX className="w-4 h-4 text-[var(--gray-11)]" />
            </button>

            <div className="mb-5">
              <h2 className="text-xl font-bold text-[var(--gray-12)] mb-2">Delete Domain?</h2>
              <p className="text-sm text-[var(--gray-11)] leading-relaxed">
                Are you sure you want to permanently delete{' '}
                <span className="font-mono font-semibold text-[var(--gray-12)]">
                  "{deleteDomainName}"
                </span>
                ? This action cannot be undone.
              </p>
            </div>

            <div className="flex gap-2 justify-end">
              <button
                onClick={() => setDeleteOpen(false)}
                className="px-4 py-2 text-sm font-medium text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                disabled={isDeleting}
                className="px-4 py-2 text-sm font-semibold text-white bg-[var(--red-9)] hover:bg-[var(--red-10)] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isDeleting ? (
                  <span className="flex items-center gap-2">
                    <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    Deleting...
                  </span>
                ) : (
                  'Delete Domain'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default DomainList;
