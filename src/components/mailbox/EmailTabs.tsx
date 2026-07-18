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

// EmailTabs.tsx
import { useState } from 'react';
import { Tabs } from '@radix-ui/themes';
import EmailAttachments, { type EmailAttachment } from './EmailAttachments';
import EmailHtmlContent from './EmailHtmlContent';
import EmailTextContent from './EmailTextContent';
import { ICSViewer } from './ICSViewer';
import { useAtomValue } from 'jotai';
import { userDetailsAtom } from '../../state/userDetails';
import { emailAddress } from '../../state/emailAddress';
import { useSendMail } from '../../hooks/useComposer';
import { generateMessageId, type ComposerRequest } from '../../api/composer';
import { useToast } from '../../hooks/useToast';
import { SEND_DEFAULT } from '../../constants/constant';
import { formatComposedEmailData } from '../../utils/replyForwardHelper';

// Loose shape covering both postal-mime attachments and the composer's local
// payload shape — filename deliberately excludes `null` (postal-mime's real
// type) since every consumer here already falls back with `||`, so treating
// it as `string | undefined` doesn't change behavior but keeps this assignable
// to EmailHtmlContent's own attachment type without an extra cast.
interface EmailTabAttachment {
  filename?: string;
  mimeType?: string;
  contentId?: string;
  content?: string;
  contentType?: string;
  data?: string;
}

interface EmailTabCalendarPart {
  mimeType?: string;
  contentType?: string;
  body?: string;
}

// Real postal-mime `Email` (content: string | ArrayBuffer) is cast to this at
// each caller — attachmentEncoding: 'base64' guarantees `content` is always a
// string in practice, but the library's declared type doesn't reflect that.
export interface ParsedEmailForTabs {
  html?: string;
  text?: string;
  attachments: EmailTabAttachment[];
  parts?: EmailTabCalendarPart[];
}

interface EmailTabsProps {
  parsedEmail: ParsedEmailForTabs;
  rawEmail: string;
}

const getIcsData = (parsedEmail: ParsedEmailForTabs): string | null => {
  const calendarPart = parsedEmail?.parts?.find(
    (p) => p.mimeType === 'text/calendar' || p.contentType?.includes('text/calendar')
  );
  const icsAttachment = parsedEmail?.attachments?.find(
    (a) =>
      a.filename?.endsWith('.ics') ||
      a.mimeType === 'text/calendar' ||
      a.contentType?.includes('text/calendar')
  );

  const raw = calendarPart?.body || icsAttachment?.content || icsAttachment?.data;
  if (!raw) return null;

  if (!raw.includes('BEGIN:VCALENDAR')) {
    try {
      return atob(raw);
    } catch {
      return null;
    }
  }
  return raw;
};

const EmailTabs = ({ parsedEmail }: EmailTabsProps) => {
  const icsData = getIcsData(parsedEmail);
  const defaultTab = parsedEmail.html ? 'html' : parsedEmail.text ? 'text' : 'attachments';
  const [allowExternalContent, setAllowExternalContent] = useState(false);

  const userDetails = useAtomValue(userDetailsAtom);
  const currentEmail = useAtomValue(emailAddress);
  const { mutate: sendMutate } = useSendMail();
  const toast = useToast();

  const displayAttachments = parsedEmail.attachments.filter((att) => {
    if (!att.contentId) return true;
    const cidReference = `cid:${att.contentId.replace(/^<|>$/g, '')}`;
    const isUsedInline = parsedEmail?.html?.includes(cidReference);
    return !isUsedInline;
  });

  const handleICSReply = ({
    to,
    subject,
    body,
    icsAttachment,
  }: {
    to: string;
    subject: string;
    body: string;
    icsAttachment: string;
  }) => {
    const messageId = generateMessageId(userDetails?.domain || 'webmail.local');

    const mailData = formatComposedEmailData(
      {
        from_id: {
          email: currentEmail?.address || '',
          name: currentEmail?.name || '',
        },
        to: [{ name: '', address: to }],
        cc: [],
        bcc: [],
        subject,
        html: `<pre>${body}</pre>`,
        text: body,
        messageId: messageId,
        headers: {
          'Message-ID': messageId,
          'In-Reply-To': messageId,
        },
        attachments: [
          {
            filename: 'invite-reply.ics',
            data: btoa(icsAttachment), // ← 'data' not 'content'
            mime_type: 'text/calendar', // ← 'mime_type' not 'content_type'
            size: icsAttachment.length,
            disposition: 'attachment',
            content_id: null,
          },
        ],
      },
      {
        folder_path: SEND_DEFAULT || 'Sent',
        priority: 'normal',
        isDraft: false,
      }
    );

    sendMutate(mailData as unknown as ComposerRequest, {
      onSuccess: () => toast.success({ description: 'RSVP response sent to organizer.' }),
      onError: (err) => toast.error({ description: err?.message || 'Failed to send RSVP.' }),
    });
  };

  return (
    <>
      {icsData && (
        <ICSViewer
          icsData={icsData}
          currentUserEmail={userDetails?.email}
          onSendReply={handleICSReply}
        />
      )}

      <Tabs.Root defaultValue={defaultTab}>
        <Tabs.List>
          {parsedEmail.html && <Tabs.Trigger value="html">HTML</Tabs.Trigger>}
          {parsedEmail.text && <Tabs.Trigger value="text">Plain Text</Tabs.Trigger>}
          <Tabs.Trigger value="attachments">
            Attachments {displayAttachments?.length > 0 ? `(${displayAttachments.length})` : '(0)'}
          </Tabs.Trigger>
        </Tabs.List>

        {parsedEmail.html && (
          <Tabs.Content value="html">
            <EmailHtmlContent
              attachments={parsedEmail.attachments}
              htmlContent={parsedEmail.html}
              allowExternalContent={allowExternalContent}
              onToggleExternalContent={setAllowExternalContent}
            />
          </Tabs.Content>
        )}

        {parsedEmail.text && (
          <Tabs.Content value="text">
            <EmailTextContent textContent={parsedEmail.text} />
          </Tabs.Content>
        )}

        <Tabs.Content value="attachments">
          <EmailAttachments
            attachments={parsedEmail.attachments as unknown as EmailAttachment[]}
            emailHtml={parsedEmail.html}
          />
        </Tabs.Content>
      </Tabs.Root>
    </>
  );
};

export default EmailTabs;
