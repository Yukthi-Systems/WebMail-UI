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
import { Button, Flex, Dialog, TextField } from '@radix-ui/themes';
import { FaImage, FaLink } from 'react-icons/fa';
import { useRef, useState } from 'react';

type ImageMenuProps = {
  editor: Editor;
};

const ImageMenu = ({ editor }: ImageMenuProps) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [urlDialogOpen, setUrlDialogOpen] = useState(false);
  const [imageUrl, setImageUrl] = useState('');

  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file || !editor) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    // Read and insert image
    const reader = new FileReader();
    reader.onload = (e) => {
      const dataUrl = e.target?.result as string;
      editor.chain().focus().setImage({ src: dataUrl }).run();
    };
    reader.readAsDataURL(file);

    // Reset input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleInsertUrl = () => {
    if (imageUrl.trim()) {
      editor.chain().focus().setImage({ src: imageUrl.trim() }).run();
      setImageUrl('');
      setUrlDialogOpen(false);
    }
  };

  const handleUrlKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleInsertUrl();
    }
  };

  return (
    <>
      <Flex gap="1" align="center">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />

        <Button
          variant="soft"
          size="1"
          onClick={() => fileInputRef.current?.click()}
          title="Insert Image"
        >
          <FaImage />
        </Button>

        <Button
          variant="soft"
          size="1"
          onClick={() => setUrlDialogOpen(true)}
          title="Insert Image from URL"
        >
          <FaLink />
        </Button>
      </Flex>

      {/* Image URL Dialog */}
      <Dialog.Root open={urlDialogOpen} onOpenChange={setUrlDialogOpen}>
        <Dialog.Content style={{ maxWidth: 450 }}>
          <Dialog.Title>Insert Image from URL</Dialog.Title>

          <Flex direction="column" gap="3">
            <label>
              <div className="text-sm font-medium text-[var(--gray-12)] mb-2">Image URL</div>
              <TextField.Root
                placeholder="https://example.com/image.jpg"
                value={imageUrl}
                onChange={(e) => setImageUrl(e.target.value)}
                onKeyDown={handleUrlKeyDown}
              />
            </label>
          </Flex>

          <Flex gap="3" mt="4" justify="end">
            <Dialog.Close>
              <Button variant="soft" color="gray">
                Cancel
              </Button>
            </Dialog.Close>
            <Button onClick={handleInsertUrl} disabled={!imageUrl.trim()}>
              Insert Image
            </Button>
          </Flex>
        </Dialog.Content>
      </Dialog.Root>
    </>
  );
};

export default ImageMenu;
