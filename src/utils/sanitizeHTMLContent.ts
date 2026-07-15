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

import DOMPurify from 'dompurify';

//   ᠎ -   　﻿ are exotic Unicode whitespace
// that can appear in line-wrapped email URLs; \s covers the rest.
const WS_RE = /[\s\u00A0\u1680\u180e\u2000-\u200a\u2028\u2029\u202f\u205f\u3000\ufeff]+/g;

function cleanUrl(raw: string): string {
  return raw
    .replace(WS_RE, '')
    .replace(/%20/g, '')
    .replace(/(https?):\/([^\/])/gi, '$1://$2');
}

function isExternal(url: string): boolean {
  const normalized = url.trim().replace(WS_RE, '').replace(/%20/g, '');
  return /^https?:\/\//i.test(normalized) || /^https?:\//i.test(normalized);
}

export function sanitizeHTMLContent(html: string, blockExternalMedia = true): string {
  const sanitizedString = DOMPurify.sanitize(html, {
    FORBID_TAGS: ['script', 'iframe', 'form', 'object', 'embed'],
    FORBID_ATTR: ['onerror', 'onclick', 'onload'],
    ADD_ATTR: [
      'src',
      'href',
      'target',
      'rel',
      'style',
      'width',
      'height',
      'border',
      'cellpadding',
      'cellspacing',
      'colspan',
      'rowspan',
      'align',
      'valign',
      'bgcolor',
    ],
    ADD_TAGS: ['img', 'a', 'table', 'thead', 'tbody', 'tr', 'th', 'td'],
  }) as string;

  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = sanitizedString;

  // Block external url() references inside <style> tags to prevent tracking pixels
  if (blockExternalMedia) {
    tempDiv.querySelectorAll('style').forEach((styleEl) => {
      if (styleEl.textContent) {
        styleEl.textContent = styleEl.textContent.replace(
          /url\(\s*(['"]?)\s*https?:\/\/[^)'"\s]+\s*\1\s*\)/gi,
          "url('')"
        );
      }
    });
  }

  // Force external <a> links to open in a new tab
  const links = tempDiv.querySelectorAll('a');
  links.forEach((link) => {
    const rawHref = link.getAttribute('href');
    if (rawHref) {
      const cleanHref = cleanUrl(rawHref);

      if (typeof window !== 'undefined' && cleanHref.startsWith(window.location.origin)) {
        const nestedUrlMatch = cleanHref.match(/\/folder\/(https?:\/\/.*)$/i);
        if (nestedUrlMatch) {
          link.setAttribute('href', nestedUrlMatch[1]);
        } else {
          link.setAttribute('href', cleanHref);
        }
      } else {
        link.setAttribute('href', cleanHref);
      }

      const finalHref = link.getAttribute('href') || '';
      if (isExternal(finalHref)) {
        link.setAttribute('target', '_blank');
        link.setAttribute('rel', 'noopener noreferrer');
      }
    }
  });

  if (blockExternalMedia) {
    const externalSources = tempDiv.querySelectorAll('[src]');
    externalSources.forEach((el) => {
      const rawSrc = el.getAttribute('src');
      if (rawSrc) {
        const cleanSrc = cleanUrl(rawSrc);
        el.setAttribute('src', cleanSrc);

        if (isExternal(cleanSrc)) {
          el.setAttribute('data-external-src', cleanSrc);
          if (el.tagName.toLowerCase() === 'img') {
            // SVG placeholder: dashed border + image-frame icon makes it obvious
            // something is being deliberately blocked (not just a broken image).
            const placeholderSvg =
              '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 50">' +
              '<rect width="80" height="50" fill="#f0f2f5" rx="4"/>' +
              '<rect x="1.5" y="1.5" width="77" height="47" fill="none" stroke="#c8cdd6" stroke-width="1.5" stroke-dasharray="5 4" rx="3"/>' +
              '<rect x="26" y="14" width="28" height="22" rx="2" fill="none" stroke="#aab0be" stroke-width="1.5"/>' +
              '<circle cx="34" cy="21" r="3" fill="#c8cdd6"/>' +
              '<polyline points="26,34 35,24 43,30 48,24 54,34" fill="none" stroke="#c8cdd6" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>' +
              '</svg>';
            el.setAttribute('src', 'data:image/svg+xml;base64,' + btoa(placeholderSvg));
            el.setAttribute('alt', 'blocked image');
            (el as HTMLElement).style.display = 'inline-block';

            // HTML width/height attrs are unitless integers; CSS needs explicit px
            const attrW = el.getAttribute('width');
            const attrH = el.getAttribute('height');
            (el as HTMLElement).style.width = attrW
              ? /^\d+$/.test(attrW)
                ? `${attrW}px`
                : attrW
              : '100%';
            (el as HTMLElement).style.height = attrH
              ? /^\d+$/.test(attrH)
                ? `${attrH}px`
                : attrH
              : '60px';
          } else {
            el.setAttribute('src', '');
          }
        }
      }
    });
  }

  return tempDiv.innerHTML;
}
