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

// Email allows at most 998 characters per line. A longer line is cut by a server on
// the way, which inserts a line break and a space anywhere, even inside a word
// ("103" arrived as "1 03"). A line break after a block's closing tag changes
// nothing in how the html looks, and keeps every line short.
const BLOCK_END =
  /(<\/(?:p|div|tr|td|th|li|ul|ol|table|thead|tbody|tfoot|h[1-6]|blockquote)>)(?!\n)/gi;

export const breakLongHtmlLines = (html: string): string =>
  // Not inside <pre>, where a line break would show
  html
    .split(/(<pre[\s>][\s\S]*?<\/pre>)/i)
    .map((part, index) => (index % 2 === 1 ? part : part.replace(BLOCK_END, '$1\n')))
    .join('');
