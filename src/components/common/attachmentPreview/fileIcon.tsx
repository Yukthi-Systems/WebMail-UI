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

import {
  FaFilePdf,
  FaFileImage,
  FaFileVideo,
  FaFileAudio,
  FaFileWord,
  FaFileExcel,
  FaFileArchive,
  FaFile,
  FaFilePowerpoint,
  FaFileCode,
  FaEnvelope,
} from 'react-icons/fa';
import { isEmlFile, isExcelFile, isPowerPointFile, isWordFile } from './previewUtils';

/** Icon for an attachment, by (normalized) MIME type. */
export const getAttachmentIcon = (mimeType: string, className: string = 'text-lg') => {
  if (isEmlFile(mimeType)) return <FaEnvelope className={`${className} text-[var(--blue-9)]`} />;
  if (mimeType.startsWith('image/'))
    return <FaFileImage className={`${className} text-[var(--green-9)]`} />;
  if (mimeType.startsWith('video/'))
    return <FaFileVideo className={`${className} text-[var(--red-9)]`} />;
  if (mimeType.startsWith('audio/'))
    return <FaFileAudio className={`${className} text-[var(--purple-9)]`} />;
  if (mimeType.includes('pdf')) return <FaFilePdf className={`${className} text-[var(--red-9)]`} />;
  if (isWordFile(mimeType)) return <FaFileWord className={`${className} text-[var(--blue-9)]`} />;
  if (isExcelFile(mimeType))
    return <FaFileExcel className={`${className} text-[var(--green-9)]`} />;
  if (isPowerPointFile(mimeType))
    return <FaFilePowerpoint className={`${className} text-[var(--orange-9)]`} />;
  if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('rar'))
    return <FaFileArchive className={`${className} text-[var(--orange-9)]`} />;
  if (
    mimeType.includes('javascript') ||
    mimeType.includes('json') ||
    mimeType.includes('xml') ||
    mimeType.includes('html') ||
    mimeType.includes('css')
  )
    return <FaFileCode className={`${className} text-[var(--violet-9)]`} />;
  return <FaFile className={`${className} text-[var(--gray-9)]`} />;
};
