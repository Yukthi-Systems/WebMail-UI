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

// src/hooks/useEmailParser.ts
import { useState, useEffect, useCallback, useRef } from 'react';
import PostalMime from 'postal-mime';
import { extractHeaders, parseHeaders } from '../utils/emailUtils';

interface UseEmailParserProps {
  rawEmail?: string;
  key: string;
  onContentLoaded?: (content: string) => void;
  onAttachmentsLoaded?: (attachments: any[]) => void;
}

export const useEmailParser = ({
  rawEmail,
  key,
  onContentLoaded,
  onAttachmentsLoaded,
}: UseEmailParserProps) => {
  const [parsedEmail, setParsedEmail] = useState<any>(null);
  const [parseError, setParseError] = useState<string | null>(null);
  const [isParsing, setIsParsing] = useState(false);
  const [headers, setHeaders] = useState<Record<string, string>>({});
  const lastParsedKey = useRef<string>('');

  const parseEmailContent = useCallback(
    async (emailContent: string) => {
      setIsParsing(true);
      try {
        const parsed = await PostalMime.parse(emailContent, {
          attachmentEncoding: 'base64',
        });
        setParsedEmail(parsed);
        setParseError(null);

        // Extract headers from raw email
        const extractedHeaders = extractHeaders(emailContent);
        setHeaders(extractedHeaders);

        // Also set headers from parsed email if available
        if (parsed.headers) {
          const parsedHeaders = parseHeaders(parsed.headers);
          setHeaders((prev) => ({ ...prev, ...parsedHeaders }));
        }

        // Call callbacks if provided
        if (onContentLoaded) {
          const content = parsed.html || parsed.text || '';
          onContentLoaded(content);
        }

        if (onAttachmentsLoaded && parsed.attachments) {
          onAttachmentsLoaded(parsed.attachments);
        }
      } catch (error) {
        setParseError(error instanceof Error ? error.message : 'Failed to parse email');
        setParsedEmail(null);

        if (onContentLoaded) {
          onContentLoaded(emailContent);
        }
      } finally {
        setIsParsing(false);
      }
    },
    [onContentLoaded, onAttachmentsLoaded]
  );

  useEffect(() => {
    if (rawEmail && key && lastParsedKey.current !== key) {
      lastParsedKey.current = key;
      parseEmailContent(rawEmail);
    }
  }, [rawEmail, key, parseEmailContent]);

  return {
    parsedEmail,
    parseError,
    isParsing,
    headers,
    setHeaders,
  };
};
