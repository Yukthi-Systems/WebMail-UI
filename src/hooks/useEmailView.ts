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

// src/hooks/useEmailView.ts
import { useQueries, useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useMemo } from 'react';
import {
  emailAttachment,
  emailView,
  type EmailViewAttachment,
  type EmailViewResponse,
} from '../api/mailbox';
import { HttpError } from '../api/fetchWrapper';

/**
 * Attachment as consumed by the viewer components (EmailTabs, EmailHtmlContent,
 * EmailAttachments, printing). `content` (base64) is only present once the part
 * has been downloaded — use `loadContent()` to fetch it on demand.
 */
export interface ViewAttachment {
  partId: string;
  filename: string;
  mimeType: string;
  size: number;
  contentId?: string;
  isInline: boolean;
  content?: string;
  loadContent: () => Promise<string>;
}

export interface ParsedEmailView {
  html?: string;
  text?: string;
  attachments: ViewAttachment[];
  headers: Record<string, string>;
  flags: string[];
}

// Same caching rule as the old raw hook: only cache when keyed by a stable
// Message-ID. Sequence ids shift after deletions, so a seq-id key must never
// serve content of a different email that inherited the id.
const cacheTimes = (stableKey: string) => ({
  staleTime: stableKey ? 10 * 60 * 1000 : 0,
  gcTime: stableKey ? 30 * 60 * 1000 : 0,
});

// 400 (bad id) and 404 (email / part gone) won't succeed on retry
const retryUnlessGone = (failureCount: number, error: Error) =>
  !(error instanceof HttpError && (error.status === 400 || error.status === 404)) &&
  failureCount < 3;

export function emailViewCacheKey(id: string, folderPath: string, stableKey: string) {
  return ['email', 'view', stableKey || id, folderPath] as const;
}

export function emailAttachmentCacheKey(
  id: string,
  folderPath: string,
  stableKey: string,
  partId: string
) {
  return ['email', 'attachment', stableKey || id, folderPath, partId] as const;
}

export const blobToBase64 = (blob: Blob): Promise<string> =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = String(reader.result);
      resolve(dataUrl.slice(dataUrl.indexOf(',') + 1));
    };
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(blob);
  });

export const isEmailGoneError = (error: unknown) =>
  error instanceof HttpError && error.status === 404;

export const attachmentErrorMessage = (error: unknown): string => {
  if (error instanceof HttpError) {
    if (error.status === 404) {
      return 'This attachment is no longer available. The email may have been moved or deleted.';
    }
    if (error.status === 424) {
      return 'The mail server could not provide this attachment. Please try again.';
    }
  }
  return 'Failed to download attachment. Please try again.';
};

export const emailViewErrorMessage = (error: unknown): string => {
  if (isEmailGoneError(error)) {
    return 'This email no longer exists. It may have been moved or deleted in another client.';
  }
  if (error instanceof HttpError && error.status === 424) {
    return 'The mail server could not load this email. Please try again.';
  }
  return error instanceof Error ? error.message : 'Failed to load email.';
};

/** Opens an email: body + attachment list only, marks it as read. */
export function useEmailView(id: string, folderPath: string, stableKey: string, enabled = true) {
  return useQuery({
    queryKey: emailViewCacheKey(id, folderPath, stableKey),
    queryFn: () => emailView(id, folderPath, true),
    enabled: enabled && !!id && !!folderPath,
    retry: retryUnlessGone,
    retryDelay: () => 500,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
    ...cacheTimes(stableKey),
  });
}

/** Warms the view cache on hover without marking the email as read. */
export const useEmailViewPrefetch = () => {
  const queryClient = useQueryClient();

  const prefetchEmailView = useCallback(
    (id: string, folderPath: string, stableKey: string) => {
      if (!id || !folderPath) return;

      const queryKey = emailViewCacheKey(id, folderPath, stableKey);
      if (queryClient.getQueryData(queryKey)) return;

      // Delay so priority requests (the email being opened) finish first
      setTimeout(() => {
        const isAnythingFetching = queryClient.isFetching({ queryKey: ['email', 'view'] }) > 0;
        if (!isAnythingFetching) {
          queryClient.prefetchQuery({
            queryKey,
            queryFn: () => emailView(id, folderPath, false),
            ...cacheTimes(stableKey),
          });
        }
      }, 600);
    },
    [queryClient]
  );

  return { prefetchEmailView };
};

const cidOf = (attachment: EmailViewAttachment) =>
  attachment.content_id ? attachment.content_id.replace(/^<|>$/g, '') : '';

// Parts downloaded right away: images embedded in the HTML body (cid:) and
// calendar invites (the ICS viewer renders above the body). Everything else
// is downloaded only when the user clicks it.
const MAX_EAGER_CALENDAR_BYTES = 1024 * 1024;
const isEagerPart = (attachment: EmailViewAttachment, html: string) => {
  const cid = cidOf(attachment);
  if (cid && (attachment.is_inline || html.includes(`cid:${cid}`))) return true;
  return attachment.content_type === 'text/calendar' && attachment.size <= MAX_EAGER_CALENDAR_BYTES;
};

// Module-level so useQueries can memoize the combined result
const combineData = (results: { data?: string }[]) => results.map((result) => result.data);

/**
 * Adapts a /email/view response to the shape the viewer components expect,
 * downloading inline images in the background (the body renders immediately; a
 * failed image just stays broken).
 */
export function useParsedEmailView(
  view: EmailViewResponse | undefined,
  id: string,
  folderPath: string,
  stableKey: string
): ParsedEmailView | null {
  const queryClient = useQueryClient();

  const fetchPart = useCallback(
    async (partId: string, inline: boolean) =>
      blobToBase64(await emailAttachment(id, partId, folderPath, inline)),
    [id, folderPath]
  );

  const loadAttachment = useCallback(
    (partId: string) =>
      queryClient.fetchQuery({
        queryKey: emailAttachmentCacheKey(id, folderPath, stableKey, partId),
        queryFn: () => fetchPart(partId, false),
        ...cacheTimes(stableKey),
      }),
    [queryClient, id, folderPath, stableKey, fetchPart]
  );

  const eagerParts = useMemo(
    () => view?.attachments?.filter((a) => isEagerPart(a, view.body?.html || '')) ?? [],
    [view]
  );

  const eagerContent = useQueries({
    queries: eagerParts.map((attachment) => ({
      queryKey: emailAttachmentCacheKey(id, folderPath, stableKey, attachment.part_id),
      queryFn: () => fetchPart(attachment.part_id, true),
      retry: 1,
      refetchOnWindowFocus: false,
      ...cacheTimes(stableKey),
    })),
    combine: combineData,
  });

  return useMemo(() => {
    if (!view) return null;

    const contentByPart = new Map(
      eagerParts.map((attachment, index) => [attachment.part_id, eagerContent[index]])
    );

    return {
      html: view.body?.html ?? undefined,
      text: view.body?.text ?? undefined,
      headers: view.headers ?? {},
      flags: view.flags ?? [],
      attachments: (view.attachments ?? []).map((attachment) => ({
        partId: attachment.part_id,
        filename: attachment.filename,
        mimeType: attachment.content_type || 'application/octet-stream',
        size: attachment.size,
        contentId: cidOf(attachment) || undefined,
        isInline: attachment.is_inline,
        content: contentByPart.get(attachment.part_id),
        loadContent: () => loadAttachment(attachment.part_id),
      })),
    };
  }, [view, eagerParts, eagerContent, loadAttachment]);
}
