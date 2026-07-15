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

import { createFileRoute, redirect, useNavigate } from '@tanstack/react-router';
import { useEffect, useRef } from 'react';
import { useAtomValue } from 'jotai';
import { webmailStore } from '../store';
import { csrfTokenAtom } from '../state/auth';
import { userSettingsAtom } from '../state/settings';
import { companyBrandingAtom } from '../state/branding';
import { CompanyService, BgImageService } from '../utils/bimiService';
import Login from '../components/login/Login';
import Layout from '../components/common/Layout';

export const Route = createFileRoute('/$slug')({
  beforeLoad: async ({ params }) => {
    // Optimization: Check if we already have the config for this slug in the store
    const current = webmailStore.get(companyBrandingAtom);
    if (current?.slug === params.slug) return;

    const company = await CompanyService.getCompanyConfig(params.slug);
    if (!company) {
      throw redirect({ to: '/login' });
    }
    webmailStore.set(companyBrandingAtom, company);
  },
  loader: async ({ params }) => {
    const company = webmailStore.get(companyBrandingAtom);
    const [logoUrl, bgUrl] = await Promise.all([
      BgImageService.getLogoImageUrlBySlug(params.slug),
      BgImageService.getBgImageUrlBySlug(params.slug),
    ]);
    return { logoUrl, bgUrl, company };
  },
  component: CompanyRoot,
});

function CompanyRoot() {
  const { slug } = Route.useParams();
  const { logoUrl, bgUrl, company } = Route.useLoaderData();
  const csrfToken = useAtomValue(csrfTokenAtom);
  const navigate = useNavigate();

  // Track previous auth state to detect login/logout transitions
  const prevCsrfRef = useRef(csrfToken);

  useEffect(() => {
    const wasAuthed = !!prevCsrfRef.current;
    const isAuthed = !!csrfToken;
    prevCsrfRef.current = csrfToken;

    if (!wasAuthed && isAuthed) {
      // Just logged in — navigate to default folder under company prefix
      const settings = webmailStore.get(userSettingsAtom);
      const defaultFolder = settings?.email?.default_view || 'INBOX';
      navigate({ to: '/$slug/folder/$folder', params: { slug, folder: defaultFolder } });
    } else if (wasAuthed && !isAuthed) {
      // Just logged out — return to branded login at the same company URL
      navigate({ to: '/$slug', params: { slug }, replace: true });
    }
  }, [csrfToken]);

  if (!csrfToken) {
    return (
      <Login
        branding={{
          logoUrl,
          bgUrl,
          companyName: company?.name,
          allowedDomains: company?.domains ?? [],
        }}
      />
    );
  }

  return <Layout />;
}
