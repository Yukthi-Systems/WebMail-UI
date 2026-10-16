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

import { useEffect, useRef, useState } from 'react';
import { Button, Dialog, Flex, Text, TextField } from '@radix-ui/themes';

const MAX_NAME_LENGTH = 200;

/**
 * "report.final.pdf" → { base: "report.final", ext: ".pdf" }; ".env" has no
 * extension.
 */
const splitFileName = (filename: string): { base: string; ext: string } => {
  const dot = filename.lastIndexOf('.');
  return dot > 0 && dot < filename.length - 1
    ? { base: filename.slice(0, dot), ext: filename.slice(dot) }
    : { base: filename, ext: '' };
};

// Path separators and control characters would break the name on the recipient's side
// eslint-disable-next-line no-control-regex
const cleanBaseName = (base: string) => base.replace(/[\\/\u0000-\u001f\u007f]/g, '').trim();

interface RenameFileDialogProps {
  /** File being renamed; the dialog is open while this is set. */
  filename: string | null;
  onSave: (filename: string) => void;
  onClose: () => void;
}

/**
 * Small dialog to rename an attachment. Only the name is editable: the
 * extension stays as is, so the file keeps opening with the right application.
 */
const RenameFileDialog = ({ filename, onSave, onClose }: RenameFileDialogProps) => {
  const open = filename !== null;
  const { base, ext } = splitFileName(filename ?? '');
  const [value, setValue] = useState(base);
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);

  // Start from the current name each time the dialog opens
  useEffect(() => {
    if (open) {
      setValue(base);
      setError('');
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, filename]);

  const cleaned = cleanBaseName(value);
  const unchanged = cleaned + ext === filename;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cleaned) {
      setError('Enter a file name');
      inputRef.current?.focus();
      return;
    }
    if (unchanged) onClose();
    else onSave(cleaned + ext);
  };

  return (
    <Dialog.Root open={open} onOpenChange={(next) => !next && onClose()}>
      <Dialog.Content
        maxWidth="440px"
        // Keys stay in the dialog: Esc must not also close the composer or the preview
        onKeyDown={(e) => e.stopPropagation()}
        onClick={(e) => e.stopPropagation()}
        onOpenAutoFocus={(e) => {
          // Focus the name with the text selected, ready to type over
          e.preventDefault();
          inputRef.current?.focus();
          inputRef.current?.select();
        }}
      >
        <Dialog.Title size="4" mb="1">
          Rename file
        </Dialog.Title>
        <Dialog.Description size="2" color="gray" mb="4">
          This is the name recipients will see.
          {ext && (
            <>
              {' '}
              The <strong>{ext}</strong> extension is kept so the file opens correctly.
            </>
          )}
        </Dialog.Description>

        <form onSubmit={submit}>
          <label>
            <Text as="div" size="2" weight="medium" mb="1">
              File name
            </Text>
            <TextField.Root
              ref={inputRef}
              // 16px text: smaller makes iOS zoom the page on focus
              size="3"
              value={value}
              maxLength={MAX_NAME_LENGTH}
              spellCheck={false}
              autoComplete="off"
              autoCapitalize="off"
              enterKeyHint="done"
              aria-invalid={!!error}
              color={error ? 'red' : undefined}
              onChange={(e) => {
                setValue(e.target.value);
                if (error) setError('');
              }}
            >
              {ext && (
                <TextField.Slot side="right">
                  <Text size="2" color="gray">
                    {ext}
                  </Text>
                </TextField.Slot>
              )}
            </TextField.Root>
          </label>
          <Text as="p" size="1" color="red" mt="1" style={{ minHeight: 18 }} role="alert">
            {error}
          </Text>

          <Flex gap="3" mt="3" justify="end">
            <Dialog.Close>
              <Button type="button" variant="soft" color="gray" size="3">
                Cancel
              </Button>
            </Dialog.Close>
            <Button type="submit" size="3" disabled={!!cleaned && unchanged}>
              Rename
            </Button>
          </Flex>
        </form>
      </Dialog.Content>
    </Dialog.Root>
  );
};

export default RenameFileDialog;
