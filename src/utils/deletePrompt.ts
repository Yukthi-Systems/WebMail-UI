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

// "Storage almost full" delete prompt, skipped for the rest of the session once the user asks.
// sessionStorage: cleared when the tab closes or on logout, so it asks again next time.
const SKIP_DELETE_PROMPT_KEY = 'skipPermanentDeletePrompt';

export const isDeletePromptSkipped = (): boolean => {
  try {
    return sessionStorage.getItem(SKIP_DELETE_PROMPT_KEY) === 'true';
  } catch {
    return false;
  }
};

export const skipDeletePromptThisSession = (): void => {
  try {
    sessionStorage.setItem(SKIP_DELETE_PROMPT_KEY, 'true');
  } catch {
    // Storage blocked (private mode): the prompt shows again, nothing breaks
  }
};
