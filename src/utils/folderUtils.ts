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

// utils/folderUtils.ts
export interface FolderNode {
  name: string;
  path: string;
  flags: string[];
  delimiter: string;
  children: FolderNode[];
  unread_count: number;
}

/**
 * Some servers keep every folder under "INBOX/" (INBOX/Sent, INBOX/Trash,
 * INBOX/AIRTEL...). Like Roundcube, show those at the top level instead of
 * nesting everything under Inbox. Returns that prefix (e.g. "INBOX/") when
 * every folder other than INBOX is under it and the special folders live there
 * too, otherwise ''. Only the display changes — paths stay the full IMAP
 * names.
 */
export const getInboxNamespacePrefix = (
  folders: Array<{ folder_name: string; delimiter?: string | null; flags?: string[] }>
): string => {
  const inbox = folders.find((f) => f.folder_name.toUpperCase() === 'INBOX');
  const delimiter = inbox?.delimiter || folders.find((f) => f.delimiter)?.delimiter;
  if (!delimiter) return '';

  const prefix = `INBOX${delimiter}`;
  const others = folders.filter((f) => f !== inbox);
  const isUnderPrefix = (name: string) => name.toUpperCase().startsWith(prefix.toUpperCase());
  if (!others.length || !others.every((f) => isUnderPrefix(f.folder_name))) return '';

  // Only when the special folders are there too (i.e. INBOX/ is the namespace,
  // not just a user who filed their folders under Inbox)
  const hasSpecialFolder = (['sent', 'drafts', 'trash', 'spam'] as const).some(
    (kind) => resolveSpecialFolder(others, kind) !== undefined
  );
  return hasSpecialFolder
    ? folders.find((f) => isUnderPrefix(f.folder_name))!.folder_name.slice(0, prefix.length)
    : '';
};

export const buildFolderTree = (
  folders: Array<{
    flags: string[];
    delimiter: string;
    folder_name: string;
    unread_count: number;
  }>
): FolderNode[] => {
  const root: FolderNode[] = [];
  const map = new Map<string, FolderNode>();
  const namespacePrefix = getInboxNamespacePrefix(folders);
  // Name without the shared "INBOX/" namespace (INBOX itself is kept as is)
  const displayName = (folderName: string) =>
    namespacePrefix && folderName.startsWith(namespacePrefix)
      ? folderName.slice(namespacePrefix.length)
      : folderName;

  folders.forEach((folder) => {
    const node: FolderNode = {
      name: displayName(folder.folder_name).split(folder.delimiter).pop() || folder.folder_name,
      path: folder.folder_name,
      flags: folder.flags,
      delimiter: folder.delimiter,
      children: [],
      unread_count: folder.unread_count,
    };
    map.set(folder.folder_name, node);
  });

  folders.forEach((folder) => {
    const node = map.get(folder.folder_name)!;
    const parts = displayName(folder.folder_name).split(folder.delimiter);

    if (parts.length > 1) {
      // This is a child folder
      const parentPath =
        (folder.folder_name === displayName(folder.folder_name) ? '' : namespacePrefix) +
        parts.slice(0, -1).join(folder.delimiter);
      const parent = map.get(parentPath);

      if (parent) {
        parent.children.push(node);
        parent.children.sort((a, b) => a.name.localeCompare(b.name));
        return;
      }
    }

    // This is a root folder
    root.push(node);
  });

  return root.sort((a, b) => a.name.localeCompare(b.name));
};

// src/utils/sortUtils.ts
export const sortFoldersAscending = <T extends { name?: string; displayName?: string }>(
  folders: T[]
) => {
  return [...folders].sort((a, b) => {
    const nameA = (a.name || a.displayName || '').toLowerCase();
    const nameB = (b.name || b.displayName || '').toLowerCase();
    return nameA.localeCompare(nameB);
  });
};

// Same rule as the API's DELETE /folder/empty (it refuses other folders with 400)
const TRASH_FOLDER_NAMES = new Set([
  'trash',
  'deleted',
  'deleted items',
  'deleted messages',
  'bin',
]);
const SPAM_FOLDER_NAMES = new Set(['junk', 'spam', 'junk e-mail', 'junk email', 'bulk mail']);

/**
 * 'trash' / 'spam' when the folder can be emptied, otherwise null. A folder
 * qualifies by the server's special-use flag (\Trash, \Junk — returned without
 * the backslash), or by name when it is top level or directly under INBOX (a
 * user's own "Projects/Trash" is not the Trash).
 */
export const getEmptiableFolderKind = (
  folderName: string,
  detail?: { flags?: string[]; delimiter?: string | null }
): 'trash' | 'spam' | null => {
  const flags = (detail?.flags ?? []).map((flag) => flag.replace(/^\\/, '').toLowerCase());
  if (flags.includes('trash')) return 'trash';
  if (flags.includes('junk')) return 'spam';

  const delimiter = detail?.delimiter;
  let parts = delimiter ? folderName.split(delimiter) : [folderName];
  if (parts.length === 2 && parts[0].toUpperCase() === 'INBOX') parts = parts.slice(1);
  if (parts.length !== 1) return null;

  const name = parts[0].trim().toLowerCase();
  if (TRASH_FOLDER_NAMES.has(name)) return 'trash';
  if (SPAM_FOLDER_NAMES.has(name)) return 'spam';
  return null;
};

export type SpecialFolderKind = 'sent' | 'drafts' | 'trash' | 'spam';

interface SpecialFolderCandidate {
  folder_name: string;
  flags?: string[];
  delimiter?: string | null;
  status?: { MESSAGES?: number };
}

// Server special-use flags (returned without the backslash) and conventional
// names, most preferred first
const SPECIAL_FOLDERS: Record<SpecialFolderKind, { flags: string[]; names: string[] }> = {
  sent: { flags: ['sent'], names: ['sent', 'sent items', 'sent mail', 'sent messages'] },
  drafts: { flags: ['drafts'], names: ['drafts', 'draft'] },
  trash: {
    flags: ['trash'],
    names: ['trash', 'deleted items', 'deleted messages', 'deleted', 'bin'],
  },
  spam: {
    flags: ['junk', 'spam'],
    names: ['junk', 'spam', 'junk e-mail', 'junk email', 'bulk mail'],
  },
};

/**
 * Folder path parts without a leading "INBOX" namespace (e.g. "INBOX/Sent" →
 * ["Sent"]).
 */
const folderPathParts = (folder: SpecialFolderCandidate): string[] => {
  const delimiter = folder.delimiter;
  let parts = delimiter ? folder.folder_name.split(delimiter) : [folder.folder_name];
  if (parts.length > 1 && parts[0].toUpperCase() === 'INBOX') parts = parts.slice(1);
  return parts;
};

/**
 * Picks the folder that plays a special role (Sent, Drafts, Trash, Spam).
 *
 * Servers often flag more than one folder — Dovecot's default config marks both
 * "Sent" and "Sent Messages" as \Sent — and some keep every folder under an
 * "INBOX/" namespace ("INBOX/Sent"), so a plain `name === 'Sent'` check fails.
 * Among flagged folders the conventional name wins, compared without the INBOX
 * prefix; without flags, a top-level (or INBOX child) folder is matched by
 * name.
 */
export const resolveSpecialFolder = <T extends SpecialFolderCandidate>(
  folders: T[] | undefined | null,
  kind: SpecialFolderKind
): T | undefined => {
  if (!Array.isArray(folders) || folders.length === 0) return undefined;
  const { flags, names } = SPECIAL_FOLDERS[kind];

  const nameRank = (folder: T) => {
    const parts = folderPathParts(folder);
    const index = names.indexOf(parts[parts.length - 1].trim().toLowerCase());
    return index === -1 ? names.length : index;
  };
  const depth = (folder: T) => folderPathParts(folder).length;
  const hasFlag = (folder: T) =>
    (folder.flags ?? []).some((flag) => flags.includes(flag.replace(/^\\/, '').toLowerCase()));

  const flagged = folders.filter(hasFlag);
  const candidates = flagged.length
    ? flagged
    : folders.filter((folder) => depth(folder) === 1 && nameRank(folder) < names.length);

  // Several candidates (e.g. "Sent" and "Sent Messages" both flagged): the one
  // that actually holds mail wins — servers differ in which one their clients
  // used. Otherwise (none or several with mail, or no counts) the name decides.
  const withMail = candidates.filter((folder) => (folder.status?.MESSAGES ?? 0) > 0);
  if (candidates.length > 1 && withMail.length === 1) return withMail[0];

  return [...candidates].sort((a, b) => nameRank(a) - nameRank(b) || depth(a) - depth(b))[0];
};

/** Path of the Sent folder (where sent copies are saved), 'Sent' when unknown. */
export const getSentFolderPath = (folders: SpecialFolderCandidate[] | undefined | null): string =>
  resolveSpecialFolder(folders, 'sent')?.folder_name || 'Sent';

/**
 * IMAP path for a new top-level folder. On servers that keep every folder under
 * "INBOX/" (see getInboxNamespacePrefix) a bare name would be outside the
 * namespace and rejected, so it is created as "INBOX/<name>" (still shown at the
 * top level). Elsewhere the name is used as is.
 */
export const toTopLevelFolderPath = (
  name: string,
  folders: Array<{ folder_name: string; delimiter?: string | null; flags?: string[] }>
): string => {
  const prefix = getInboxNamespacePrefix(folders);
  return prefix && !name.toUpperCase().startsWith(prefix.toUpperCase()) ? prefix + name : name;
};
