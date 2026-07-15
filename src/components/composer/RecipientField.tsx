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

import { Box, Flex, IconButton, Separator, Text, TextField } from '@radix-ui/themes';
import { useRef, useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import { type EmailAddress } from '../../state/composer';
import { FaX, FaCheck } from 'react-icons/fa6';
import { addressParser } from 'postal-mime';
import { useDebounce } from 'use-debounce';
import { API_URL } from '../../api/config';
import { csrfTokenAtom, isVersionTwoUserAtom } from '../../state/auth';
import { webmailStore } from '../../store';
import BIMIAvatar from '../common/BimiAvatar';
import { useAtomValue } from 'jotai';

type RecipientFieldProps = {
  label: 'To' | 'Cc' | 'Bcc';
  placeholder: string;
  value: EmailAddress[];
  onChange: (emailAddresses: EmailAddress[]) => void;
};

export type RecipientFieldHandle = {
  flush: () => EmailAddress | null;
};

interface ContactSuggestion {
  contact_id: string | number;
  name: string;
  email: string;
}

const parseEmailInput = (input: string): EmailAddress | null => {
  const parsed = addressParser(input);
  if (!parsed || parsed.length === 0) return null;
  if (!parsed[0].address) return null;
  const { name, address } = parsed[0];
  return { name, address };
};

const isValidEmail = (email: string): boolean => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

const Avatar = ({ name, email, size = 28 }: { name: string; email: string; size?: number }) => {
  return (
    <BIMIAvatar
      name={name}
      email={email}
      size={24}
      className="cursor-pointer hover:ring-2 hover:ring-[var(--accent-8)] transition-all"
    />
  );
};

/* ── Chip ───────────────────────────────────────────────── */
const Chip = ({
  emailAddress,
  onRemove,
  onEdit,
}: {
  emailAddress: EmailAddress;
  onRemove: () => void;
  onEdit: (updated: EmailAddress) => void;
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  const label = emailAddress.name || emailAddress.address.split('@')[0];
  const fullLabel = emailAddress.name
    ? `${emailAddress.name} <${emailAddress.address}>`
    : emailAddress.address;

  const startEdit = () => {
    setEditValue(fullLabel);
    setIsEditing(true);
    setTimeout(() => {
      inputRef.current?.focus();
      inputRef.current?.select();
    }, 0);
  };

  const commitEdit = () => {
    const parsed = parseEmailInput(editValue.trim());
    if (parsed && isValidEmail(parsed.address)) {
      onEdit(parsed);
    }
    setIsEditing(false);
  };

  const cancelEdit = () => {
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <Flex
        align="center"
        gap="1"
        style={{
          background: 'var(--accent-3)',
          border: '1.5px solid var(--accent-8)',
          padding: '2px 6px',
          borderRadius: 99,
          gap: 4,
        }}
      >
        <Avatar name={emailAddress.name || ''} email={emailAddress.address} size={18} />
        <input
          ref={inputRef}
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') commitEdit();
            if (e.key === 'Escape') cancelEdit();
            e.stopPropagation();
          }}
          onBlur={commitEdit}
          style={{
            border: 'none',
            outline: 'none',
            background: 'transparent',
            fontSize: 12,
            color: 'var(--accent-11)',
            fontWeight: 500,
            width: Math.max(120, editValue.length * 7),
            maxWidth: 280,
          }}
        />
        <IconButton
          variant="ghost"
          size="1"
          onMouseDown={(e) => {
            e.preventDefault();
            commitEdit();
          }}
          style={{
            borderRadius: '50%',
            width: 14,
            height: 14,
            flexShrink: 0,
            padding: 0,
            cursor: 'pointer',
            color: 'var(--green-9)',
          }}
        >
          <FaCheck size={8} />
        </IconButton>
        <IconButton
          variant="ghost"
          size="1"
          onMouseDown={(e) => {
            e.preventDefault();
            cancelEdit();
          }}
          style={{
            borderRadius: '50%',
            width: 14,
            height: 14,
            flexShrink: 0,
            padding: 0,
            cursor: 'pointer',
            color: 'var(--accent-9)',
          }}
        >
          <FaX size={8} />
        </IconButton>
      </Flex>
    );
  }

  return (
    <Flex
      align="center"
      gap="1"
      style={{
        background: 'var(--accent-3)',
        border: '1px solid var(--accent-5)',
        padding: '2px 4px 2px 5px',
        borderRadius: 99,
        maxWidth: 200,
        gap: 4,
        transition: 'background 0.15s',
      }}
      title={fullLabel}
    >
      <Avatar name={emailAddress.name || ''} email={emailAddress.address} size={18} />
      <Text
        size="1"
        onClick={startEdit}
        style={{
          overflow: 'hidden',
          textOverflow: 'ellipsis',
          whiteSpace: 'nowrap',
          maxWidth: 120,
          color: 'var(--accent-11)',
          fontWeight: 500,
          fontSize: 12,
          cursor: 'text',
          userSelect: 'none',
        }}
        title="Click to edit"
      >
        {label}
      </Text>
      <IconButton
        variant="ghost"
        size="1"
        onClick={onRemove}
        style={{
          borderRadius: '50%',
          width: 14,
          height: 14,
          flexShrink: 0,
          color: 'var(--accent-9)',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: 0,
        }}
      >
        <FaX size={8} />
      </IconButton>
    </Flex>
  );
};
/* ── Suggestion row ─────────────────────────────────────── */
const SuggestionRow = ({
  suggestion,
  isSelected,
  isKeyboardFocused,
  onClick,
  onMouseDown,
}: {
  suggestion: ContactSuggestion;
  isSelected: boolean;
  isKeyboardFocused: boolean;
  onClick: () => void;
  onMouseDown: (e: React.MouseEvent) => void;
}) => {
  const [hovered, setHovered] = useState(false);

  const getBg = () => {
    if (isKeyboardFocused) return 'var(--accent-4)';
    if (isSelected) return 'var(--accent-3)';
    if (hovered) return 'var(--gray-3)';
    return 'transparent';
  };

  return (
    <Flex
      align="center"
      justify="between"
      onMouseDown={onMouseDown}
      onClick={() => !isSelected && onClick()}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        padding: '7px 12px',
        cursor: isSelected ? 'default' : 'pointer',
        background: getBg(),
        transition: 'background 0.1s',
        opacity: isSelected ? 0.7 : 1,
        gap: 10,
        outline: isKeyboardFocused ? '2px solid var(--accent-7)' : 'none',
        outlineOffset: '-2px',
        borderRadius: isKeyboardFocused ? 6 : 0,
      }}
    >
      <Flex align="center" gap="2" style={{ minWidth: 0, flex: 1 }}>
        <Avatar name={suggestion.name} email={suggestion.email} size={30} />
        <Box style={{ minWidth: 0 }}>
          {suggestion.name && (
            <Text
              size="2"
              style={{
                fontWeight: 500,
                color: 'var(--gray-12)',
                display: 'block',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                whiteSpace: 'nowrap',
              }}
            >
              {suggestion.name}
            </Text>
          )}
          <Text
            size="1"
            style={{
              color: 'var(--gray-10)',
              display: 'block',
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
            }}
          >
            {suggestion.email}
          </Text>
        </Box>
      </Flex>
      {isSelected && <FaCheck size={11} color="var(--accent-9)" style={{ flexShrink: 0 }} />}
    </Flex>
  );
};

/* ── Main component ─────────────────────────────────────── */
const RecipientField = forwardRef<RecipientFieldHandle, RecipientFieldProps>(
  ({ label, placeholder, value, onChange }, ref) => {
    const csrfToken = webmailStore.get(csrfTokenAtom);
    const inputRef = useRef<HTMLInputElement>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);
    const [inputValue, setInputValue] = useState('');
    const [suggestionsOne, setSuggestionsOne] = useState<ContactSuggestion[]>([]);
    const [suggestionsTwo, setSuggestionsTwo] = useState<ContactSuggestion[]>([]);
    const [showSuggestions, setShowSuggestions] = useState(false);
    const [activeIndex, setActiveIndex] = useState(-1);
    const [isFocused, setIsFocused] = useState(false);
    const [debouncedInput] = useDebounce(inputValue, 300);
    const [isCheckingContact, setIsCheckingContact] = useState(false);
    const [validationError, setValidationError] = useState(false);
    const [ignoreBlur, setIgnoreBlur] = useState(false);
    const valueRef = useRef<EmailAddress[]>(value);
    useEffect(() => {
      valueRef.current = value;
    }, [value]);
    const isVersionTwoUser = useAtomValue(isVersionTwoUserAtom);

    const fieldId = `email-composer-${label.toLowerCase()}-field`;
    const fieldName = `composer_${label.toLowerCase()}_recipients`;

    useImperativeHandle(ref, () => ({
      flush: () => {
        const trimmed = inputValue.trim();
        if (!trimmed) return null;
        if (isValidEmail(trimmed)) {
          const parsed = parseEmailInput(trimmed);
          if (parsed) {
            const exists = value.some(
              (c) => c.address.toLowerCase() === parsed.address.toLowerCase()
            );
            if (!exists) {
              onChange([...value, parsed]);
              setInputValue('');
              setValidationError(false);
              return parsed;
            } else {
              setInputValue('');
              setValidationError(false);
            }
          }
        }
        return null;
      },
    }));

    useEffect(() => {
      const fetchSuggestions = async () => {
        if (debouncedInput.length > 2) {
          try {
            const response1 = await fetch(
              `${API_URL}/contacts/search?partial_email=${debouncedInput}`,
              {
                method: 'GET',
                credentials: 'include',
                headers: {
                  'Content-Type': 'application/json',
                  ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                },
              }
            );
            const data1 = await response1.json();
            const contacts1: ContactSuggestion[] = data1?.contacts || [];

            let contacts2: ContactSuggestion[] = [];
            if (isVersionTwoUser && contacts1.length < 15) {
              const response2 = await fetch(
                `${API_URL}/contacts/search/v2?partial_email=${debouncedInput}`,
                {
                  method: 'GET',
                  credentials: 'include',
                  headers: {
                    'Content-Type': 'application/json',
                    ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
                  },
                }
              );
              const data2 = await response2.json();
              contacts2 = data2?.contacts || [];
            }

            const seenEmails = new Set<string>();
            const mergedContactsOne: ContactSuggestion[] = [];
            const mergedContactsTwo: ContactSuggestion[] = [];

            // Add contacts from the first API (v1)
            contacts1.forEach((c) => {
              if (c.email) {
                const emailLower = c.email.toLowerCase();
                if (!seenEmails.has(emailLower)) {
                  seenEmails.add(emailLower);
                  mergedContactsOne.push(c);
                }
              }
            });

            // Add contacts from the second API (v2) only if email not seen
            contacts2.forEach((c) => {
              if (c.email) {
                const emailLower = c.email.toLowerCase();
                if (!seenEmails.has(emailLower)) {
                  seenEmails.add(emailLower);
                  mergedContactsTwo.push(c);
                }
              }
            });

            setSuggestionsOne(mergedContactsOne);
            setSuggestionsTwo(mergedContactsTwo);
            setShowSuggestions(true);
            setActiveIndex(-1);
          } catch (error) {
            console.error('Failed to fetch suggestions:', error);
          }
        } else {
          setSuggestionsOne([]);
          setSuggestionsTwo([]);
          setShowSuggestions(false);
          setActiveIndex(-1);
        }
      };
      fetchSuggestions();
    }, [debouncedInput, csrfToken, isVersionTwoUser]);

    useEffect(() => {
      if (inputValue.trim() && validationError) setValidationError(false);
    }, [inputValue]);

    const checkAndAddEmail = async (emailInput: string) => {
      const trimmedInput = emailInput.trim();
      if (!isValidEmail(trimmedInput)) {
        setValidationError(true);
        return false;
      }
      const parsed = parseEmailInput(trimmedInput);
      if (!parsed) {
        setValidationError(true);
        return false;
      }
      const exists = valueRef.current.some(
        (c) => c.address.toLowerCase() === parsed.address.toLowerCase()
      );
      if (exists) {
        setInputValue('');
        setValidationError(false);
        return false;
      }

      try {
        setIsCheckingContact(true);
        const contactResponse = await fetch(`${API_URL}/contacts/exists/${parsed.address}`, {
          method: 'GET',
          headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
          },
          credentials: 'include',
        });
        const contactExists = await contactResponse.json();
        if (contactExists?.message === 'Contact does not exist') {
          await fetch(`${API_URL}/contacts/create`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              ...(csrfToken ? { 'X-CSRF-Token': csrfToken } : {}),
            },
            credentials: 'include',
            body: JSON.stringify({
              email: parsed.address,
              name: parsed.name || parsed.address.split('@')[0],
              notes: '',
              phone: '',
            }),
          });
        }
      } catch (error) {
        console.error('Failed to check/add contact:', error);
      } finally {
        setIsCheckingContact(false);
      }

      onChange([...valueRef.current, parsed]);
      setInputValue('');
      setShowSuggestions(false);
      setValidationError(false);
      return true;
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      const allSuggestions = [...suggestionsOne, ...suggestionsTwo];
      const dropdownOpen = showSuggestions && allSuggestions.length > 0;

      if (e.key === 'ArrowDown') {
        if (!dropdownOpen) return;
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev < allSuggestions.length - 1 ? prev + 1 : 0;
          scrollActiveIntoView(next);
          return next;
        });
        return;
      }

      if (e.key === 'ArrowUp') {
        if (!dropdownOpen) return;
        e.preventDefault();
        setActiveIndex((prev) => {
          const next = prev > 0 ? prev - 1 : allSuggestions.length - 1;
          scrollActiveIntoView(next);
          return next;
        });
        return;
      }

      if (e.key === 'Enter') {
        if (dropdownOpen && activeIndex >= 0) {
          e.preventDefault();
          const selected = allSuggestions[activeIndex];
          if (selected) handleSuggestionClick(selected);
          return;
        }
        if (inputValue.trim()) {
          e.preventDefault();
          checkAndAddEmail(inputValue.trim());
        }
        return;
      }

      if ([',', ';', 'Tab'].includes(e.key) && inputValue.trim()) {
        e.preventDefault();
        checkAndAddEmail(inputValue.trim());
        return;
      }

      if (e.key === 'Escape') {
        setShowSuggestions(false);
        setActiveIndex(-1);
      }
    };

    const scrollActiveIntoView = (index: number) => {
      if (!dropdownRef.current) return;
      const items = dropdownRef.current.querySelectorAll<HTMLElement>('[data-suggestion-item]');
      items[index]?.scrollIntoView({ block: 'nearest' });
    };

    const handleBlur = async () => {
      setIsFocused(false);
      if (ignoreBlur) {
        setIgnoreBlur(false);
        return;
      }
      setTimeout(async () => {
        const trimmedValue = inputValue.trim();
        if (trimmedValue) {
          if (isValidEmail(trimmedValue)) {
            const isDuplicate = value.some(
              (item) => item.address.toLowerCase() === trimmedValue.toLowerCase()
            );
            if (!isDuplicate && !isCheckingContact) {
              await checkAndAddEmail(trimmedValue);
            } else {
              setInputValue('');
            }
          } else {
            setValidationError(true);
          }
        }
        setShowSuggestions(false);
      }, 200);
    };

    const handleFocus = () => {
      setIsFocused(true);
      setValidationError(false);
      if (suggestionsOne.length > 0 || suggestionsTwo.length > 0) setShowSuggestions(true);
    };

    const handleSuggestionClick = (suggestion: ContactSuggestion) => {
      const isAlreadySelected = value.some(
        (item) => item.address.toLowerCase() === suggestion.email.toLowerCase()
      );
      if (isAlreadySelected) {
        setInputValue('');
        setShowSuggestions(false);
        setActiveIndex(-1);
        return;
      }
      setIgnoreBlur(true);
      onChange([...value, { name: suggestion.name, address: suggestion.email }]);
      setInputValue('');
      setShowSuggestions(false);
      setActiveIndex(-1);
      setValidationError(false);
      inputRef.current?.focus();
    };

    const handleRemove = (index: number) => {
      const updated = [...value];
      updated.splice(index, 1);
      onChange(updated);
    };

    const handleEdit = (index: number, updated: EmailAddress) => {
      const isDuplicate = value.some(
        (c, i) => i !== index && c.address.toLowerCase() === updated.address.toLowerCase()
      );
      if (isDuplicate) return; // silently skip, or show error
      const updated_list = [...value];
      updated_list[index] = updated;
      onChange(updated_list);
    };
    const isSuggestionSelected = (email: string) =>
      value.some((item) => item.address.toLowerCase() === email.toLowerCase());

    return (
      <Box mb="0" position="relative">
        <style>{`
          @keyframes rfDropIn {
            from { opacity: 0; transform: translateY(-6px) scale(0.98); }
            to   { opacity: 1; transform: translateY(0)  scale(1); }
          }
          @keyframes rfChipIn {
            from { opacity: 0; transform: scale(0.8); }
            to   { opacity: 1; transform: scale(1); }
          }
          @keyframes rfErrorIn {
            from { opacity: 0; transform: translateY(-3px); }
            to   { opacity: 1; transform: translateY(0); }
          }
        `}</style>

        <form autoComplete="off" onSubmit={(e) => e.preventDefault()}>
          <Flex
            direction="row"
            align="center"
            wrap="wrap"
            style={{
              borderBottom: validationError
                ? '1.5px solid var(--red-8)'
                : isFocused
                  ? '1.5px solid var(--accent-8)'
                  : '1.5px solid transparent',
              padding: '3px 10px',
              minHeight: 32,
              gap: 5,
              transition: 'border-color 0.2s ease, background 0.2s ease',
              backgroundColor: validationError
                ? 'var(--red-2)'
                : isFocused
                  ? 'var(--gray-2)'
                  : 'transparent',
              borderRadius: '6px 6px 0 0',
            }}
          >
            <label style={{ flexShrink: 0, marginRight: 2 }}>{label}:</label>

            {value.map((emailAddress, idx) => (
              <div
                key={idx}
                style={{ animation: 'rfChipIn 0.18s cubic-bezier(.34,1.56,.64,1) both' }}
              >
                <Chip
                  emailAddress={emailAddress}
                  onRemove={() => handleRemove(idx)}
                  onEdit={(updated) => handleEdit(idx, updated)}
                />
              </div>
            ))}

            <TextField.Root
              ref={inputRef}
              variant="soft"
              id={fieldId}
              name={fieldName}
              placeholder={value.length === 0 ? placeholder : ''}
              value={inputValue}
              onChange={(e) => {
                setInputValue(e.target.value);
                if (validationError) setValidationError(false);
              }}
              onKeyDown={handleKeyDown}
              onBlur={handleBlur}
              onFocus={handleFocus}
              autoComplete="chrome-off"
              autoCorrect="off"
              autoCapitalize="off"
              spellCheck="false"
              data-lpignore="true"
              data-form-type="other"
              style={{
                minWidth: 120,
                flex: 1,
                border: 'none',
                background: 'transparent',
                padding: 0,
                outline: 'none',
                fontSize: 13,
              }}
            />
          </Flex>
        </form>

        {validationError && (
          <Text
            size="1"
            color="red"
            style={{
              marginTop: 3,
              marginLeft: 10,
              display: 'block',
              animation: 'rfErrorIn 0.15s ease both',
              fontSize: 11,
            }}
          >
            Please enter a valid email address
          </Text>
        )}

        {showSuggestions && (suggestionsOne.length > 0 || suggestionsTwo.length > 0) && (
          <Box
            ref={dropdownRef}
            style={{
              position: 'absolute',
              top: 'calc(100% + 4px)',
              left: 0,
              right: 0,
              background: 'var(--color-panel-solid)',
              border: '1px solid var(--gray-5)',
              borderRadius: 10,
              zIndex: 1000,
              maxHeight: 224,
              overflowY: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.12), 0 2px 6px rgba(0,0,0,0.06)',
              animation: 'rfDropIn 0.18s cubic-bezier(.22,1,.36,1) both',
              padding: '4px 0',
            }}
          >
            {suggestionsOne.map((suggestion, idx) => (
              <div key={suggestion.contact_id} data-suggestion-item>
                <SuggestionRow
                  suggestion={suggestion}
                  isSelected={isSuggestionSelected(suggestion.email)}
                  isKeyboardFocused={activeIndex === idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => {
                    if (!isSuggestionSelected(suggestion.email)) e.preventDefault();
                  }}
                />
              </div>
            ))}
            {suggestionsTwo.length > 0 && suggestionsOne.length > 0 && (
              <Separator size="1" my="1" />
            )}
            {suggestionsTwo.map((suggestion, idx) => (
              <div key={suggestion.contact_id} data-suggestion-item>
                <SuggestionRow
                  suggestion={suggestion}
                  isSelected={isSuggestionSelected(suggestion.email)}
                  isKeyboardFocused={activeIndex === suggestionsOne.length + idx}
                  onClick={() => handleSuggestionClick(suggestion)}
                  onMouseDown={(e) => {
                    if (!isSuggestionSelected(suggestion.email)) e.preventDefault();
                  }}
                />
              </div>
            ))}
          </Box>
        )}
      </Box>
    );
  }
);

RecipientField.displayName = 'RecipientField';

export default RecipientField;
