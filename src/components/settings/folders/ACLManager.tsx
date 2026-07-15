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

import React, { useMemo, useState } from 'react';
import { FaShield, FaTrash, FaUsers, FaLock, FaChevronDown, FaPlus, FaEye } from 'react-icons/fa6';
import { Controller, useForm } from 'react-hook-form';
import { useGetACL, useSetACL, useDeleteACL, useGetOwnACL } from '../../../hooks/useACL';
import { useToast } from '../../ui/ToastComponent';
import DropdownWrapper, { type DropdownItem } from '../../common/DropdownWrapper';
import DialogWrapper from '../../common/Dialoge';
import { FaEdit, FaInfoCircle } from 'react-icons/fa';
import { useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../../state/userDetails';

interface ACLManagerProps {
  folderPath: string;
  isOpen: boolean;
  onClose: () => void;
}

interface ACLForm {
  user_email: string;
  permissions: string;
}

interface PermissionDetail {
  short: string;
  label: string;
  description: string;
  color: string;
}

interface PermissionOption {
  value: string;
  label: string;
  description: string;
  color: 'blue' | 'green' | 'orange' | 'red' | 'gray';
  icon?: any;
}
const Tooltip: React.FC<{
  children: React.ReactNode;
  content: React.ReactNode;
  side?: 'top' | 'bottom' | 'left' | 'right';
}> = ({ children, content, side = 'top' }) => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ top: 0, left: 0 });
  const triggerRef = React.useRef<HTMLDivElement>(null);

  const updatePosition = () => {
    if (triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      let top = 0;
      let left = 0;

      switch (side) {
        case 'top':
          top = rect.top - 8;
          left = rect.left + rect.width / 2;
          break;
        case 'bottom':
          top = rect.bottom + 8;
          left = rect.left + rect.width / 2;
          break;
        case 'left':
          top = rect.top + rect.height / 2;
          left = rect.left - 8;
          break;
        case 'right':
          top = rect.top + rect.height / 2;
          left = rect.right + 8;
          break;
      }

      setPosition({ top, left });
    }
  };

  const handleMouseEnter = () => {
    updatePosition();
    setIsVisible(true);
  };

  const sideStyles = {
    top: { transform: 'translate(-50%, -100%)' },
    bottom: { transform: 'translate(-50%, 0)' },
    left: { transform: 'translate(-100%, -50%)' },
    right: { transform: 'translate(0, -50%)' },
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-b-transparent border-t-[#1a1a1a]',
    bottom:
      'bottom-full left-1/2 -translate-x-1/2 border-l-transparent border-r-transparent border-t-transparent border-b-[#1a1a1a]',
    left: 'left-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-r-transparent border-l-[#1a1a1a]',
    right:
      'right-full top-1/2 -translate-y-1/2 border-t-transparent border-b-transparent border-l-transparent border-r-[#1a1a1a]',
  };

  return (
    <>
      <div
        ref={triggerRef}
        className="relative inline-block"
        onMouseEnter={handleMouseEnter}
        onMouseLeave={() => setIsVisible(false)}
      >
        {children}
      </div>
      {isVisible && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{
            top: `${position.top}px`,
            left: `${position.left}px`,
            ...sideStyles[side],
          }}
        >
          <div className="bg-[#1a1a1a] text-white text-[10px] rounded-md px-2 py-1.5 shadow-xl min-w-[110px] max-w-[200px] whitespace-normal leading-tight">
            {content}
            <div className={`absolute w-0 h-0 border-[3px] ${arrowClasses[side]}`} />
          </div>
        </div>
      )}
    </>
  );
};

const PermissionBadge: React.FC<{ permission: PermissionDetail }> = ({ permission }) => {
  const getBadgeColorClass = (color: string) => {
    const colorMap: Record<string, string> = {
      gray: 'bg-[var(--gray-3)] text-[var(--gray-11)] border-[var(--gray-6)]',
      blue: 'bg-[var(--blue-3)] text-[var(--blue-11)] border-[var(--blue-6)]',
      green: 'bg-[var(--green-3)] text-[var(--green-11)] border-[var(--green-6)]',
      yellow: 'bg-[var(--yellow-3)] text-[var(--yellow-11)] border-[var(--yellow-6)]',
      purple: 'bg-[var(--purple-3)] text-[var(--purple-11)] border-[var(--purple-6)]',
      indigo: 'bg-[var(--indigo-3)] text-[var(--indigo-11)] border-[var(--indigo-6)]',
      pink: 'bg-[var(--pink-3)] text-[var(--pink-11)] border-[var(--pink-6)]',
      red: 'bg-[var(--red-3)] text-[var(--red-11)] border-[var(--red-6)]',
      orange: 'bg-[var(--orange-3)] text-[var(--orange-11)] border-[var(--orange-6)]',
    };
    return colorMap[color] || colorMap.gray;
  };

  return (
    <Tooltip
      content={
        <div>
          <div className="font-semibold">{permission.label}</div>
          <div className="opacity-90 mt-0.5">{permission.description}</div>
        </div>
      }
      side="top"
    >
      <span
        className={`px-1.5 py-0.5 text-[10px] font-medium rounded border cursor-help transition-all hover:scale-110 ${getBadgeColorClass(permission.color)}`}
      >
        {permission.short}
      </span>
    </Tooltip>
  );
};

const PERMISSION_OPTIONS: PermissionOption[] = [
  {
    value: 'lrs',
    label: 'Read Only',
    description: 'Can view emails only',
    color: 'blue',
    icon: FaEye,
  },
  {
    value: 'lrswi',
    label: 'Read/Write',
    description: 'Can read and create emails',
    color: 'green',
    icon: FaEdit,
  },
  {
    value: 'lrswickx',
    label: 'Read/Write/Delete',
    description: 'Can read, write and delete emails',
    color: 'orange',
    icon: FaTrash,
  },
  {
    value: 'lrswickxtea',
    label: 'Full Access',
    description: 'Complete folder access',
    color: 'red',
    icon: FaShield,
  },
];

const ACLManager: React.FC<ACLManagerProps> = ({ folderPath, isOpen, onClose }) => {
  const toast = useToast();
  const [activeTab, setActiveTab] = useState<'view' | 'add'>('view');

  const {
    data: aclData,
    refetch: refetchACL,
    isLoading: isLoadingACL,
  } = useGetACL(folderPath, isOpen);
  const { data: ownACLData, isLoading: isLoadingOwnACL } = useGetOwnACL(folderPath, isOpen);
  const { mutate: setACL, isPending: isSettingACL } = useSetACL();
  const { mutate: deleteACL, isPending: isDeletingACL } = useDeleteACL();
  const userDetails = useAtomValue(userDetailsAtom);
  const aclForm = useForm<ACLForm>({
    defaultValues: {
      user_email: '',
      permissions: 'lrs',
    },
  });

  const handleClose = () => {
    aclForm.reset();
    onClose();
  };

  const filteredACL = useMemo(() => {
    if (!aclData?.acl || !userDetails?.email) return [];
    return aclData.acl.filter((acl) => acl.user !== userDetails.email);
  }, [aclData?.acl, userDetails?.email]);

  const ACL_PERMISSIONS: Record<string, PermissionDetail> = {
    l: {
      short: 'L',
      label: 'Lookup',
      description: 'Can see that the folder exists',
      color: 'gray',
    },
    r: { short: 'R', label: 'Read', description: 'Can read email contents', color: 'blue' },
    s: { short: 'S', label: 'Seen', description: 'Can mark emails as read/unread', color: 'green' },
    w: { short: 'W', label: 'Write', description: 'Can write message flags', color: 'yellow' },
    i: {
      short: 'I',
      label: 'Insert',
      description: 'Can add new emails to folder',
      color: 'purple',
    },
    p: { short: 'P', label: 'Post', description: 'Can post to the folder', color: 'indigo' },
    k: { short: 'K', label: 'Create', description: 'Can create subfolders', color: 'pink' },
    x: { short: 'X', label: 'Delete Box', description: 'Can delete the folder', color: 'red' },
    t: { short: 'T', label: 'Delete Msg', description: 'Can delete messages', color: 'orange' },
    e: {
      short: 'E',
      label: 'Expunge',
      description: 'Can permanently remove deleted messages',
      color: 'red',
    },
    a: {
      short: 'A',
      label: 'Admin',
      description: 'Can administer folder (change ACL)',
      color: 'red',
    },
    c: { short: 'C', label: 'Create Sub', description: 'Can create child folders', color: 'blue' },
    d: { short: 'D', label: 'Delete', description: 'Can delete messages and folder', color: 'red' },
  };
  const parseACLString = (aclString: string): PermissionDetail[] => {
    return aclString
      .split('')
      .map((char) => ACL_PERMISSIONS[char])
      .filter(Boolean);
  };

  const getPermissionOption = (permissions: string): PermissionOption => {
    return (
      PERMISSION_OPTIONS.find((opt) => opt.value === permissions) || {
        value: permissions,
        label: permissions,
        description: 'Custom permissions',
        color: 'gray' as const,
      }
    );
  };

  const handleAddACL = (data: ACLForm) => {
    if (!data.user_email.trim()) {
      toast.error({ description: 'Please enter a valid email address' });
      return;
    }

    setACL(
      {
        folder_path: folderPath,
        user: data.user_email.trim(),
        permissions: data.permissions,
      },
      {
        onSuccess: () => {
          toast.success({ description: 'Permissions added successfully' });
          aclForm.reset({ user_email: '', permissions: 'lrs' });
          refetchACL();
        },
        onError: (error: any) => {
          toast.error({ description: `Failed to add permissions: ${error.message}` });
        },
      }
    );
  };

  const handleRemoveACL = (userEmail: string) => {
    deleteACL(
      {
        folder_path: folderPath,
        intended_user: userEmail,
      },
      {
        onSuccess: () => {
          toast.success({ description: 'Permissions removed successfully' });
          refetchACL();
        },
        onError: (error: any) => {
          toast.error({ description: `Failed to remove permissions: ${error.message}` });
        },
      }
    );
  };

  const isLoading = isLoadingACL || isLoadingOwnACL;

  return (
    <DialogWrapper
      open={isOpen}
      onOpenChange={handleClose}
      title="Access Control List"
      description={`Manage permissions for: ${folderPath}`}
      width="min(90vw, 650px)"
    >
      {isLoading ? (
        <div className="p-6 text-center">
          <span className="text-[var(--gray-11)] text-sm">Loading permissions...</span>
        </div>
      ) : (
        <div className="p-3 sm:p-4">
          {/* Tab Navigation */}
          <div className="flex border-b border-[var(--gray-5)] mb-3 -mx-3 sm:mx-0">
            <button
              onClick={() => setActiveTab('view')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                activeTab === 'view'
                  ? 'border-[var(--accent-9)] text-[var(--accent-11)] bg-[var(--accent-2)]'
                  : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-2)]'
              }`}
            >
              <FaUsers className="w-3 h-3" />
              <span>View</span>
              {filteredACL && (
                <span className="px-1.5 py-0.5 bg-[var(--gray-5)] text-[var(--gray-11)] rounded-full text-[10px] font-semibold">
                  {filteredACL?.length}
                </span>
              )}
            </button>
            <button
              onClick={() => setActiveTab('add')}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-3 py-2 text-xs sm:text-sm font-medium border-b-2 transition-all ${
                activeTab === 'add'
                  ? 'border-[var(--accent-9)] text-[var(--accent-11)] bg-[var(--accent-2)]'
                  : 'border-transparent text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-2)]'
              }`}
            >
              <FaPlus className="w-3 h-3" />
              <span>Grant</span>
            </button>
          </div>

          {/* Scrollable Content */}
          <div className="pr-1 pb-2 ">
            {activeTab === 'view' && (
              <div className="space-y-3 pt-2">
                {/* Your Permissions */}
                {ownACLData?.acl && (
                  <div className="bg-gradient-to-br from-[var(--accent-2)] to-[var(--accent-3)] border border-[var(--accent-6)] rounded-lg p-3">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-1.5">
                        <div className="p-1 bg-[var(--accent-9)] rounded">
                          <FaShield className="w-3 h-3 text-white" />
                        </div>
                        <span className="text-xs font-bold text-[var(--accent-12)]">
                          Your Permissions
                        </span>
                      </div>
                      <Tooltip content="Your current access rights" side="left">
                        <FaInfoCircle className="w-3 h-3 text-[var(--accent-9)] cursor-help" />
                      </Tooltip>
                    </div>
                    <div className="flex flex-wrap gap-1">
                      {parseACLString(ownACLData.acl).map((permission, index) => (
                        <PermissionBadge key={index} permission={permission} />
                      ))}
                    </div>
                  </div>
                )}

                {/* All User Permissions */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-xs sm:text-sm font-bold text-[var(--gray-12)]">
                      Shared Access
                    </h3>
                    <span className="text-[10px] sm:text-xs text-[var(--gray-11)]">
                      {filteredACL?.length || 0} user{aclData?.acl?.length !== 1 ? 's' : ''}
                    </span>
                  </div>

                  {filteredACL && filteredACL?.length > 0 ? (
                    <div className="space-y-2 max-h-[35vh] overflow-y-auto  custom-scrollbar">
                      {filteredACL
                        ?.filter((acl) => acl.user !== userDetails.email)
                        .map((acl, index) => {
                          const option = getPermissionOption(acl.permissions);
                          const Icon = option.icon || FaLock;

                          return (
                            <div
                              key={index}
                              className="group bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-2.5 hover:border-[var(--gray-6)] hover:shadow-sm transition-all"
                            >
                              <div className="flex items-center justify-between mb-1.5">
                                <div className="flex items-center gap-2 flex-1 min-w-0">
                                  <div className="w-7 h-7 bg-gradient-to-br from-[var(--accent-9)] to-[var(--accent-10)] rounded-full flex items-center justify-center text-white text-[10px] font-bold flex-shrink-0">
                                    {acl.user.charAt(0).toUpperCase()}
                                  </div>
                                  <div className="flex-1 min-w-0">
                                    <div className="font-medium text-xs text-[var(--gray-12)] truncate">
                                      {acl.user}
                                    </div>
                                    <div className="flex items-center gap-1 mt-0.5">
                                      <Icon
                                        className={`w-2.5 h-2.5 text-[var(--${option.color}-11)]`}
                                      />
                                      <span className="text-[10px] text-[var(--gray-11)]">
                                        {option.label}
                                      </span>
                                    </div>
                                  </div>
                                </div>
                                <Tooltip content="Remove access" side="left">
                                  <button
                                    onClick={() => handleRemoveACL(acl.user)}
                                    disabled={isDeletingACL}
                                    className="p-1.5 text-[var(--red-11)] hover:bg-[var(--red-3)] rounded transition-all "
                                    aria-label={`Remove ${acl.user}`}
                                  >
                                    <FaTrash className="w-3 h-3" />
                                  </button>
                                </Tooltip>
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {parseACLString(acl.permissions).map((perm, idx) => (
                                  <PermissionBadge key={idx} permission={perm} />
                                ))}
                              </div>
                            </div>
                          );
                        })}
                    </div>
                  ) : (
                    <div className="p-4 text-center bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg">
                      <FaLock className="w-6 h-6 text-[var(--gray-9)] mx-auto mb-1.5" />
                      <p className="text-xs text-[var(--gray-11)] mb-0.5">No shared access</p>
                      <p className="text-[10px] text-[var(--gray-9)]">
                        Only you can access this folder
                      </p>
                    </div>
                  )}
                </div>

                {/* Info Box */}
                <div className="bg-[var(--blue-2)] border border-[var(--blue-5)] rounded-lg p-2.5">
                  <div className="flex gap-2">
                    <FaInfoCircle className="w-3.5 h-3.5 text-[var(--blue-11)] flex-shrink-0 mt-0.5" />
                    <p className="text-[10px] text-[var(--blue-11)] leading-relaxed">
                      <span className="font-semibold">Tip:</span> Hover over badges to see
                      permission details
                    </p>
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'add' && (
              <div className="space-y-3 pt-2">
                <div className="bg-[var(--gray-2)] border border-[var(--gray-5)] rounded-lg p-3">
                  <div className="space-y-3">
                    {/* Email Input */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--gray-12)] mb-1.5">
                        Share to
                        <Tooltip content="Enter email address to grant access" side="right">
                          <FaInfoCircle className="w-3 h-3 text-[var(--gray-9)] cursor-help" />
                        </Tooltip>
                      </label>
                      <input
                        {...aclForm.register('user_email', {
                          required: 'Email is required',
                          pattern: {
                            value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                            message: 'Please enter a valid email address',
                          },
                        })}
                        type="email"
                        placeholder="user@example.com"
                        className="w-full px-3 py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] text-sm placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all"
                      />
                    </div>

                    {/* Permission Dropdown */}
                    <div>
                      <label className="flex items-center gap-1.5 text-xs font-bold text-[var(--gray-12)] mb-1.5">
                        Permission Level
                        <Tooltip content="Choose access level" side="right">
                          <FaInfoCircle className="w-3 h-3 text-[var(--gray-9)] cursor-help" />
                        </Tooltip>
                      </label>

                      <Controller
                        name="permissions"
                        control={aclForm.control}
                        render={({ field }) => {
                          const permissionItems: DropdownItem[] = PERMISSION_OPTIONS.map(
                            (option) => ({
                              key: option.value,
                              label: `${option.label}`,
                              color: option.color,
                              selected: field.value === option.value,
                              onSelect: () => field.onChange(option.value),
                            })
                          );

                          const selectedOption = getPermissionOption(field.value);
                          const SelectedIcon = selectedOption.icon || FaLock;

                          return (
                            <>
                              <DropdownWrapper
                                items={permissionItems}
                                trigger={
                                  <button
                                    type="button"
                                    className="w-full flex items-center justify-between px-3 py-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg text-[var(--gray-12)] hover:bg-[var(--gray-2)] focus:outline-none focus:ring-2 focus:ring-[var(--accent-8)] focus:border-transparent transition-all"
                                  >
                                    <div className="flex items-center gap-2">
                                      <SelectedIcon
                                        className={`w-3 h-3 text-[var(--${selectedOption.color}-11)]`}
                                      />
                                      <span className="font-medium text-xs">
                                        {selectedOption.label}
                                      </span>
                                    </div>
                                    <FaChevronDown className="w-3 h-3 text-[var(--gray-9)]" />
                                  </button>
                                }
                              />

                              {/* Permission Preview */}
                              <div className="mt-2 p-2 bg-[var(--gray-1)] border border-[var(--gray-5)] rounded-lg">
                                <div className="text-[10px] text-[var(--gray-11)] mb-1">
                                  Will grant:
                                </div>
                                <div className="flex flex-wrap gap-1">
                                  {parseACLString(field.value).map((perm, idx) => (
                                    <PermissionBadge key={idx} permission={perm} />
                                  ))}
                                </div>
                              </div>
                            </>
                          );
                        }}
                      />
                    </div>

                    {/* Warning */}
                    <div className="bg-[var(--yellow-2)] border border-[var(--yellow-5)] rounded-lg p-2">
                      <div className="flex gap-2">
                        <FaInfoCircle className="w-3 h-3 text-[var(--yellow-11)] flex-shrink-0 mt-0.5" />
                        <p className="text-[10px] text-[var(--yellow-11)] leading-relaxed">
                          User will access this folder through their email client immediately
                        </p>
                      </div>
                    </div>

                    {/* Submit Button */}
                    <button
                      onClick={aclForm.handleSubmit(handleAddACL)}
                      disabled={isSettingACL}
                      className="w-full px-3 py-2 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] active:bg-[var(--accent-11)] text-white text-sm font-semibold rounded-lg transition-all shadow-sm hover:shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      <FaPlus className="w-3 h-3" />
                      {isSettingACL ? 'Granting...' : 'Grant Access'}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Custom Scrollbar */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 6px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: var(--gray-3);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: var(--gray-7);
          border-radius: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: var(--gray-8);
        }
      `}</style>
    </DialogWrapper>
  );
};

export default ACLManager;
