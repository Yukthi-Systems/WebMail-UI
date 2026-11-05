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

/**
 * The quoted original of a reply or forward lives in the editor document, marked
 * with an attribute, so the toolbar works on it and it scrolls with the reply.
 *
 * The editor can't represent every email exactly (layout tables, unusual tags),
 * so the original is kept aside: as long as the user hasn't changed the quote,
 * the original HTML is what gets sent. An edited quote is sent as edited.
 */
export const QUOTE_ATTR = 'data-email-quote';

export interface OriginalQuote {
  /** The quote as first loaded */
  raw: string | null;
  /** The same quote after the editor parsed it: what an untouched quote looks like */
  normalized: string | null;
}

export const NO_QUOTE: OriginalQuote = { raw: null, normalized: null };

export const hasQuote = (html: string | undefined) => !!html && html.includes(QUOTE_ATTR);

export const wrapQuote = (html: string) => `<div ${QUOTE_ATTR}="">${html}</div>`;

const parse = (html: string) => new DOMParser().parseFromString(html, 'text/html');

/** The contents of the (outermost) quote, or null if the html has none */
export const extractQuote = (html: string | undefined): string | null => {
  if (!hasQuote(html)) return null;
  return parse(html as string).body.querySelector(`[${QUOTE_ATTR}]`)?.innerHTML ?? null;
};

/** What the user wrote, without the quote (e.g. to look for "see attached") */
export const withoutQuote = (html: string): string => {
  if (!hasQuote(html)) return html;
  const doc = parse(html);
  doc.body.querySelector(`[${QUOTE_ATTR}]`)?.remove();
  return doc.body.innerHTML;
};

/**
 * The html to send or save. An unchanged quote goes back to its original HTML.
 * The marker stays in drafts (reopening one finds the quote again), not in sent mail.
 */
export const prepareOutgoingHtml = (
  html: string,
  original: OriginalQuote,
  { keepMarker }: { keepMarker: boolean }
): string => {
  if (!hasQuote(html)) return html;
  const doc = parse(html);
  const quote = doc.body.querySelector(`[${QUOTE_ATTR}]`);
  if (!quote) return html;

  if (original.raw !== null && [original.raw, original.normalized].includes(quote.innerHTML)) {
    quote.innerHTML = original.raw;
  }
  if (!keepMarker) {
    doc.body
      .querySelectorAll(`[${QUOTE_ATTR}]`)
      .forEach((element) => element.removeAttribute(QUOTE_ATTR));
  }
  return doc.body.innerHTML;
};
