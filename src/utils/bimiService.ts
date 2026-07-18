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

import { API_CONFIG } from '../constants/config';

export interface BIMIRecord {
  logo?: string;
  version?: string;
  exists: boolean;
  domain?: string;
  record?: string;
}

export interface BIMIApiResponse {
  success: boolean;
  data: {
    exists: boolean;
    domain: string;
    version?: string;
    logo?: string;
    record?: string;
  };
  timestamp: number;
}

export class BIMIService {
  private static cache = new Map<string, BIMIRecord>();
  private static readonly API_BASE_URL = `${API_CONFIG.DNS_API_URL}/api/dns/bimi`;

  static extractDomain(email: string): string {
    if (!email || typeof email !== 'string') {
      return '';
    }

    email = email.trim();

    const angleBracketMatch = email.match(/<([^>]+)>/);
    if (angleBracketMatch) {
      email = angleBracketMatch[1].trim();
    }
    email = email.replace(/['"]/g, '');
    const parts = email.split('@');
    if (parts.length !== 2) {
      return '';
    }

    let domain = parts[1].toLowerCase().trim();

    domain = domain.replace(/^[^a-z0-9]+|[^a-z0-9]+$/gi, '');
    const domainRegex =
      /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?(\.[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?)*$/i;
    if (!domainRegex.test(domain)) {
      return '';
    }

    return domain;
  }

  private static pendingRequests = new Map<string, Promise<BIMIRecord>>();

  static async queryBIMI(domain: string): Promise<BIMIRecord> {
    // Validate and clean domain before querying
    domain = domain.toLowerCase().trim();

    if (!domain) {
      return { exists: false };
    }

    if (this.cache.has(domain)) {
      return this.cache.get(domain)!;
    }

    if (this.pendingRequests.has(domain)) {
      return this.pendingRequests.get(domain)!;
    }

    const requestPromise = this.fetchBIMIRecord(domain);
    this.pendingRequests.set(domain, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(domain, result);
      return result;
    } finally {
      this.pendingRequests.delete(domain);
    }
  }

  private static async fetchBIMIRecord(domain: string): Promise<BIMIRecord> {
    try {
      const response = await fetch(`${this.API_BASE_URL}?domain=${encodeURIComponent(domain)}`, {
        headers: {
          'x-api-key': API_CONFIG.DNS_API_KEY,
        },
      });

      if (!response.ok) {
        throw new Error(`BIMI API request failed: ${response.status}`);
      }

      const apiResponse: BIMIApiResponse = await response.json();

      if (apiResponse.success && apiResponse.data) {
        return {
          exists: apiResponse.data.exists,
          domain: apiResponse.data.domain,
          version: apiResponse.data.version,
          logo: apiResponse.data.logo,
          record: apiResponse.data.record,
        };
      } else {
        throw new Error('API returned unsuccessful response');
      }
    } catch (error) {
      console.error(`BIMI query failed for ${domain}:`, error);
      return { exists: false };
    }
  }

  static async getBIMILogo(email: string): Promise<string | null> {
    const domain = this.extractDomain(email);
    if (!domain) return null;

    try {
      const record = await this.queryBIMI(domain);
      return record.exists && record.logo ? record.logo : null;
    } catch (error) {
      console.error(`Failed to get BIMI logo for ${domain}:`, error);
      return null;
    }
  }

  static clearCache(domain?: string): void {
    if (domain) {
      this.cache.delete(domain);
    } else {
      this.cache.clear();
    }
  }

  static getCacheSize(): number {
    return this.cache.size;
  }
}

// Both endpoints return the image file directly (binary) — fetch as blob and cache as object URL
export class BgImageService {
  private static readonly BASE_URL = `${API_CONFIG.DNS_API_URL}/api/dns`;

  // cache key: `${endpoint}:${domain}:${mode}` -> blob object URL (or null)
  private static cache = new Map<string, string | null>();
  private static pendingRequests = new Map<string, Promise<string | null>>();

  static async getBgImageUrl(
    domain: string,
    mode: 'dark' | 'light' = 'light'
  ): Promise<string | null> {
    return this.fetchCached('bg-image', domain, mode);
  }

  static async getLogoImageUrl(
    domain: string,
    mode: 'dark' | 'light' = 'light'
  ): Promise<string | null> {
    return this.fetchCached('logo-image', domain, mode);
  }

  private static async fetchCached(
    endpoint: string,
    domain: string,
    mode: string
  ): Promise<string | null> {
    domain = domain.toLowerCase().trim();
    if (!domain) return null;

    const cacheKey = `${endpoint}:${domain}:${mode}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;
    if (this.pendingRequests.has(cacheKey)) return this.pendingRequests.get(cacheKey)!;

    const requestPromise = this.fetchBlobUrl(endpoint, domain, mode);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private static async fetchBlobUrl(
    endpoint: string,
    domain: string,
    mode: string
  ): Promise<string | null> {
    try {
      const response = await fetch(
        `${this.BASE_URL}/${endpoint}?domain=${encodeURIComponent(domain)}&mode=${mode}`,
        { headers: { 'x-api-key': API_CONFIG.DNS_API_KEY } }
      );
      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) return null;

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`${endpoint} query failed for ${domain}:`, error);
      return null;
    }
  }

  static async getBgImageUrlBySlug(
    slug: string,
    mode: 'dark' | 'light' = 'light'
  ): Promise<string | null> {
    return this.fetchCachedBySlug('bg-image', slug, mode);
  }

  static async getLogoImageUrlBySlug(
    slug: string,
    mode: 'dark' | 'light' = 'light'
  ): Promise<string | null> {
    return this.fetchCachedBySlug('logo-image', slug, mode);
  }

  private static async fetchCachedBySlug(
    endpoint: string,
    slug: string,
    mode: string
  ): Promise<string | null> {
    slug = slug.toLowerCase().trim();
    if (!slug) return null;

    const cacheKey = `${endpoint}:slug:${slug}:${mode}`;
    if (this.cache.has(cacheKey)) return this.cache.get(cacheKey)!;
    if (this.pendingRequests.has(cacheKey)) return this.pendingRequests.get(cacheKey)!;

    const requestPromise = this.fetchBlobUrlBySlug(endpoint, slug, mode);
    this.pendingRequests.set(cacheKey, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(cacheKey, result);
      return result;
    } finally {
      this.pendingRequests.delete(cacheKey);
    }
  }

  private static async fetchBlobUrlBySlug(
    endpoint: string,
    slug: string,
    mode: string
  ): Promise<string | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/${endpoint}/${slug}?mode=${mode}`, {
        headers: { 'x-api-key': API_CONFIG.DNS_API_KEY },
      });
      if (!response.ok) return null;

      const blob = await response.blob();
      if (!blob.type.startsWith('image/')) return null;

      return URL.createObjectURL(blob);
    } catch (error) {
      console.error(`${endpoint} slug query failed for ${slug}:`, error);
      return null;
    }
  }

  static clearCache(): void {
    this.cache.forEach((url) => {
      if (url) URL.revokeObjectURL(url);
    });
    this.cache.clear();
  }
}

export interface CompanyApiConfig {
  slug: string;
  name: string;
  domains: string[];
  assets: {
    logo?: string;
    background?: string;
    logoDark?: string;
    backgroundDark?: string;
  };
  theme?: Record<string, unknown>;
}

export class CompanyService {
  private static readonly BASE_URL = `${API_CONFIG.DNS_API_URL}/api/dns`;
  private static cache = new Map<string, CompanyApiConfig | null>();
  private static pendingRequests = new Map<string, Promise<CompanyApiConfig | null>>();

  static async getCompanyConfig(slug: string): Promise<CompanyApiConfig | null> {
    slug = slug.toLowerCase().trim();
    if (!slug) return null;

    if (this.cache.has(slug)) return this.cache.get(slug)!;
    if (this.pendingRequests.has(slug)) return this.pendingRequests.get(slug)!;

    const requestPromise = this.fetchCompanyConfig(slug);
    this.pendingRequests.set(slug, requestPromise);

    try {
      const result = await requestPromise;
      this.cache.set(slug, result);
      return result;
    } finally {
      this.pendingRequests.delete(slug);
    }
  }

  private static async fetchCompanyConfig(slug: string): Promise<CompanyApiConfig | null> {
    try {
      const response = await fetch(`${this.BASE_URL}/company-config/${encodeURIComponent(slug)}`, {
        headers: { 'x-api-key': API_CONFIG.DNS_API_KEY },
      });
      if (!response.ok) return null;
      const data = await response.json();
      if (!data.success) return null;
      return data.data as CompanyApiConfig;
    } catch {
      return null;
    }
  }

  static clearCache(): void {
    this.cache.clear();
  }
}
