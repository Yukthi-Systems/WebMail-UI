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

// EmailListSortMenu.tsx
import { Button, DropdownMenu } from '@radix-ui/themes';
import { useAtom, useAtomValue } from 'jotai';
import { MdFilterList } from 'react-icons/md';
import {
  DEFAULT_EMAIL_SORT,
  emailFilterAtom,
  emailSortAtom,
  type EmailFilterBy,
  type EmailSortBy,
  type EmailSortOrder,
} from '../../../state/emailListView';
import { searchStateAtom } from '../../../state/search';

const SORT_OPTIONS: { value: EmailSortBy; label: string }[] = [
  { value: 'date', label: 'Date' },
  { value: 'arrival', label: 'Received' },
  { value: 'from', label: 'Sender' },
  { value: 'subject', label: 'Subject' },
  { value: 'size', label: 'Size' },
];

const FILTER_OPTIONS: { value: EmailFilterBy; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'unread', label: 'Unread' },
  { value: 'read', label: 'Read' },
  { value: 'flagged', label: 'Flagged' },
  { value: 'unflagged', label: 'Unflagged' },
];

// Order labels that read naturally for the chosen sort key
const orderLabels = (sortBy: EmailSortBy): Record<EmailSortOrder, string> => {
  if (sortBy === 'from' || sortBy === 'subject') return { asc: 'A to Z', desc: 'Z to A' };
  if (sortBy === 'size') return { desc: 'Largest first', asc: 'Smallest first' };
  return { desc: 'Newest first', asc: 'Oldest first' };
};

interface EmailListSortMenuProps {
  /** 'icon' renders a compact icon-only trigger (mobile toolbar). */
  variant?: 'button' | 'icon';
}

/**
 * Filter + sort controls for the email list. Sorting and filtering run on the
 * mail server across the whole folder; the list resets to page 1 on change.
 */
const EmailListSortMenu = ({ variant = 'button' }: EmailListSortMenuProps) => {
  const [sort, setSort] = useAtom(emailSortAtom);
  const [filter, setFilter] = useAtom(emailFilterAtom);
  const isSearchActive = useAtomValue(searchStateAtom).isActive;

  // Search supports sorting only, so the filter is hidden (and ignored) there
  const showFilter = !isSearchActive;
  const activeFilter = showFilter && filter !== 'all';
  const isCustomized =
    activeFilter ||
    sort.sortBy !== DEFAULT_EMAIL_SORT.sortBy ||
    sort.sortOrder !== DEFAULT_EMAIL_SORT.sortOrder;

  const filterLabel = FILTER_OPTIONS.find((option) => option.value === filter)?.label;
  const title = `${activeFilter ? `${filterLabel} · ` : ''}Sorted by ${
    SORT_OPTIONS.find((option) => option.value === sort.sortBy)?.label
  } (${orderLabels(sort.sortBy)[sort.sortOrder].toLowerCase()})`;
  const labels = orderLabels(sort.sortBy);

  return (
    <DropdownMenu.Root>
      <DropdownMenu.Trigger>
        {variant === 'icon' ? (
          <button
            className={`relative p-2 rounded-lg transition-colors hover:bg-[var(--gray-3)] ${
              isCustomized
                ? 'text-[var(--accent-11)]'
                : 'text-[var(--gray-11)] hover:text-[var(--gray-12)]'
            }`}
            title={title}
            aria-label="Filter and sort emails"
          >
            <MdFilterList size={18} />
            {isCustomized && (
              <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-[var(--accent-9)]" />
            )}
          </button>
        ) : (
          <Button
            variant={isCustomized ? 'solid' : 'soft'}
            size="2"
            title={title}
            aria-label="Filter and sort emails"
            style={{ gap: '0.375rem' }}
          >
            <MdFilterList size={16} />
            {activeFilter && <span className="text-xs">{filterLabel}</span>}
          </Button>
        )}
      </DropdownMenu.Trigger>

      <DropdownMenu.Content size="2" align="end">
        {showFilter && (
          <>
            <DropdownMenu.Label>Show</DropdownMenu.Label>
            <DropdownMenu.RadioGroup
              value={filter}
              onValueChange={(value) => setFilter(value as EmailFilterBy)}
            >
              {FILTER_OPTIONS.map((option) => (
                <DropdownMenu.RadioItem key={option.value} value={option.value}>
                  {option.label}
                </DropdownMenu.RadioItem>
              ))}
            </DropdownMenu.RadioGroup>
            <DropdownMenu.Separator />
          </>
        )}

        <DropdownMenu.Label>Sort by</DropdownMenu.Label>
        <DropdownMenu.RadioGroup
          value={sort.sortBy}
          onValueChange={(value) => setSort((prev) => ({ ...prev, sortBy: value as EmailSortBy }))}
        >
          {SORT_OPTIONS.map((option) => (
            <DropdownMenu.RadioItem key={option.value} value={option.value}>
              {option.label}
            </DropdownMenu.RadioItem>
          ))}
        </DropdownMenu.RadioGroup>

        <DropdownMenu.Separator />

        <DropdownMenu.Label>Order</DropdownMenu.Label>
        <DropdownMenu.RadioGroup
          value={sort.sortOrder}
          onValueChange={(value) =>
            setSort((prev) => ({ ...prev, sortOrder: value as EmailSortOrder }))
          }
        >
          <DropdownMenu.RadioItem value="desc">{labels.desc}</DropdownMenu.RadioItem>
          <DropdownMenu.RadioItem value="asc">{labels.asc}</DropdownMenu.RadioItem>
        </DropdownMenu.RadioGroup>
      </DropdownMenu.Content>
    </DropdownMenu.Root>
  );
};

export default EmailListSortMenu;
