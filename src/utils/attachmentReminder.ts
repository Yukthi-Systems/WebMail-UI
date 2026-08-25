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

// Words that suggest the sender meant to attach a file
const ATTACHMENT_KEYWORD_REGEX = /\b(attach(ed|ment|ments|ing)?|enclosed)\b/i;

/** True when the body mentions an attachment but none has actually been added. */
export function mightHaveForgottenAttachment(bodyText: string, attachmentCount: number): boolean {
  if (attachmentCount > 0) return false;
  return ATTACHMENT_KEYWORD_REGEX.test(bodyText || '');
}
