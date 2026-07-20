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

import { Editor } from '@tiptap/core';
import { Button, Dialog, Flex, TextField } from '@radix-ui/themes';
import { useEffect, useState } from 'react';
import { FiLink, FiLink2, FiTrash2 } from 'react-icons/fi';

type LinkMenuProps = {
  editor: Editor;
};

const LinkMenu = ({ editor }: LinkMenuProps) => {
  const [open, setOpen] = useState(false);
  const [url, setUrl] = useState('');
  const [displayText, setDisplayText] = useState('');

  const isLinkActive = editor.isActive('link');
  const hasSelection = !editor.state.selection.empty;

  // Pre-fill when opening on an existing link
  useEffect(() => {
    if (open) {
      const existingHref = editor.getAttributes('link').href ?? '';
      setUrl(existingHref);
      // Only show display text field when there is no selection and it's not an existing link
      setDisplayText('');
    }
  }, [open, editor]);

  const handleApply = () => {
    const trimmed = url.trim();
    if (!trimmed) return;

    const href =
      trimmed.startsWith('http://') ||
      trimmed.startsWith('https://') ||
      trimmed.startsWith('mailto:')
        ? trimmed
        : `https://${trimmed}`;

    if (!hasSelection && !isLinkActive && displayText.trim()) {
      // No selection and no existing link — insert new linked text
      editor
        .chain()
        .focus()
        .insertContent({
          type: 'text',
          text: displayText.trim(),
          marks: [
            {
              type: 'link',
              attrs: { href, target: '_blank', rel: 'noopener noreferrer' },
            },
          ],
        })
        .run();
    } else {
      // Selection exists or cursor is on an existing link — set/update the link
      editor.chain().focus().setLink({ href, target: '_blank' }).run();
    }

    setOpen(false);
  };

  const handleRemove = () => {
    editor.chain().focus().unsetLink().run();
    setOpen(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleApply();
    }
  };

  // Whether to show the "Display text" field:
  // only when there's no selection AND not editing an existing link
  const showDisplayText = !hasSelection && !isLinkActive;

  return (
    <>
      <Button
        variant={isLinkActive ? 'solid' : 'soft'}
        size="1"
        title={isLinkActive ? 'Edit link' : 'Insert link'}
        onClick={() => setOpen(true)}
        radius="small"
      >
        <FiLink2 size={13} />
      </Button>

      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Content style={{ maxWidth: 420 }}>
          <Dialog.Title>
            <Flex align="center" gap="2">
              <FiLink size={15} />
              {isLinkActive ? 'Edit link' : 'Insert link'}
            </Flex>
          </Dialog.Title>

          <Flex direction="column" gap="3" mt="2">
            {/* URL input */}
            <label>
              <div className="text-sm font-medium text-[var(--gray-12)] mb-1.5">URL</div>
              <TextField.Root
                placeholder="https://example.com"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
            </label>

            {/* Display text — only when inserting fresh with no selection */}
            {showDisplayText && (
              <label>
                <div className="text-sm font-medium text-[var(--gray-12)] mb-1.5">
                  Display text <span className="text-[var(--gray-10)] font-normal">(optional)</span>
                </div>
                <TextField.Root
                  placeholder="Link text shown in the email"
                  value={displayText}
                  onChange={(e) => setDisplayText(e.target.value)}
                  onKeyDown={handleKeyDown}
                />
              </label>
            )}
          </Flex>

          <Flex gap="2" mt="4" justify="between" align="center">
            {/* Remove — only when editing an existing link */}
            <div>
              {isLinkActive && (
                <Button variant="soft" color="red" size="2" onClick={handleRemove}>
                  <FiTrash2 size={13} />
                  Remove link
                </Button>
              )}
            </div>

            <Flex gap="2">
              <Dialog.Close>
                <Button variant="soft" color="gray" size="2">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button size="2" onClick={handleApply} disabled={!url.trim()}>
                {isLinkActive ? 'Update' : 'Insert'}
              </Button>
            </Flex>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default LinkMenu;
