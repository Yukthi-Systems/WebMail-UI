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

// General.tsx
import {
  Button,
  Flex,
  ScrollArea,
  TextField,
  DropdownMenu,
  Card,
  Heading,
  Text,
} from '@radix-ui/themes';
import { useForm, Controller } from 'react-hook-form';
import { COLOR_OPTIONS, LOCALES, TIMEZONES } from '../../../utils/constants';
import { ToggleGroup } from './ToggleGroup';
import { SignatureSelector } from './SignatureSelector';
import type { UserSettings } from '../../../api/user';
import { Section } from './Section';
import { Settings } from './Settings';
import { useAtomValue } from 'jotai';
import {
  FaGlobe,
  FaSun,
  FaMoon,
  FaClock,
  FaPalette,
  FaSave,
  FaEnvelope,
  FaFolder,
  FaCog,
  FaEye,
  FaEdit,
  FaCode,
  FaUsers,
  FaChevronDown,
} from 'react-icons/fa';
import DropdownWrapper from '../../common/DropdownWrapper';
import { useToast } from '../../../hooks/useToast';
import FolderSelectField from '../../composer/FolderSelectField';
import { useFoldersDropdown } from '../../../hooks/useFolders';
import type { FolderNode } from '../../../utils/folderUtils';
import { useEffect, useState } from 'react';
import SignatureModal from './SignatureModal';
import { userDetailsAtom } from '../../../state/userDetails';
import { useSettingsBridge } from '../../../hooks/useSettingsBridge';
import { COMPOSE_BUTTON_OPTIONS } from '../../mailbox/composeButtonOptions';

type Signature = {
  name: string;
  content: string;
};

type GeneralProps = { data: UserSettings };

const General = ({ data }: GeneralProps) => {
  const userDetails = useAtomValue(userDetailsAtom);
  const toast = useToast();

  // Signature state management
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [editingSignature, setEditingSignature] = useState<Signature | null>(null);
  const [activeSection, setActiveSection] = useState<string>('appearance');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const { updateSettings, isUpdating: isPending } = useSettingsBridge();
  // Form initialization with proper structure
  const {
    register,
    handleSubmit,
    control,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<UserSettings>({
    defaultValues: data,
  });

  const { data: folderTree } = useFoldersDropdown();

  // Watch form values for real-time updates
  const watchedValues = watch();

  // Watch for form changes
  useEffect(() => {
    const subscription = watch(() => {
      setHasUnsavedChanges(true);
    });
    return () => subscription.unsubscribe();
  }, [watch]);

  // Helper function for folder path finding
  const findFolderByPath = (node: FolderNode, path: string): FolderNode | null => {
    if (node.path === path) return node;
    for (const child of node.children) {
      const found = findFolderByPath(child, path);
      if (found) return found;
    }
    return null;
  };

  const onSubmit = async (formData: UserSettings) => {
    const submitData: UserSettings = {
      ...formData,
      general: {
        ...formData.general,
        signature: formData.general.signature || [],

        from_address: formData.general.from_address || { name: '', email: '' },
      },
    };

    try {
      await updateSettings(submitData);

      setHasUnsavedChanges(false);
      toast.success({
        description: 'Your preferences have been saved successfully.',
      });
    } catch {
      toast.error({
        description: 'Failed to save settings. Please try again.',
        position: 'bottom-right',
      });
    }
  };

  // Signature management handlers
  const handleAddSignature = () => {
    setEditingSignature(null);
    setShowSignatureModal(true);
  };

  const handleEditSignature = (signature: Signature) => {
    setEditingSignature(signature);
    setShowSignatureModal(true);
  };

  const handleDeleteSignature = (signatureName: string) => {
    const currentSignatures = watchedValues.general.signature || [];
    const updatedSignatures = currentSignatures.filter((s) => s.name !== signatureName);

    setValue('general.signature', updatedSignatures);

    // Update selected signature if deleted one was selected
    if (watchedValues.general.selected_signature === signatureName) {
      const newSelection = updatedSignatures.length > 0 ? updatedSignatures[0].name : '';
      setValue('general.selected_signature', newSelection);
    }
  };

  const handleSaveSignature = async (signature: Signature) => {
    // 1. Calculate the new list of signatures
    const currentSignatures = watchedValues.general.signature || [];
    let updatedSignatures: Signature[];
    let newSelectedSignature = watchedValues.general.selected_signature;

    if (editingSignature) {
      // Edit existing
      updatedSignatures = currentSignatures.map((s) =>
        s.name === editingSignature.name ? signature : s
      );

      // If we edited the currently selected signature, update the selection reference
      if (watchedValues.general.selected_signature === editingSignature.name) {
        newSelectedSignature = signature.name;
        setValue('general.selected_signature', signature.name);
      }
    } else {
      // Add new
      updatedSignatures = [...currentSignatures, signature];

      // If this is the first signature, auto-select it
      if (!watchedValues.general.selected_signature) {
        newSelectedSignature = signature.name;
        setValue('general.selected_signature', signature.name);
      }
    }

    // 2. Update the Form State (Immediate UI feedback)
    setValue('general.signature', updatedSignatures);

    const submitData: UserSettings = {
      ...watchedValues,
      general: {
        ...watchedValues.general,
        signature: updatedSignatures,
        selected_signature: newSelectedSignature,
        from_address: watchedValues.general.from_address || { name: '', email: '' },
      },
    };

    // 4. Use the Bridge to save
    try {
      await updateSettings(submitData);

      // Success
      toast.success({ description: 'Signature saved', duration: 2000 });
      setShowSignatureModal(false);
      setEditingSignature(null);

      // Since we saved 'watchedValues', the form is now clean
      setHasUnsavedChanges(false);
    } catch {
      // Error (Bridge automatically handles the state rollback)
      toast.error({ description: 'Failed to save signature. Please try again.' });
    }
  };

  const handleSignatureChange = (signatureName: string) => {
    setValue('general.selected_signature', signatureName);
  };

  // Get current signatures from form state
  const currentSignatures = watchedValues.general.signature || [];

  // Mobile navigation sections
  const mobileSections = [
    { id: 'appearance', label: 'Appearance', icon: FaPalette },
    { id: 'email', label: 'Email', icon: FaEnvelope },
    { id: 'signature', label: 'Signature', icon: FaEdit },
    { id: 'interface', label: 'Interface', icon: FaEye },
    { id: 'contacts', label: 'Contacts', icon: FaUsers },
    { id: 'folders', label: 'Folders', icon: FaFolder },
  ];

  const MobileSectionNav = () => (
    <div className="lg:hidden sticky top-0 z-10 bg-[var(--gray-1)] border-b border-[var(--gray-5)] p-4">
      <DropdownWrapper
        items={mobileSections.map((section) => ({
          key: section.id,
          label: section.label,
          icon: section.icon,
          selected: activeSection === section.id,
          onSelect: () => setActiveSection(section.id),
        }))}
        trigger={
          <Button variant="outline" className="w-full justify-between">
            <Flex align="center" gap="2">
              {(() => {
                const CurrentIcon =
                  mobileSections.find((s) => s.id === activeSection)?.icon || FaCog;
                return <CurrentIcon />;
              })()}
              <span>
                {mobileSections.find((s) => s.id === activeSection)?.label || 'Select Section'}
              </span>
            </Flex>
            <FaChevronDown className="w-3 h-3" />
          </Button>
        }
      />
    </div>
  );

  const renderMobileSection = () => {
    switch (activeSection) {
      case 'appearance':
        return (
          <Section title="Appearance" description="Customize how the application looks and feels">
            <div className="space-y-6">
              <Settings label="Theme" description="Choose between light and dark mode">
                <Controller
                  name="ui.theme"
                  control={control}
                  render={({ field }) => (
                    <Flex gap="3">
                      <Button
                        variant={field.value === 'light' ? 'solid' : 'outline'}
                        onClick={() => field.onChange('light')}
                        className="flex-1"
                      >
                        <FaSun className="mr-2" />
                        Light
                      </Button>
                      <Button
                        variant={field.value === 'dark' ? 'solid' : 'outline'}
                        onClick={() => field.onChange('dark')}
                        className="flex-1"
                      >
                        <FaMoon className="mr-2" />
                        Dark
                      </Button>
                    </Flex>
                  )}
                />
              </Settings>

              <Settings label="Color Scheme" description="Choose your primary color theme">
                <Controller
                  name="ui.color_scheme"
                  control={control}
                  render={({ field }) => (
                    <div className="grid grid-cols-5 gap-2">
                      {COLOR_OPTIONS.map((color) => (
                        <button
                          key={color.value}
                          type="button"
                          className={`w-8 h-8 sm:w-10 sm:h-10 rounded-full border-2 transition-all duration-200 ${
                            field.value === color.value
                              ? 'border-gray-900 scale-110'
                              : 'border-gray-300 hover:border-gray-400'
                          }`}
                          style={{ backgroundColor: `var(--${color.value}-9)` }}
                          onClick={() => field.onChange(color.value)}
                          title={color.label}
                        />
                      ))}
                    </div>
                  )}
                />
              </Settings>

              <Settings label="Language" description="Select your preferred language">
                <Controller
                  name="ui.language"
                  control={control}
                  render={({ field }) => (
                    <DropdownWrapper
                      items={LOCALES.map((locale) => ({
                        key: locale.value,
                        label: locale.label,
                        icon: FaGlobe,
                        selected: field.value === locale.value,
                        onSelect: () => field.onChange(locale.value),
                      }))}
                      trigger={
                        <Button variant="outline" className="w-full justify-between">
                          <Flex align="center" gap="2">
                            <FaGlobe />
                            <span>
                              {LOCALES.find((l) => l.value === field.value)?.label ||
                                'Select language'}
                            </span>
                          </Flex>
                          <DropdownMenu.TriggerIcon />
                        </Button>
                      }
                    />
                  )}
                />
              </Settings>

              <Settings label="Timezone">
                <Controller
                  name="ui.timezone"
                  control={control}
                  render={({ field }) => {
                    const timezoneItems = TIMEZONES.map((timezone) => ({
                      key: timezone.value,
                      label: timezone.label,
                      icon: FaClock,
                      selected: field.value === timezone.value,
                      onSelect: () => field.onChange(timezone.value),
                    }));

                    const selectedTimezone = TIMEZONES.find((t) => t.value === field.value);

                    return (
                      <DropdownWrapper
                        items={timezoneItems}
                        trigger={
                          <Button variant="outline" className="w-full justify-between">
                            <div className="flex items-center gap-2">
                              <FaClock />
                              <span className="truncate">
                                {selectedTimezone?.label || 'Select timezone...'}
                              </span>
                            </div>
                            <DropdownMenu.TriggerIcon />
                          </Button>
                        }
                      />
                    );
                  }}
                />
              </Settings>
              <Settings
                label="Time Format"
                description="Choose how time is displayed throughout the app"
              >
                <Controller
                  name="ui.time_format" // Ensure this is added to your UserSettings type
                  control={control}
                  render={({ field }) => (
                    <Flex gap="3">
                      <Button
                        variant={field.value === '12h' ? 'solid' : 'outline'}
                        onClick={() => field.onChange('12h')}
                        className="flex-1"
                      >
                        12-hour (AM/PM)
                      </Button>
                      <Button
                        variant={field.value === '24h' ? 'solid' : 'outline'}
                        onClick={() => field.onChange('24h')}
                        className="flex-1"
                      >
                        24-hour
                      </Button>
                    </Flex>
                  )}
                />
              </Settings>

              <Settings label="Compose Button" description="Choose the compose button style">
                <Controller
                  name="ui.compose_button_style"
                  control={control}
                  render={({ field }) => (
                    <div className="flex gap-2">
                      {COMPOSE_BUTTON_OPTIONS.map((option) => (
                        <button
                          key={option.value}
                          type="button"
                          onClick={() => field.onChange(option.value)}
                          className={`compose-preview-card flex-1 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                            field.value === option.value
                              ? 'border-[var(--accent-9)] bg-[var(--accent-1)]'
                              : 'border-[var(--gray-3)] hover:border-[var(--gray-5)]'
                          }`}
                        >
                          {/* mini preview pill */}
                          <div className="h-7 flex items-center justify-center mb-2">
                            {option.value === 'default' && (
                              <div className="relative overflow-hidden px-3 py-1 bg-[var(--accent-9)] text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1">
                                <span
                                  className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
                                  style={{
                                    width: '45%',
                                  }}
                                />
                                <FaEdit size={9} className="relative z-10" />
                                <span className="relative z-10">Compose</span>
                              </div>
                            )}

                            {option.value === 'compact' && (
                              <div className="relative overflow-hidden px-2 py-0.5 bg-[var(--accent-9)] text-white text-xs font-medium rounded flex items-center gap-1">
                                <span
                                  className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
                                  style={{
                                    width: '45%',
                                  }}
                                />
                                <FaEdit size={9} className="relative z-10" />
                                <span className="relative z-10">Compose</span>
                              </div>
                            )}

                            {option.value === 'minimal' && (
                              <div className="compose-preview-minimal px-2 py-0.5 text-[var(--accent-9)] text-xs font-medium rounded  flex items-center gap-1">
                                <FaEdit size={9} />
                                Compose
                              </div>
                            )}
                          </div>

                          <div className="text-xs font-semibold text-[var(--gray-12)]">
                            {option.label}
                          </div>
                          <div className="text-xs text-[var(--gray-11)]">{option.description}</div>
                        </button>
                      ))}
                    </div>
                  )}
                />
              </Settings>

              {/* <Settings label="Font Size" description="Adjust the text size">
                <Controller
                  name="ui.font_size"
                  control={control}
                  render={({ field }) => (
                    <div className="space-y-2">
                      <input
                        type="range"
                        min="12"
                        max="20"
                        step="2"
                        value={field.value}
                        onChange={(e) => field.onChange(Number(e.target.value))}
                        className="w-full"
                      />
                      <Flex justify="between">
                        <Text size="1" className="text-gray-600">
                          Small
                        </Text>
                        <Text size="2" className="text-gray-600">
                          Medium
                        </Text>
                        <Text size="3" className="text-gray-600">
                          Large
                        </Text>
                      </Flex>
                    </div>
                  )}
                />
              </Settings> */}
            </div>
          </Section>
        );

      case 'email':
        return (
          <Section
            title="Email Settings"
            description="Configure how emails are displayed and managed"
          >
            <div className="space-y-6">
              <Settings
                label="Emails per page"
                description="Number of emails to show in your inbox"
              >
                <Controller
                  name="email.mails_per_page"
                  control={control}
                  render={({ field }) => (
                    <DropdownWrapper
                      items={[10, 20, 30, 40, 50].map((count) => ({
                        key: count.toString(),
                        label: `${count} emails`,
                        selected: field.value === count,
                        onSelect: () => field.onChange(count),
                      }))}
                      trigger={
                        <Button variant="outline" className="w-full justify-between">
                          <span>{field.value} emails per page</span>
                          <DropdownMenu.TriggerIcon />
                        </Button>
                      }
                    />
                  )}
                />
              </Settings>

              <Settings label="Undo Send" description="Time window to cancel sending an email">
                <Controller
                  name="email.undo_send"
                  control={control}
                  render={({ field }) => (
                    <DropdownWrapper
                      items={[3, 5, 10, 25, 30].map((seconds) => ({
                        key: seconds.toString(),
                        label: `${seconds} seconds`,
                        selected: field.value === seconds,
                        onSelect: () => field.onChange(seconds),
                      }))}
                      trigger={
                        <Button variant="outline" className="w-full justify-between">
                          <span>Cancel send within {field.value} seconds</span>
                          <DropdownMenu.TriggerIcon />
                        </Button>
                      }
                    />
                  )}
                />
              </Settings>

              <Settings label="Expand Message Threads">
                <Controller
                  name="email.mail_thead_view"
                  control={control}
                  render={({ field }) => (
                    <DropdownWrapper
                      items={['never', 'all threads'].map((value) => ({
                        key: value,
                        label: `${value}`,
                        selected: field.value === value,
                        onSelect: () => field.onChange(value),
                      }))}
                      trigger={
                        <Button variant="outline" className="w-full justify-between">
                          <span>{field.value}</span>
                          <DropdownMenu.TriggerIcon />
                        </Button>
                      }
                    />
                  )}
                ></Controller>
              </Settings>

              <Settings label="Default View">
                <Controller
                  name="email.default_view"
                  control={control}
                  render={({ field }) => {
                    const selectedFolderName = (() => {
                      if (!field.value) return 'INBOX';
                      if (folderTree && folderTree.length > 0) {
                        for (const rootFolder of folderTree) {
                          const found = findFolderByPath(rootFolder, field.value);
                          if (found) return found.name;
                        }
                      }
                      return field.value;
                    })();

                    return (
                      <div className="w-full">
                        <FolderSelectField
                          folder={field.value || 'INBOX'}
                          onChange={(selectedFolder) => field.onChange(selectedFolder)}
                          trigger={
                            <Button variant="outline" className="w-full justify-between">
                              <span className="truncate">{selectedFolderName}</span>
                              <DropdownMenu.TriggerIcon />
                            </Button>
                          }
                        />
                      </div>
                    );
                  }}
                />
              </Settings>

              <div>
                <Heading size="4" className="mb-4">
                  Compose Email
                </Heading>
                <ToggleGroup
                  control={control}
                  toggles={[
                    { name: 'compose.show_to_field', label: 'Show To Field' },
                    { name: 'compose.show_cc_field', label: 'Show CC Field' },
                    { name: 'compose.show_bcc_field', label: 'Show BCC Field' },
                  ]}
                  columns={1}
                />
                <div className="mt-4">
                  <Settings
                    label="Default Editor Tab"
                    description="Choose the default editor tab when composing emails"
                  >
                    <Controller
                      name="compose.default_editor_tab"
                      control={control}
                      render={({ field }) => (
                        <Flex gap="3">
                          <Button
                            variant={(field.value ?? 'richtext') === 'richtext' ? 'solid' : 'outline'}
                            onClick={() => field.onChange('richtext')}
                            className="flex-1"
                          >
                            <FaEdit className="mr-2" />
                            Rich Text
                          </Button>
                          <Button
                            variant={field.value === 'code' ? 'solid' : 'outline'}
                            onClick={() => field.onChange('code')}
                            className="flex-1"
                          >
                            <FaCode className="mr-2" />
                            HTML
                          </Button>
                        </Flex>
                      )}
                    />
                  </Settings>
                </div>
              </div>

              <div>
                <Heading size="4" className="mb-4">
                  Email Display Options
                </Heading>
                <ToggleGroup
                  control={control}
                  toggles={[
                    {
                      name: 'email.show_recipient',
                      label: 'Show Recipient',
                      description: 'Display recipient and other information on hover',
                    },
                    {
                      name: 'email.show_attachments',
                      label: 'Show Attachments',
                      description: 'Show attachment indicators',
                    },
                    {
                      name: 'email.show_body',
                      label: 'Show Body',
                      description: 'Display email body content',
                    },
                    {
                      name: 'email.show_quick_hover_actions', // New Setting
                      label: 'Quick Hover Actions',
                      description:
                        'Show action buttons (Delete, Flag, Move) when hovering over emails while viewing any email',
                    },
                  ]}
                  columns={1}
                />
              </div>
            </div>
          </Section>
        );

      case 'signature':
        return (
          <Section
            title="Email Signature"
            description="Manage your email signatures for outgoing messages"
          >
            <div className="space-y-6">
              <Settings
                label="Default Signature"
                description="Choose which signature to use by default"
              >
                <SignatureSelector
                  signatures={currentSignatures}
                  selectedSignature={watchedValues.general.selected_signature}
                  onSignatureChange={handleSignatureChange}
                  onAddSignature={handleAddSignature}
                  onEditSignature={handleEditSignature}
                  onDeleteSignature={handleDeleteSignature}
                />
              </Settings>

              <Settings label="Display Name" description="Set your default sender information">
                <div className="space-y-3">
                  <TextField.Root
                    {...register('general.from_address.name')}
                    placeholder="Your display name"
                    className="w-full"
                  />
                  <TextField.Root
                    {...register('general.from_address.email')}
                    placeholder="your.email@example.com"
                    type="email"
                    className="w-full"
                  />
                </div>
              </Settings>

              <Settings
                label="Reply-To Address"
                description="Default address for replies (optional)"
              >
                <TextField.Root
                  {...register('general.reply_to')}
                  placeholder="reply-to@example.com"
                  type="email"
                  className="w-full"
                />
              </Settings>
            </div>
          </Section>
        );

      case 'interface':
        return (
          <Section
            title="Interface Options"
            description="Customize what elements are visible in the interface"
          >
            <div className="space-y-6">
              <div>
                <Heading size="4" className="mb-4">
                  UI Elements
                </Heading>
                <ToggleGroup
                  control={control}
                  toggles={[
                    // {
                    //   name: 'ui.show_notifications',
                    //   label: 'Show Notifications',
                    //   description: 'Display notification badges',
                    // },
                    // {
                    //   name: 'ui.show_tooltips',
                    //   label: 'Show Tooltips',
                    //   description: 'Show helpful hints on hover',
                    // },
                    // {
                    //   name: 'ui.show_avatars',
                    //   label: 'Show Avatars',
                    //   description: 'Display profile pictures',
                    // },
                    {
                      name: 'ui.show_sidebar',
                      label: 'Show Sidebar',
                      description: 'Keep sidebar visible',
                    },
                    // {
                    //   name: 'ui.show_quick_actions',
                    //   label: 'Show Quick Actions',
                    //   description: 'Display quick action buttons',
                    // },
                    {
                      name: 'ui.show_search_bar',
                      label: 'Show Search Bar',
                      description: 'Keep search bar visible',
                    },
                  ]}
                  columns={1}
                />
              </div>

              <div>
                <Heading size="4" className="mb-4">
                  Email Actions
                </Heading>
                <ToggleGroup
                  control={control}
                  toggles={[
                    { name: 'email.show_reply_button', label: 'Show Reply Button' },
                    { name: 'email.show_forward_button', label: 'Show Forward Button' },
                    { name: 'email.show_delete_button', label: 'Show Delete Button' },
                    { name: 'email.show_mark_as_read_button', label: 'Show Mark as Read' },
                    { name: 'email.show_mark_as_unread_button', label: 'Show Mark as Unread' },
                    // { name: 'email.show_star_button', label: 'Show Star Button' },
                    { name: 'email.show_header_button', label: 'Show Header Button' },
                  ]}
                  columns={1}
                />
              </div>
            </div>
          </Section>
        );

      case 'contacts':
        return (
          <Section title="Contacts Settings" description="Customize the contact menu">
            <div className="space-y-6">
              <div>
                <Heading size="4" className="mb-4">
                  Contact Elements
                </Heading>
                <ToggleGroup
                  control={control}
                  toggles={[
                    {
                      name: 'contacts.show_name',
                      label: 'Show Name',
                      description: 'Display name field in contacts',
                    },
                    {
                      name: 'contacts.show_email',
                      label: 'Show Email',
                      description: 'Display email field in contacts',
                    },
                    {
                      name: 'contacts.show_phone',
                      label: 'Show Phone',
                      description: 'Display phone field in contacts',
                    },
                    {
                      name: 'contacts.show_notes',
                      label: 'Show Notes',
                      description: 'Display notes field in contacts',
                    },
                    // {
                    //   name: 'contacts.show_address',
                    //   label: 'Show Address',
                    //   description: 'Display address field in contacts',
                    // },
                    // {
                    //   name: 'contacts.show_website',
                    //   label: 'Show Website',
                    //   description: 'Display website field in contacts',
                    // },
                    // {
                    //   name: 'contacts.show_birthday',
                    //   label: 'Show Birthday',
                    //   description: 'Display birthday field in contacts',
                    // },
                    // {
                    //   name: 'contacts.show_created_date',
                    //   label: 'Show Created Date',
                    //   description: 'Display created date field in contacts',
                    // },
                    // {
                    //   name: 'contacts.show_updated_date',
                    //   label: 'Show Updated Date',
                    //   description: 'Display updated date field in contacts',
                    // },
                  ]}
                  columns={1}
                />
              </div>
            </div>
          </Section>
        );

      case 'folders':
        return (
          <Section title="Folder Settings">
            {data?.folders &&
              Object.entries(data.folders)
                .filter(([folderKey]) =>
                  ['inbox', 'sent', 'drafts', 'spam', 'trash'].includes(folderKey)
                )
                .map(([folderKey]) => (
                  <div
                    key={folderKey}
                    className="border-b border-gray-200 pb-4 mb-4 last:border-b-0"
                  >
                    <h4 className="font-semibold text-lg mb-3 capitalize">{folderKey} Folder</h4>

                    <Settings label="Folder Label">
                      <TextField.Root
                        {...register(`folders.${folderKey}.label`)}
                        placeholder="Folder label"
                        className="w-full"
                      />
                    </Settings>

                    {/* Commented out - Color picker not needed currently
                    <Settings label="Folder Color">
                      <Controller
                        name={`folders.${folderKey}.color`}
                        control={control}
                        render={({ field }) => (
                          <div className="flex gap-2 items-center mt-4">
                            <div
                              className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center"
                              style={{ backgroundColor: field.value || 'transparent' }}
                            >
                              <input
                                type="color"
                                value={field.value}
                                onChange={field.onChange}
                                className="w-15 h-15 cursor-pointer border-transparent p-0 m-0 outline-transparent"
                              />
                            </div>
                            <TextField.Root
                              value={field.value}
                              onChange={field.onChange}
                              placeholder="#HEX Color"
                              className="flex-1 w-full"
                            />
                          </div>
                        )}
                      />
                    </Settings>
                    */}

                    <ToggleGroup
                      control={control}
                      toggles={[
                        {
                          name: `folders.${folderKey}.visible`,
                          label: 'Show in Folder',
                          description: 'Display this folder in the main folder list and navigation',
                        },
                        // {
                        //   name: `folders.${folderKey}.show_in_sidebar`,
                        //   label: 'Show in Sidebar',
                        //   description: 'Make this folder visible in the sidebar for quick access',
                        // },
                        {
                          name: `folders.${folderKey}.show_label`,
                          label: 'Show Label',
                          description: 'Display the folder name next to its icon',
                        },
                        {
                          name: `folders.${folderKey}.show_unread_count`,
                          label: 'Show Unread Count',
                          description: 'Display the number of unread emails in this folder',
                        },
                        // {
                        //   name: `folders.${folderKey}.show_starred_count`,
                        //   label: 'Show Starred Count',
                        //   description: 'Display the number of starred emails in this folder',
                        // },
                      ]}
                      columns={1}
                    />

                    <Settings label="Description">
                      <TextField.Root
                        {...register(`folders.${folderKey}.description`)}
                        placeholder="Folder description"
                        className="w-full mt-2"
                      />
                    </Settings>
                  </div>
                ))}
          </Section>
        );

      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-[var(--gray-1)]">
      <Card className="w-full mx-auto ">
        <form onSubmit={handleSubmit(onSubmit)}>
          {/* Mobile Header */}
          <div className="lg:hidden p-4 border-b border-gray-200">
            <Flex justify="between" align="center">
              <div>
                <Heading size="5" className="text-[var(--grey-10)]">
                  Settings
                </Heading>
                <Text size="1" color="gray">
                  Customize your experience
                </Text>
              </div>
            </Flex>
          </div>
          {/* Desktop Header */}
          <div className="hidden lg:block p-6 border-b border-gray-200">
            <Flex justify="between" align="center">
              <div>
                <Heading size="7" className="text-[var(--grey-10)] mb-2">
                  Settings & Preferences
                </Heading>
                <Text color="gray" className="text-base">
                  Customize your email experience and application appearance
                </Text>
              </div>
            </Flex>
          </div>
          {/* Mobile Navigation */}
          <MobileSectionNav />
          <ScrollArea type="auto" scrollbars="vertical" className="h-[calc(100vh-200px)]">
            <div className="p-4 lg:p-6 space-y-6 lg:space-y-8">
              {/* Mobile: Single section view */}
              <div className="lg:hidden">{renderMobileSection()}</div>

              {/* Desktop: All sections */}
              <div className="hidden lg:block space-y-8">
                {/* Appearance Section */}
                <Section
                  title={
                    <Flex align="center" gap="3">
                      <FaPalette className="text-purple-600" />
                      <span>Appearance</span>
                    </Flex>
                  }
                  description="Customize how the application looks and feels"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Settings label="Theme" description="Choose between light and dark mode">
                      <Controller
                        name="ui.theme"
                        control={control}
                        render={({ field }) => (
                          <Flex gap="3">
                            <Button
                              variant={field.value === 'light' ? 'solid' : 'outline'}
                              onClick={() => field.onChange('light')}
                              className="flex-1"
                            >
                              <FaSun className="mr-2" />
                              Light
                            </Button>
                            <Button
                              variant={field.value === 'dark' ? 'solid' : 'outline'}
                              onClick={() => field.onChange('dark')}
                              className="flex-1"
                            >
                              <FaMoon className="mr-2" />
                              Dark
                            </Button>
                          </Flex>
                        )}
                      />
                    </Settings>

                    <Settings label="Color Scheme" description="Choose your primary color theme">
                      <Controller
                        name="ui.color_scheme"
                        control={control}
                        render={({ field }) => (
                          <div className="grid grid-cols-5 gap-2">
                            {COLOR_OPTIONS.map((color) => (
                              <button
                                key={color.value}
                                type="button"
                                className={`w-10 h-10 rounded-full border-2 transition-all duration-200 ${
                                  field.value === color.value
                                    ? 'border-gray-900 scale-110'
                                    : 'border-gray-300 hover:border-gray-400'
                                }`}
                                style={{ backgroundColor: `var(--${color.value}-9)` }}
                                onClick={() => field.onChange(color.value)}
                                title={color.label}
                              />
                            ))}
                          </div>
                        )}
                      />
                    </Settings>

                    <Settings label="Language" description="Select your preferred language">
                      <Controller
                        name="ui.language"
                        control={control}
                        render={({ field }) => (
                          <DropdownWrapper
                            items={LOCALES.map((locale) => ({
                              key: locale.value,
                              label: locale.label,
                              icon: FaGlobe,
                              selected: field.value === locale.value,
                              onSelect: () => field.onChange(locale.value),
                            }))}
                            trigger={
                              <Button variant="outline" className="w-full justify-between">
                                <Flex align="center" gap="2">
                                  <FaGlobe />
                                  <span>
                                    {LOCALES.find((l) => l.value === field.value)?.label ||
                                      'Select language'}
                                  </span>
                                </Flex>
                                <DropdownMenu.TriggerIcon />
                              </Button>
                            }
                          />
                        )}
                      />
                    </Settings>

                    <Settings label="Timezone">
                      <Controller
                        name="ui.timezone"
                        control={control}
                        render={({ field }) => {
                          const timezoneItems = TIMEZONES.map((timezone) => ({
                            key: timezone.value,
                            label: timezone.label,
                            icon: FaClock,
                            selected: field.value === timezone.value,
                            onSelect: () => field.onChange(timezone.value),
                          }));

                          const selectedTimezone = TIMEZONES.find((t) => t.value === field.value);

                          return (
                            <DropdownWrapper
                              items={timezoneItems}
                              trigger={
                                <Button variant="outline" className="min-w-[300px] justify-between">
                                  <div className="flex items-center gap-2">
                                    <FaClock />
                                    <span>{selectedTimezone?.label || 'Select timezone...'}</span>
                                  </div>
                                  <DropdownMenu.TriggerIcon />
                                </Button>
                              }
                            />
                          );
                        }}
                      />
                    </Settings>

                    <Settings
                      label="Time Format"
                      description="Choose how time is displayed throughout the app"
                    >
                      <Controller
                        name="ui.time_format" // Ensure this is added to your UserSettings type
                        control={control}
                        render={({ field }) => (
                          <Flex gap="3">
                            <Button
                              variant={field.value === '12h' ? 'solid' : 'outline'}
                              onClick={() => field.onChange('12h')}
                              className="flex-1"
                            >
                              12-hour (AM/PM)
                            </Button>
                            <Button
                              variant={field.value === '24h' ? 'solid' : 'outline'}
                              onClick={() => field.onChange('24h')}
                              className="flex-1"
                            >
                              24-hour
                            </Button>
                          </Flex>
                        )}
                      />
                    </Settings>

                    <Settings label="Compose Button" description="Choose the compose button style">
                      <Controller
                        name="ui.compose_button_style"
                        control={control}
                        render={({ field }) => (
                          <div className="flex gap-2">
                            {COMPOSE_BUTTON_OPTIONS.map((option) => (
                              <button
                                key={option.value}
                                type="button"
                                onClick={() => field.onChange(option.value)}
                                className={`compose-preview-card flex-1 p-3 rounded-lg border-2 text-left transition-all duration-200 ${
                                  field.value === option.value
                                    ? 'border-[var(--accent-9)] bg-[var(--accent-1)]'
                                    : 'border-[var(--gray-3)] hover:border-[var(--gray-5)]'
                                }`}
                              >
                                {/* mini preview pill */}
                                <div className="h-7 flex items-center justify-center mb-2">
                                  {option.value === 'default' && (
                                    <div className="relative overflow-hidden px-3 py-1 bg-[var(--accent-9)] text-white text-xs font-medium rounded-md shadow-sm flex items-center gap-1">
                                      <span
                                        className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
                                        style={{
                                          width: '45%',
                                        }}
                                      />
                                      <FaEdit size={9} className="relative z-10" />
                                      <span className="relative z-10">Compose</span>
                                    </div>
                                  )}

                                  {option.value === 'compact' && (
                                    <div className="relative overflow-hidden px-2 py-0.5 bg-[var(--accent-9)] text-white text-xs font-medium rounded flex items-center gap-1">
                                      <span
                                        className="compose-shimmer absolute inset-y-0 left-0 pointer-events-none"
                                        style={{
                                          width: '45%',
                                        }}
                                      />
                                      <FaEdit size={9} className="relative z-10" />
                                      <span className="relative z-10">Compose</span>
                                    </div>
                                  )}

                                  {option.value === 'minimal' && (
                                    <div className="compose-preview-minimal px-2 py-0.5 text-[var(--accent-9)] text-xs font-medium rounded  flex items-center gap-1">
                                      <FaEdit size={9} />
                                      Compose
                                    </div>
                                  )}
                                </div>

                                <div className="text-xs font-semibold text-[var(--gray-12)]">
                                  {option.label}
                                </div>
                                <div className="text-xs text-[var(--gray-11)]">
                                  {option.description}
                                </div>
                              </button>
                            ))}
                          </div>
                        )}
                      />
                    </Settings>

                    {/* <Settings label="Font Size" description="Adjust the text size">
                      <Controller
                        name="ui.font_size"
                        control={control}
                        render={({ field }) => (
                          <div className="space-y-2">
                            <input
                              type="range"
                              min="12"
                              max="20"
                              step="2"
                              value={field.value}
                              onChange={(e) => field.onChange(Number(e.target.value))}
                              className="w-full"
                            />
                            <Flex justify="between">
                              <Text size="1" className="text-gray-600">
                                Small
                              </Text>
                              <Text size="2" className="text-gray-600">
                                Medium
                              </Text>
                              <Text size="3" className="text-gray-600">
                                Large
                              </Text>
                            </Flex>
                          </div>
                        )}
                      />
                    </Settings> */}
                  </div>
                </Section>

                {/* Email Settings */}
                <Section
                  title={
                    <Flex align="center" gap="3">
                      <FaEnvelope className="text-blue-600" />
                      <span>Email Settings</span>
                    </Flex>
                  }
                  description="Configure how emails are displayed and managed"
                >
                  <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
                    <Settings
                      label="Emails per page"
                      description="Number of emails to show in your inbox"
                    >
                      <Controller
                        name="email.mails_per_page"
                        control={control}
                        render={({ field }) => (
                          <DropdownWrapper
                            items={[10, 20, 30, 40, 50].map((count) => ({
                              key: count.toString(),
                              label: `${count} emails`,
                              selected: field.value === count,
                              onSelect: () => field.onChange(count),
                            }))}
                            trigger={
                              <Button variant="outline" className="w-full justify-between">
                                <span>{field.value} emails per page</span>
                                <DropdownMenu.TriggerIcon />
                              </Button>
                            }
                          />
                        )}
                      />
                    </Settings>

                    <Settings
                      label="Undo Send"
                      description="Time window to cancel sending an email"
                    >
                      <Controller
                        name="email.undo_send"
                        control={control}
                        render={({ field }) => (
                          <DropdownWrapper
                            items={[3, 5, 10, 25, 30].map((seconds) => ({
                              key: seconds.toString(),
                              label: `${seconds} seconds`,
                              selected: field.value === seconds,
                              onSelect: () => field.onChange(seconds),
                            }))}
                            trigger={
                              <Button variant="outline" className="w-full justify-between">
                                <span>Cancel send within {field.value} seconds</span>
                                <DropdownMenu.TriggerIcon />
                              </Button>
                            }
                          />
                        )}
                      />
                    </Settings>
                    <Settings
                      label="Thread Sort Order"
                      description="Choose how messages are ordered within a conversation"
                    >
                      <Controller
                        name="email.thread_sort_order" // Ensure this exists in your GeneralSettings type
                        control={control}
                        render={({ field }) => (
                          <DropdownWrapper
                            items={[
                              {
                                key: 'asc',
                                label: 'Oldest first (Ascending)',
                                selected: field.value === 'asc',
                              },
                              {
                                key: 'desc',
                                label: 'Newest first (Descending)',
                                selected: field.value === 'desc',
                              },
                            ].map((item) => ({
                              ...item,
                              onSelect: () => field.onChange(item.key),
                            }))}
                            trigger={
                              <Button variant="outline" className="w-full justify-between">
                                <span>
                                  {field.value === 'desc' ? 'Newest first' : 'Oldest first'}
                                </span>
                                <FaChevronDown className="opacity-50" />
                              </Button>
                            }
                          />
                        )}
                      />
                    </Settings>

                    {/* <Settings label="Default View">
                      <Controller
                        name="email.default_view"
                        control={control}
                        render={({ field }) => {
                          const selectedFolderName = (() => {
                            if (!field.value) return 'INBOX';
                            if (folderTree && folderTree.length > 0) {
                              for (const rootFolder of folderTree) {
                                const found = findFolderByPath(rootFolder, field.value);
                                if (found) return found.name;
                              }
                            }
                            return field.value;
                          })();

                          return (
                            <div className="w-full">
                              <FolderSelectField
                                folder={field.value || 'INBOX'}
                                onChange={(selectedFolder) => field.onChange(selectedFolder)}
                                trigger={
                                  <Button
                                    variant="outline"
                                    className="min-w-[200px] justify-between"
                                  >
                                    <span className="truncate">{selectedFolderName}</span>
                                    <DropdownMenu.TriggerIcon />
                                  </Button>
                                }
                              />
                            </div>
                          );
                        }}
                      />
                    </Settings> */}

                    {/* <Settings label="Sent Folder" description="Choose where sent emails are saved">
                      <Controller
                        name="email.sent_folder"
                        control={control}
                        render={({ field }) => {
                          const selectedFolderName = (() => {
                            if (!field.value) return 'Sent';
                            if (folderTree && folderTree.length > 0) {
                              for (const rootFolder of folderTree) {
                                const found = findFolderByPath(rootFolder, field.value);
                                if (found) return found.name;
                              }
                            }
                            return field.value;
                          })();

                          return (
                            <div className="w-full">
                              <FolderSelectField
                                folder={field.value || 'Sent'}
                                onChange={(selectedFolder) => field.onChange(selectedFolder)}
                                trigger={
                                  <Button
                                    variant="outline"
                                    className="min-w-[200px] justify-between"
                                  >
                                    <span className="truncate">{selectedFolderName}</span>
                                    <DropdownMenu.TriggerIcon />
                                  </Button>
                                }
                              />
                            </div>
                          );
                        }}
                      />
                    </Settings> */}

                    {/* <Settings label="Draft Folder">
                      <Controller
                        name="email.draft_folder"
                        control={control}
                        render={({ field }) => {
                          const selectedFolderName = (() => {
                            if (!field.value) return 'Drafts';
                            if (folderTree && folderTree.length > 0) {
                              for (const rootFolder of folderTree) {
                                const found = findFolderByPath(rootFolder, field.value);
                                if (found) return found.name;
                              }
                            }
                            return field.value;
                          })();

                          return (
                            <div className="w-full">
                              <FolderSelectField
                                folder={field.value || 'Drafts'}
                                onChange={(selectedFolder) => field.onChange(selectedFolder)}
                                trigger={
                                  <Button
                                    variant="outline"
                                    className="min-w-[200px] justify-between"
                                  >
                                    <span className="truncate">{selectedFolderName}</span>
                                    <DropdownMenu.TriggerIcon />
                                  </Button>
                                }
                              />
                            </div>
                          );
                        }}
                      />
                    </Settings> */}

                    <Settings label="Expand Message Threads">
                      <Controller
                        name="email.mail_thead_view"
                        control={control}
                        render={({ field }) => (
                          <DropdownWrapper
                            items={['never', 'all threads'].map((value) => ({
                              key: value,
                              label: `${value}`,
                              selected: field.value === value,
                              onSelect: () => field.onChange(value),
                            }))}
                            trigger={
                              <Button variant="outline" className="w-full justify-between">
                                <span>{field.value}</span>
                                <DropdownMenu.TriggerIcon />
                              </Button>
                            }
                          />
                        )}
                      ></Controller>
                    </Settings>
                  </div>

                  <div className="mt-6">
                    <Heading size="4" className="mb-4">
                      Compose Email
                    </Heading>
                    <ToggleGroup
                      control={control}
                      toggles={[
                        { name: 'compose.show_to_field', label: 'Show To Field' },
                        { name: 'compose.show_cc_field', label: 'Show CC Field' },
                        { name: 'compose.show_bcc_field', label: 'Show BCC Field' },
                      ]}
                      columns={2}
                    />
                    <div className="mt-4">
                      <Settings
                        label="Default Editor Tab"
                        description="Choose the default editor tab when composing emails"
                      >
                        <Controller
                          name="compose.default_editor_tab"
                          control={control}
                          render={({ field }) => (
                            <Flex gap="3">
                              <Button
                                variant={(field.value ?? 'richtext') === 'richtext' ? 'solid' : 'outline'}
                                onClick={() => field.onChange('richtext')}
                                className="flex-1"
                              >
                                <FaEdit className="mr-2" />
                                Rich Text
                              </Button>
                              <Button
                                variant={field.value === 'code' ? 'solid' : 'outline'}
                                onClick={() => field.onChange('code')}
                                className="flex-1"
                              >
                                <FaCode className="mr-2" />
                                HTML
                              </Button>
                            </Flex>
                          )}
                        />
                      </Settings>
                    </div>
                  </div>

                  <div className="mt-6">
                    <Heading size="4" className="mb-4">
                      Email Display Options
                    </Heading>
                    <ToggleGroup
                      control={control}
                      toggles={[
                        {
                          name: 'email.show_recipient',
                          label: 'Show Recipient',
                          description: 'Display recipient and other information on hover',
                        },
                        {
                          name: 'email.show_attachments',
                          label: 'Show Attachments',
                          description: 'Show attachment indicators',
                        },
                        {
                          name: 'email.show_body',
                          label: 'Show Body',
                          description: 'Display email body content',
                        },
                        {
                          name: 'email.show_quick_hover_actions', // New Setting
                          label: 'Quick Hover Actions',
                          description:
                            'Show action buttons (Delete, Flag, Move) when hovering over emails while viewing any email',
                        },
                      ]}
                      columns={2}
                    />
                  </div>
                </Section>

                {/* Signature Section */}
                <Section
                  title={
                    <Flex align="center" gap="3">
                      <FaEdit className="text-green-600" />
                      <span>Email Signature</span>
                    </Flex>
                  }
                  description="Manage your email signatures for outgoing messages"
                >
                  <Settings
                    label="Default Signature"
                    description="Choose which signature to use by default"
                  >
                    <SignatureSelector
                      signatures={currentSignatures}
                      selectedSignature={watchedValues.general.selected_signature}
                      onSignatureChange={handleSignatureChange}
                      onAddSignature={handleAddSignature}
                      onEditSignature={handleEditSignature}
                      onDeleteSignature={handleDeleteSignature}
                    />
                  </Settings>

                  <Settings label="Display Name" description="Set your default sender information">
                    <div className="space-y-3">
                      <TextField.Root
                        {...register('general.from_address.name')}
                        placeholder="Your display name"
                        className="min-w-[300px]"
                      />
                      <div>
                        <div className="w-full  text-[var(--gray-11)] text-sm cursor-not-allowed opacity-75">
                          {userDetails?.email}
                        </div>
                      </div>
                    </div>
                  </Settings>
                  <Settings
                    label="Reply-To Address"
                    description="Default address for replies (optional)"
                  >
                    <TextField.Root
                      {...register('general.reply_to', {
                        pattern: {
                          value: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
                          message: 'Enter a valid email address',
                        },
                      })}
                      placeholder="reply-to@example.com"
                      className="min-w-[300px]"
                    />

                    {errors.general?.reply_to?.message && (
                      <p className="text-red-500 text-xs mt-1">{errors.general.reply_to.message}</p>
                    )}
                  </Settings>
                </Section>

                {/* Interface Options */}
                <Section
                  title={
                    <Flex align="center" gap="3">
                      <FaEye className="text-orange-600" />
                      <span>Interface Options</span>
                    </Flex>
                  }
                  description="Customize what elements are visible in the interface"
                >
                  <div className="space-y-6">
                    <div>
                      <Heading size="4" className="mb-4">
                        UI Elements
                      </Heading>
                      <ToggleGroup
                        control={control}
                        toggles={[
                          {
                            name: 'email.show_recipient',
                            label: 'Show Recipient',
                            description: 'Display recipient and other information on hover',
                          },
                          // {
                          //   name: 'ui.show_notifications',
                          //   label: 'Show Notifications',
                          //   description: 'Display notification badges',
                          // },
                          // {
                          //   name: 'ui.show_tooltips',
                          //   label: 'Show Tooltips',
                          //   description: 'Show helpful hints on hover',
                          // },
                          // {
                          //   name: 'ui.show_avatars',
                          //   label: 'Show Avatars',
                          //   description: 'Display profile pictures',
                          // },
                          {
                            name: 'ui.show_sidebar',
                            label: 'Show Sidebar',
                            description: 'Keep sidebar visible',
                          },
                          // {
                          //   name: 'ui.show_quick_actions',
                          //   label: 'Show Quick Actions',
                          //   description: 'Display quick action buttons',
                          // },
                          {
                            name: 'ui.show_search_bar',
                            label: 'Show Search Bar',
                            description: 'Keep search bar visible',
                          },
                        ]}
                        columns={2}
                      />
                    </div>

                    <div>
                      <Heading size="4" className="mb-4">
                        Email Actions
                      </Heading>
                      <ToggleGroup
                        control={control}
                        toggles={[
                          { name: 'email.show_reply_button', label: 'Show Reply Button' },
                          { name: 'email.show_forward_button', label: 'Show Forward Button' },
                          { name: 'email.show_delete_button', label: 'Show Delete Button' },
                          { name: 'email.show_mark_as_read_button', label: 'Show Mark as Read' },
                          {
                            name: 'email.show_mark_as_unread_button',
                            label: 'Show Mark as Unread',
                          },
                          // { name: 'email.show_star_button', label: 'Show Star Button' },
                          { name: 'email.show_header_button', label: 'Show Header Button' },
                        ]}
                        columns={2}
                      />
                    </div>
                  </div>
                </Section>

                {/* Contact Settings */}
                <Section
                  title={
                    <Flex align="center" gap="3">
                      <FaUsers className="text-green-600" />
                      <span>Contacts Settings</span>
                    </Flex>
                  }
                  description="Customize the contact menu"
                >
                  <div className="space-y-6">
                    <div>
                      <Heading size="4" className="mb-4">
                        Contact Elements
                      </Heading>
                      <ToggleGroup
                        control={control}
                        toggles={[
                          {
                            name: 'contacts.show_name',
                            label: 'Show Name',
                            description: 'Display name field in contacts',
                          },
                          {
                            name: 'contacts.show_email',
                            label: 'Show Email',
                            description: 'Display email field in contacts',
                          },
                          {
                            name: 'contacts.show_phone',
                            label: 'Show Phone',
                            description: 'Display phone field in contacts',
                          },
                          {
                            name: 'contacts.show_notes',
                            label: 'Show Notes',
                            description: 'Display notes field in contacts',
                          },
                          // {
                          //   name: 'contacts.show_address',
                          //   label: 'Show Address',
                          //   description: 'Display address field in contacts',
                          // },
                          // {
                          //   name: 'contacts.show_website',
                          //   label: 'Show Website',
                          //   description: 'Display website field in contacts',
                          // },
                          // {
                          //   name: 'contacts.show_birthday',
                          //   label: 'Show Birthday',
                          //   description: 'Display birthday field in contacts',
                          // },
                          // {
                          //   name: 'contacts.show_created_date',
                          //   label: 'Show Created Date',
                          //   description: 'Display created date field in contacts',
                          // },
                          // {
                          //   name: 'contacts.show_updated_date',
                          //   label: 'Show Updated Date',
                          //   description: 'Display updated date field in contacts',
                          // },
                        ]}
                        columns={2}
                      />
                    </div>
                  </div>
                </Section>

                {/* Folder Settings */}
                <Section title="Folder Settings">
                  {data?.folders &&
                    Object.entries(data.folders)
                      .filter(([folderKey]) =>
                        ['inbox', 'sent', 'drafts', 'spam', 'trash'].includes(folderKey)
                      )
                      .map(([folderKey]) => (
                        <div
                          key={folderKey}
                          className="border-b border-gray-200 pb-4 mb-4 last:border-b-0"
                        >
                          <h4 className="font-semibold text-lg mb-3 capitalize">
                            {folderKey} Folder
                          </h4>

                          <Settings label="Folder Label">
                            <TextField.Root
                              {...register(`folders.${folderKey}.label`)}
                              placeholder="Folder label"
                              className="min-w-[300px]"
                            />
                          </Settings>

                          {/* Commented out - Color picker not needed currently
                          <Settings label="Folder Color">
                            <Controller
                              name={`folders.${folderKey}.color`}
                              control={control}
                              render={({ field }) => (
                                <div className="flex gap-2 items-center mt-4">
                                  <div
                                    className="h-10 w-10 rounded-full overflow-hidden flex items-center justify-center"
                                    style={{ backgroundColor: field.value || 'transparent' }}
                                  >
                                    <input
                                      type="color"
                                      value={field.value}
                                      onChange={field.onChange}
                                      className="w-15 h-15 cursor-pointer border-transparent p-0 m-0 outline-transparent"
                                    />
                                  </div>
                                  <TextField.Root
                                    value={field.value}
                                    onChange={field.onChange}
                                    placeholder="#HEX Color"
                                    className="flex-1 min-w-[252px]"
                                  />
                                </div>
                              )}
                            />
                          </Settings>
                          */}

                          <ToggleGroup
                            control={control}
                            toggles={[
                              // {
                              //   name: `folders.${folderKey}.visible`,
                              //   label: 'Show in Folder',
                              //   description:
                              //     'Display this folder in the main folder list and navigation',
                              // },
                              {
                                name: `folders.${folderKey}.show_in_sidebar`,
                                label: 'Show in Sidebar',
                                description:
                                  'Make this folder visible in the sidebar for quick access',
                              },
                              {
                                name: `folders.${folderKey}.show_label`,
                                label: 'Show Label',
                                description: 'Display the folder name next to its icon',
                              },
                              {
                                name: `folders.${folderKey}.show_unread_count`,
                                label: 'Show Unread Count',
                                description: 'Display the number of unread emails in this folder',
                              },
                              // {
                              //   name: `folders.${folderKey}.show_starred_count`,
                              //   label: 'Show Starred Count',
                              //   description: 'Display the number of starred emails in this folder',
                              // },
                            ]}
                            columns={2}
                          />

                          <Settings label="Description">
                            <TextField.Root
                              {...register(`folders.${folderKey}.description`)}
                              placeholder="Folder description"
                              className="min-w-[300px] mt-2"
                            />
                          </Settings>

                          {(folderKey == 'inbox' || folderKey == 'sent') && (
                            <div className=" mt-4">
                              <Settings label="View Mode">
                                <Controller
                                  name={`folders.${folderKey}.list_thread_view`}
                                  control={control}
                                  render={({ field }) => (
                                    <DropdownWrapper
                                      items={['list', 'threads'].map((value) => ({
                                        key: value,
                                        label: `${value}`,
                                        selected: field.value === value,
                                        onSelect: () => field.onChange(value),
                                      }))}
                                      trigger={
                                        <Button
                                          variant="outline"
                                          className="w-full justify-between"
                                        >
                                          <span>{field.value}</span>
                                          <DropdownMenu.TriggerIcon />
                                        </Button>
                                      }
                                    />
                                  )}
                                ></Controller>
                              </Settings>
                            </div>
                          )}
                        </div>
                      ))}
                </Section>
              </div>
            </div>
          </ScrollArea>

          {/* Keep original bottom bar but hide save button when floating is shown */}
          <div className="sticky bottom-0 bg-[var(--gray-1)] border-t border-gray-200 p-4">
            {!hasUnsavedChanges && (
              <Flex justify="center">
                <Button
                  size="3"
                  type="submit"
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 lg:px-8 py-3 rounded-lg font-medium transition-colors duration-200 shadow-lg w-full lg:w-auto lg:min-w-[200px]"
                  disabled={isPending}
                >
                  <FaSave className="mr-2" />
                  {isPending ? 'Saving Changes...' : 'Save All Settings'}
                </Button>
              </Flex>
            )}
          </div>
        </form>
      </Card>

      {/* Signature Modal */}
      <SignatureModal
        isOpen={showSignatureModal}
        onClose={() => {
          setShowSignatureModal(false);
          setEditingSignature(null);
        }}
        onSave={handleSaveSignature}
        editingSignature={editingSignature}
      />

      {hasUnsavedChanges && (
        <>
          <div className="fixed inset-0 z-40 pointer-events-none">
            <div className="absolute bottom-0 left-0 right-0 h-40 bg-gradient-to-t from-black/10 to-transparent" />
          </div>

          <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 w-[90%] max-w-2xl">
            <div className="bg-[var(--gray-1)]/40 backdrop-blur-lg border border-[var(--gray-6)] p-4 rounded-xl shadow-lg flex flex-col sm:flex-row items-center justify-between gap-4">
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="flex w-10 h-10 rounded-lg bg-[var(--accent-9)] items-center justify-center text-white flex-shrink-0">
                  <FaSave size={16} />
                </div>

                <div className="flex flex-col">
                  <span className="font-medium text-sm text-[var(--gray-12)]">
                    You have unsaved changes
                  </span>
                  <span className="text-xs text-[var(--gray-11)]">
                    Save your preferences before leaving
                  </span>
                </div>
              </div>

              {/* Right side - Action buttons */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <Button
                  variant="soft"
                  color="gray"
                  onClick={() => {
                    reset();
                    setHasUnsavedChanges(false);
                    toast.success({ description: 'Changes discarded' });
                  }}
                  className="flex-1 sm:flex-none"
                >
                  Discard
                </Button>

                <Button
                  onClick={handleSubmit(onSubmit)}
                  disabled={isPending}
                  className="flex-1 sm:flex-none bg-[var(--accent-9)] text-white hover:bg-[var(--accent-10)] px-6"
                >
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Button>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default General;
