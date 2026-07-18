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

import { useState, useRef } from 'react';
import { FiUpload, FiX, FiSearch, FiSave, FiEye } from 'react-icons/fi';
import { useToast } from '../../../hooks/useToast';
import { API_CONFIG } from '../../../constants/config';
import { BgImageService } from '../../../utils/bimiService';

const DNS_BASE = `${API_CONFIG.DNS_API_URL}/api/dns`;

interface FilePreview {
  file: File | null;
  previewUrl: string | null;
}

const emptyPreview = (): FilePreview => ({ file: null, previewUrl: null });

function ImageUpload({
  label,
  value,
  onChange,
}: {
  label: string;
  value: FilePreview;
  onChange: (v: FilePreview) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    const previewUrl = URL.createObjectURL(file);
    onChange({ file, previewUrl });
  };

  const clear = () => {
    if (value.previewUrl && value.previewUrl.startsWith('blob:')) {
      URL.revokeObjectURL(value.previewUrl);
    }
    onChange(emptyPreview());
    if (inputRef.current) inputRef.current.value = '';
  };

  return (
    <div className="space-y-2">
      <label className="block text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wide">
        {label}
      </label>
      <div
        className="relative flex flex-col items-center justify-center border-2 border-dashed border-[var(--gray-5)] rounded-lg p-4 hover:border-[var(--accent-7)] transition-colors cursor-pointer bg-[var(--gray-1)] min-h-[120px]"
        onClick={() => inputRef.current?.click()}
      >
        {value.previewUrl ? (
          <>
            <img
              src={value.previewUrl}
              alt="preview"
              className="max-h-20 max-w-full object-contain rounded"
              onClick={(e) => e.stopPropagation()}
            />
            <p className="text-[10px] text-[var(--gray-10)] mt-1 truncate max-w-full">
              {value.file ? value.file.name : 'Current Asset'}
            </p>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                clear();
              }}
              className="absolute top-1.5 right-1.5 p-1 bg-[var(--red-9)] text-white rounded-full hover:bg-[var(--red-10)] transition-colors"
            >
              <FiX size={10} />
            </button>
          </>
        ) : (
          <>
            <FiUpload className="w-6 h-6 text-[var(--gray-9)] mb-2" />
            <p className="text-xs text-[var(--gray-11)] text-center">Click to upload</p>
          </>
        )}
      </div>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0];
          if (file) handleFile(file);
        }}
      />
    </div>
  );
}

export default function BrandingManager() {
  const toast = useToast();

  const [slug, setSlug] = useState('');
  const [name, setName] = useState('');
  const [domains, setDomains] = useState('');
  const [logo, setLogo] = useState<FilePreview>(emptyPreview());
  const [logoDark, setLogoDark] = useState<FilePreview>(emptyPreview());
  const [background, setBackground] = useState<FilePreview>(emptyPreview());
  const [backgroundDark, setBackgroundDark] = useState<FilePreview>(emptyPreview());
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [savedSlug, setSavedSlug] = useState<string | null>(null);

  const loadExisting = async () => {
    if (!slug.trim()) {
      toast.error({ description: 'Enter a slug to load' });
      return;
    }
    setIsLoading(true);
    try {
      const res = await fetch(`${DNS_BASE}/company-config/${encodeURIComponent(slug.trim())}`, {
        headers: { 'x-api-key': API_CONFIG.DNS_API_KEY },
      });
      if (!res.ok) {
        toast.error({ description: 'Company not found' });
        return;
      }
      const data = await res.json();
      if (data.success && data.data) {
        const c = data.data;
        setName(c.name || '');
        setDomains(Array.isArray(c.domains) ? c.domains.join(', ') : '');

        // Only fetch images that are actually listed in the config metadata
        const assets = c.assets || {};
        const fetchPromises = [];

        if (assets.logo) {
          fetchPromises.push(
            BgImageService.getLogoImageUrlBySlug(slug.trim(), 'light').then((url) => {
              if (url) setLogo({ file: null, previewUrl: url });
            })
          );
        }
        if (assets.logoDark) {
          fetchPromises.push(
            BgImageService.getLogoImageUrlBySlug(slug.trim(), 'dark').then((url) => {
              if (url) setLogoDark({ file: null, previewUrl: url });
            })
          );
        }
        if (assets.background) {
          fetchPromises.push(
            BgImageService.getBgImageUrlBySlug(slug.trim(), 'light').then((url) => {
              if (url) setBackground({ file: null, previewUrl: url });
            })
          );
        }
        if (assets.backgroundDark) {
          fetchPromises.push(
            BgImageService.getBgImageUrlBySlug(slug.trim(), 'dark').then((url) => {
              if (url) setBackgroundDark({ file: null, previewUrl: url });
            })
          );
        }

        if (fetchPromises.length > 0) {
          await Promise.all(fetchPromises);
        }

        toast.success({ description: 'Config loaded — existing assets shown' });
      }
    } catch {
      toast.error({ description: 'Failed to load config' });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!slug.trim()) {
      toast.error({ description: 'Slug is required' });
      return;
    }

    setIsSaving(true);
    try {
      const form = new FormData();
      form.append('slug', slug.trim());
      if (name.trim()) form.append('name', name.trim());
      if (domains.trim()) form.append('domains', domains.trim());
      if (logo.file) form.append('logo', logo.file);
      if (logoDark.file) form.append('logoDark', logoDark.file);
      if (background.file) form.append('background', background.file);
      if (backgroundDark.file) form.append('backgroundDark', backgroundDark.file);

      const res = await fetch(`${DNS_BASE}/update-company`, {
        method: 'POST',
        headers: { 'x-api-key': API_CONFIG.DNS_API_KEY },
        body: form,
      });

      const data = await res.json();
      if (res.ok && data.success) {
        toast.success({ description: `Branding for "${slug.trim()}" saved successfully` });
        setSavedSlug(slug.trim());
      } else {
        toast.error({ description: data.message || 'Save failed' });
      }
    } catch {
      toast.error({ description: 'Failed to save branding' });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Identity */}
      <div className="bg-[var(--gray-2)] rounded-xl border border-[var(--gray-4)] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[var(--gray-12)] uppercase tracking-wide">
          Company Identity
        </h2>

        {/* Slug row */}
        <div className="flex gap-3">
          <div className="flex-1 space-y-1.5">
            <label className="block text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wide">
              Slug <span className="text-[var(--red-9)]">*</span>
            </label>
            <input
              value={slug}
              onChange={(e) => {
                setSlug(e.target.value);
                setSavedSlug(null);
              }}
              placeholder="yukthi"
              className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--gray-5)] bg-[var(--gray-1)] focus:outline-none focus:border-[var(--accent-9)] focus:ring-2 focus:ring-[var(--accent-8)] font-mono transition-all"
            />
            <p className="text-[11px] text-[var(--gray-10)]">
              Login URL: <span className="font-mono">/{slug || 'slug'}</span>
            </p>
          </div>
          <div className="pt-7">
            <button
              type="button"
              onClick={loadExisting}
              disabled={isLoading || !slug.trim()}
              className="flex items-center gap-2 px-4 py-2 text-sm font-medium text-[var(--gray-11)] bg-[var(--gray-3)] hover:bg-[var(--gray-4)] border border-[var(--gray-5)] rounded-lg transition-all disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <FiSearch className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
              {isLoading ? 'Loading...' : 'Load Existing'}
            </button>
          </div>
        </div>

        {/* Name */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wide">
            Display Name (Optional)
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Yukthi Systems"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--gray-5)] bg-[var(--gray-1)] focus:outline-none focus:border-[var(--accent-9)] focus:ring-2 focus:ring-[var(--accent-8)] transition-all"
          />
        </div>

        {/* Domains */}
        <div className="space-y-1.5">
          <label className="block text-xs font-semibold text-[var(--gray-11)] uppercase tracking-wide">
            Allowed Domains
          </label>
          <input
            value={domains}
            onChange={(e) => setDomains(e.target.value)}
            placeholder="yukthi.com, example.com  (leave empty to allow all)"
            className="w-full px-3 py-2 text-sm rounded-lg border border-[var(--gray-5)] bg-[var(--gray-1)] focus:outline-none focus:border-[var(--accent-9)] focus:ring-2 focus:ring-[var(--accent-8)] transition-all"
          />
          <p className="text-[11px] text-[var(--gray-10)]">
            Comma-separated. Empty = any email can log in via this company page.
          </p>
        </div>
      </div>

      {/* Assets */}
      <div className="bg-[var(--gray-2)] rounded-xl border border-[var(--gray-4)] p-6 space-y-4">
        <h2 className="text-sm font-bold text-[var(--gray-12)] uppercase tracking-wide">
          Brand Assets
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <ImageUpload label="Logo (Light)" value={logo} onChange={setLogo} />
          <ImageUpload label="Logo (Dark)" value={logoDark} onChange={setLogoDark} />
          <ImageUpload label="Background (Light)" value={background} onChange={setBackground} />
          <ImageUpload
            label="Background (Dark)"
            value={backgroundDark}
            onChange={setBackgroundDark}
          />
        </div>
        <p className="text-[11px] text-[var(--gray-10)]">
          Only uploaded files will be replaced. Leave empty to keep existing assets.
        </p>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-3 flex-wrap">
        <button
          type="button"
          onClick={handleSave}
          disabled={isSaving || !slug.trim()}
          className="flex items-center gap-2 px-6 py-2.5 text-sm font-semibold text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
        >
          <FiSave className={`w-4 h-4 ${isSaving ? 'animate-pulse' : ''}`} />
          {isSaving ? 'Saving...' : 'Save Branding'}
        </button>

        {savedSlug && (
          <a
            href={`/${savedSlug}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[var(--accent-11)] bg-[var(--accent-3)] hover:bg-[var(--accent-4)] rounded-lg transition-all border border-[var(--accent-6)]"
          >
            <FiEye className="w-4 h-4" />
            Preview /{savedSlug}
          </a>
        )}
      </div>
    </div>
  );
}
