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

// src/hooks/useBIMI.ts
import { useState, useEffect } from 'react';
import { BIMIService } from '../utils/bimiService';

interface UseBIMIResult {
  logoUrl: string | null;
  loading: boolean;
  error: string | null;
}

export const useBIMI = (email: string): UseBIMIResult => {
  const [logoUrl, setLogoUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!email) {
      setLogoUrl(null);
      setLoading(false);
      setError(null);
      return;
    }

    const fetchBIMI = async () => {
      setLoading(true);
      setError(null);

      try {
        const logo = await BIMIService.getBIMILogo(email);
        setLogoUrl(logo);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to fetch BIMI record');
        setLogoUrl(null);
      } finally {
        setLoading(false);
      }
    };

    fetchBIMI();
  }, [email]);

  return { logoUrl, loading, error };
};
