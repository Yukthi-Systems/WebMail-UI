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

// src/components/email/ICSViewer.tsx
import ICAL from 'ical.js';
import { useState } from 'react';
import {
  FaCalendarAlt,
  FaClock,
  FaMapMarkerAlt,
  FaUser,
  FaVideo,
  FaCheck,
  FaTimes,
  FaQuestion,
  FaDownload,
} from 'react-icons/fa';

interface ICSViewerProps {
  icsData: string;
  currentUserEmail?: string;
  onSendReply?: (replyEmail: {
    to: string;
    subject: string;
    body: string;
    icsAttachment: string;
  }) => void;
}

interface EventAttendee {
  name: string;
  email: string;
  status: string;
}

interface EventInfo {
  summary: string;
  description: string;
  location: string;
  start?: Date;
  end?: Date;
  organizerEmail: string;
  existingStatus: string | null;
  attendees: EventAttendee[];
}

function buildReplyICS(
  originalIcs: string,
  attendeeEmail: string,
  status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE'
): string {
  try {
    const jcal = ICAL.parse(originalIcs);
    const comp = new ICAL.Component(jcal);
    const vevent = comp.getFirstSubcomponent('vevent');
    if (!vevent) return '';

    const replyComp = new ICAL.Component(['vcalendar', [], []]);
    replyComp.addPropertyWithValue('version', '2.0');
    replyComp.addPropertyWithValue('prodid', '-//Webmail//EN');
    replyComp.addPropertyWithValue('method', 'REPLY');

    const replyEvent = new ICAL.Component('vevent');
    replyEvent.addPropertyWithValue('uid', vevent.getFirstPropertyValue('uid') || '');
    replyEvent.addPropertyWithValue('dtstamp', ICAL.Time.now());
    replyEvent.addPropertyWithValue('dtstart', vevent.getFirstPropertyValue('dtstart'));
    replyEvent.addPropertyWithValue('summary', vevent.getFirstPropertyValue('summary') || '');

    const organizerProp = vevent.getFirstProperty('organizer');
    if (organizerProp) replyEvent.addProperty(organizerProp);

    const attendeeProp = new ICAL.Property('attendee');
    attendeeProp.setParameter('partstat', status);
    attendeeProp.setParameter('rsvp', 'FALSE');
    attendeeProp.setValue(`mailto:${attendeeEmail}`);
    replyEvent.addProperty(attendeeProp);

    replyComp.addSubcomponent(replyEvent);
    return replyComp.toString();
  } catch {
    return '';
  }
}

export const ICSViewer = ({ icsData, currentUserEmail, onSendReply }: ICSViewerProps) => {
  const [rsvpStatus, setRsvpStatus] = useState<'ACCEPTED' | 'DECLINED' | 'TENTATIVE' | null>(null);
  const [sending, setSending] = useState(false);

  let event: EventInfo | null = null;
  let method = 'REQUEST';
  let organizerEmail = '';

  try {
    const jcal = ICAL.parse(icsData);
    const comp = new ICAL.Component(jcal);
    method = String(comp.getFirstPropertyValue('method') || 'REQUEST');
    const vevent = comp.getFirstSubcomponent('vevent');
    if (!vevent) return null;

    const icalEvent = new ICAL.Event(vevent);
    const organizerRaw = String(vevent.getFirstPropertyValue('organizer') || '');
    organizerEmail = organizerRaw.replace(/^mailto:/i, '');

    // Find current user's existing RSVP status
    let existingStatus: string | null = null;
    if (currentUserEmail) {
      vevent.getAllProperties('attendee').forEach((a: ICAL.Property) => {
        const email = String(a.getFirstValue() || '').replace(/^mailto:/i, '');
        if (email.toLowerCase() === currentUserEmail.toLowerCase()) {
          existingStatus = (a.getParameter('partstat') as string) || null;
        }
      });
    }
    if (existingStatus && !rsvpStatus) {
      // Pre-populate without triggering state update in render
    }

    event = {
      summary: icalEvent.summary || '(No Title)',
      description: icalEvent.description || '',
      location: icalEvent.location || '',
      start: icalEvent.startDate?.toJSDate(),
      end: icalEvent.endDate?.toJSDate(),
      organizerEmail,
      existingStatus,
      attendees: vevent.getAllProperties('attendee').map((a: ICAL.Property) => ({
        name: (a.getParameter('cn') as string) || '',
        email: String(a.getFirstValue() || '').replace(/^mailto:/i, ''),
        status: (a.getParameter('partstat') as string) || 'NEEDS-ACTION',
      })),
    };
  } catch {
    return (
      <div className="p-4 rounded-lg border border-[var(--red-6)] bg-[var(--red-2)] text-sm text-[var(--red-11)]">
        Could not parse calendar invite.
      </div>
    );
  }

  if (!event) return null;

  const fmt = (d: Date) =>
    d?.toLocaleString(undefined, {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  const statusColor: Record<string, string> = {
    ACCEPTED: 'text-[var(--green-11)]',
    DECLINED: 'text-[var(--red-11)]',
    TENTATIVE: 'text-[var(--yellow-11)]',
    'NEEDS-ACTION': 'text-[var(--gray-10)]',
  };

  const statusBadge: Record<string, string> = {
    ACCEPTED: 'bg-[var(--green-3)] border-[var(--green-6)] text-[var(--green-11)]',
    DECLINED: 'bg-[var(--red-3)] border-[var(--red-6)] text-[var(--red-11)]',
    TENTATIVE: 'bg-[var(--yellow-3)] border-[var(--yellow-6)] text-[var(--yellow-11)]',
    'NEEDS-ACTION': 'bg-[var(--gray-3)] border-[var(--gray-6)] text-[var(--gray-10)]',
  };

  const handleRSVP = async (status: 'ACCEPTED' | 'DECLINED' | 'TENTATIVE') => {
    if (!currentUserEmail || !onSendReply || !organizerEmail) return;
    setSending(true);

    const replyIcs = buildReplyICS(icsData, currentUserEmail, status);
    const statusText =
      status === 'ACCEPTED'
        ? 'accepted'
        : status === 'DECLINED'
          ? 'declined'
          : 'tentatively accepted';
    const subjectPrefix =
      status === 'ACCEPTED' ? 'Accepted' : status === 'DECLINED' ? 'Declined' : 'Tentative';

    onSendReply({
      to: organizerEmail,
      subject: `${subjectPrefix}: ${event.summary}`,
      body: `This is a response to your meeting invitation.\n\nI have ${statusText} the invitation for: ${event.summary}`,
      icsAttachment: replyIcs,
    });

    setRsvpStatus(status);
    setSending(false);
  };

  const handleDownload = () => {
    const blob = new Blob([icsData], { type: 'text/calendar' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${event.summary.replace(/[^a-z0-9]/gi, '_')}.ics`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentStatus = rsvpStatus || event.existingStatus;
  const isRequest = method === 'REQUEST';
  const isCancel = method === 'CANCEL';
  const canRSVP = isRequest && !!currentUserEmail && !!onSendReply && !!organizerEmail;

  return (
    <div className="my-4 rounded-xl border border-[var(--accent-6)] bg-[var(--accent-2)] overflow-hidden">
      {/* Header */}
      <div
        className={`px-5 py-3 flex items-center gap-3 ${isCancel ? 'bg-[var(--red-9)]' : 'bg-[var(--accent-9)]'}`}
      >
        <FaCalendarAlt className="text-white text-xl flex-shrink-0" />
        <div className="flex-1 min-w-0">
          <p className="text-white font-semibold text-base leading-tight truncate">
            {event.summary}
          </p>
          <p className="text-white/70 text-xs">
            {isCancel
              ? 'Meeting Cancelled'
              : method === 'REPLY'
                ? 'Meeting Response'
                : 'Calendar Invitation'}
          </p>
        </div>
        <button
          onClick={handleDownload}
          title="Download .ics"
          className="text-white/80 hover:text-white transition-colors p-1"
        >
          <FaDownload size={14} />
        </button>
      </div>

      {isCancel && (
        <div className="px-5 py-2 bg-[var(--red-3)] border-b border-[var(--red-6)] text-[var(--red-11)] text-sm font-medium">
          ⚠ This meeting has been cancelled by the organizer.
        </div>
      )}

      <div className="px-5 py-4 space-y-3 text-sm text-[var(--gray-12)]">
        {/* Time */}
        {event.start && (
          <div className="flex items-start gap-3">
            <FaClock className="text-[var(--accent-9)] mt-0.5 flex-shrink-0" />
            <div>
              <p className="font-medium">{fmt(event.start)}</p>
              {event.end && (
                <p className="text-[var(--gray-10)] text-xs mt-0.5">Ends: {fmt(event.end)}</p>
              )}
            </div>
          </div>
        )}

        {/* Location / Video */}
        {event.location && (
          <div className="flex items-start gap-3">
            {event.location.startsWith('http') ? (
              <FaVideo className="text-[var(--accent-9)] mt-0.5 flex-shrink-0" />
            ) : (
              <FaMapMarkerAlt className="text-[var(--accent-9)] mt-0.5 flex-shrink-0" />
            )}
            {event.location.startsWith('http') ? (
              <a
                href={event.location}
                target="_blank"
                rel="noreferrer"
                className="text-[var(--accent-11)] underline break-all"
              >
                Join meeting link
              </a>
            ) : (
              <span>{event.location}</span>
            )}
          </div>
        )}

        {/* Organizer */}
        {event.organizerEmail && (
          <div className="flex items-start gap-3">
            <FaUser className="text-[var(--accent-9)] mt-0.5 flex-shrink-0" />
            <span>
              Organizer: <span className="font-medium">{event.organizerEmail}</span>
            </span>
          </div>
        )}

        {/* Description */}
        {event.description && (
          <div className="p-3 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)] text-[var(--gray-11)] text-xs whitespace-pre-wrap">
            {event.description}
          </div>
        )}

        {/* Attendees */}
        {event.attendees.length > 0 && (
          <div>
            <p className="text-xs font-medium text-[var(--gray-11)] mb-2">
              Attendees ({event.attendees.length})
            </p>
            <div className="flex flex-wrap gap-2">
              {event.attendees.map((a, i: number) => (
                <span
                  key={i}
                  className={`text-xs px-2 py-0.5 rounded-full border ${statusBadge[a.status] || statusBadge['NEEDS-ACTION']}`}
                  title={`${a.email} — ${a.status}`}
                >
                  {a.name || a.email}
                  {a.status === 'ACCEPTED' && ' ✓'}
                  {a.status === 'DECLINED' && ' ✗'}
                  {a.status === 'TENTATIVE' && ' ?'}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* RSVP Buttons */}
        {canRSVP && !isCancel && (
          <div className="pt-2 border-t border-[var(--accent-5)]">
            {currentStatus && currentStatus !== 'NEEDS-ACTION' ? (
              <div className="flex items-center gap-3">
                <span className={`text-xs font-medium ${statusColor[currentStatus]}`}>
                  You{' '}
                  {currentStatus === 'ACCEPTED'
                    ? 'accepted'
                    : currentStatus === 'DECLINED'
                      ? 'declined'
                      : 'tentatively accepted'}{' '}
                  this invite
                </span>
                <button
                  onClick={() => setRsvpStatus(null)}
                  className="text-xs text-[var(--gray-10)] underline hover:text-[var(--gray-12)]"
                >
                  Change
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-[var(--gray-10)] mr-1">RSVP:</span>
                <button
                  disabled={sending}
                  onClick={() => handleRSVP('ACCEPTED')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--green-3)] hover:bg-[var(--green-4)] border border-[var(--green-6)] text-[var(--green-11)] transition-colors disabled:opacity-50"
                >
                  <FaCheck size={10} /> Accept
                </button>
                <button
                  disabled={sending}
                  onClick={() => handleRSVP('TENTATIVE')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--yellow-3)] hover:bg-[var(--yellow-4)] border border-[var(--yellow-6)] text-[var(--yellow-11)] transition-colors disabled:opacity-50"
                >
                  <FaQuestion size={10} /> Maybe
                </button>
                <button
                  disabled={sending}
                  onClick={() => handleRSVP('DECLINED')}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-[var(--red-3)] hover:bg-[var(--red-4)] border border-[var(--red-6)] text-[var(--red-11)] transition-colors disabled:opacity-50"
                >
                  <FaTimes size={10} /> Decline
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
