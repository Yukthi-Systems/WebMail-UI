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

import type { GeneralSettings } from '../../../api/user';
import { FaPenToSquare, FaPlus, FaRegTrashCan } from 'react-icons/fa6';
import DropdownWrapper from '../../common/DropdownWrapper';
import { Button, DropdownMenu } from '@radix-ui/themes';

type Signature = {
  name: string;
  content: string;
};

type SignatureSelectorProps = {
  signatures: GeneralSettings['general']['signature'];
  selectedSignature?: string;
  onSignatureChange?: (signatureName: string) => void;
  onAddSignature?: () => void;
  onEditSignature?: (signature: Signature) => void;
  onDeleteSignature?: (signatureName: string) => void;
};

export const SignatureSelector = ({
  signatures,
  selectedSignature,
  onSignatureChange,
  onAddSignature,
  onEditSignature,
  onDeleteSignature,
}: SignatureSelectorProps) => {
  const selectedSig = signatures?.find((s) => s.name === selectedSignature) || null;

  const handleAdd = () => {
    onAddSignature?.();
  };

  const handleEdit = () => {
    if (selectedSig && onEditSignature) {
      onEditSignature(selectedSig);
    }
  };

  const handleDelete = () => {
    if (selectedSig && onDeleteSignature) {
      onDeleteSignature(selectedSig.name);
    }
  };

  // No signatures case
  if (!signatures || signatures.length === 0) {
    return (
      <div className="space-y-4 ">
        <div className="flex items-center gap-3">
          <span className="text-sm text-[var(--gray-11)]">No signatures configured</span>
          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center justify-center w-8 h-8 text-[var(--accent-11)] hover:text-[var(--accent-12)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
            title="Add signature"
          >
            <FaPlus size={14} />
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 min-w-[300px] ">
      {/* Signature Selector */}
      <div className="flex items-center gap-3">
        <div className="flex-1">
          <DropdownWrapper
            items={signatures.map((sig) => ({
              key: sig.name,
              label: sig.name,
              selected: selectedSignature === sig.name,
              onSelect: () => onSignatureChange?.(sig.name),
            }))}
            trigger={
              <Button variant="outline" className="min-w-[200px] justify-between">
                <span className="truncate">{selectedSignature || 'Select signature...'}</span>
                <DropdownMenu.TriggerIcon />
              </Button>
            }
          />
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleEdit}
            disabled={!selectedSig}
            className="flex items-center justify-center w-8 h-8 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-3)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Edit signature"
          >
            <FaPenToSquare size={14} />
          </button>

          <button
            type="button"
            onClick={handleAdd}
            className="flex items-center justify-center w-8 h-8 text-[var(--accent-11)] hover:text-[var(--accent-12)] hover:bg-[var(--accent-3)] rounded-md transition-colors"
            title="Add signature"
          >
            <FaPlus size={14} />
          </button>

          <button
            type="button"
            onClick={handleDelete}
            disabled={!selectedSig}
            className="flex items-center justify-center w-8 h-8 text-[var(--red-11)] hover:text-[var(--red-12)] hover:bg-[var(--red-3)] rounded-md transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Delete signature"
          >
            <FaRegTrashCan size={14} />
          </button>
        </div>
      </div>
    </div>
  );
};
