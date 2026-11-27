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

/** Visible text (without any spacing) and number of images of some HTML. */
const contentOf = (html: string) => {
  const doc = new DOMParser().parseFromString(html || '', 'text/html');
  return {
    text: (doc.body.textContent || '').replace(/[\s\u00a0\u200b]+/g, ''),
    images: doc.body.querySelectorAll('img').length,
  };
};

/**
 * Nothing written in the body: empty, or only the signature the composer put
 * in. Compared by visible text and images, not by HTML: the editor rewrites the
 * signature's HTML when it loads it, so it never matches the original exactly.
 */
export const isComposerBodyEmpty = (html: string | undefined, signatureHtml?: string): boolean => {
  const body = contentOf(html ?? '');
  const signature = contentOf(signatureHtml ?? '');
  if (body.images > signature.images) return false;
  return body.text === '' || body.text === signature.text;
};
