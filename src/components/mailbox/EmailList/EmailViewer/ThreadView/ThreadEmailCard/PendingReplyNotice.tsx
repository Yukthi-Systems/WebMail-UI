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

import { Tooltip } from '@radix-ui/themes';

export const PENDING_REPLY_NOTICE =
  'Your reply was accepted for sending. This is a preview of what you wrote, not the saved copy. ' +
  'Reload the conversation to see the copy from your Sent folder. If it is not there yet, try again in a moment.';

/** The "!" on a reply added to the conversation right after sending */
export const PendingReplyNotice = () => (
  <Tooltip content={PENDING_REPLY_NOTICE}>
    <span
      role="img"
      tabIndex={0}
      aria-label={PENDING_REPLY_NOTICE}
      className="inline-flex h-4 w-4 flex-shrink-0 cursor-help items-center justify-center rounded-full border border-[var(--amber-9)] text-[11px] font-bold leading-none text-[var(--amber-11)]"
    >
      !
    </span>
  </Tooltip>
);
