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

import { QUERY_RETRY } from '../api/retryPolicy';
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useAtomValue } from 'jotai';
import { apiKeyAtom } from '../state/auth';
import {
  getDomainList,
  getDomain,
  createDomain,
  updateDomain,
  deleteDomain,
  getConfigList,
  createConfig,
  updateConfig,
  deleteConfig,
  type MailServerConfig,
  type MailServerConfigData,
  type Domain,
  type CreateDomainData,
  type UpdateDomainData,
  type DomainListResponse,
} from '../api/admin-domain';
import { useToast } from './useToast';

export function useListDomains(page = 1, size = 20, query?: string) {
  const apiKey = useAtomValue(apiKeyAtom);
  return useQuery<DomainListResponse, Error>({
    queryKey: ['domains', page, size, query, apiKey],
    queryFn: () => getDomainList(page, size, query),
    placeholderData: keepPreviousData,
    staleTime: 5 * 60 * 1000,
    gcTime: 10 * 60 * 1000,
    ...QUERY_RETRY,
  });
}

export function useGetDomain(domain?: string) {
  // getDomain()'s declared return type (Domain) doesn't match its actual response
  // shape ({ data: Domain }) — pre-existing API-layer mismatch, preserved via cast.
  return useQuery<{ data: Domain }, Error>({
    queryKey: ['domain', domain],
    queryFn: () => {
      if (!domain) throw new Error('Domain name is required');
      return getDomain(domain) as unknown as Promise<{ data: Domain }>;
    },
    enabled: !!domain,
    staleTime: 5 * 60 * 1000,
  });
}

export function useCreateDomain() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<Domain, Error, CreateDomainData>({
    mutationFn: (data: CreateDomainData) => createDomain(data),
    onSuccess: () => {
      toast.success({ description: 'Domain created successfully' });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
    },
    onError: (error: Error) => {
      toast.error({ description: error.message || 'Failed to create domain' });
    },
  });
}

export function useUpdateDomain() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<Domain, Error, { domain: string; data: UpdateDomainData }>({
    mutationFn: ({ domain, data }) => updateDomain(domain, data),
    onSuccess: () => {
      toast.success({ description: 'Domain updated successfully' });
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domain'] });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
    },
    onError: (error: Error) => {
      toast.error({ description: error.message || 'Failed to update domain' });
    },
  });
}

export function useDeleteDomain() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<void, Error, string>({
    mutationFn: (domain: string) => deleteDomain(domain),
    onSuccess: (_data, domain) => {
      toast.success({ description: 'Domain deleted successfully' });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
      // Update all cached domain list pages — remove the deleted entry and decrement count
      queryClient.setQueriesData<DomainListResponse>({ queryKey: ['domains'] }, (old) => {
        if (!old?.data) return old;
        return {
          ...old,
          data: old.data.filter((d: Domain) => d.domain !== domain),
          total_count: Math.max(0, (old.total_count ?? 1) - 1),
        };
      });
    },
    onError: (error: Error) => {
      toast.error({ description: error.message || 'Failed to delete domain' });
    },
  });
}

export function useListConfigs() {
  const apiKey = useAtomValue(apiKeyAtom);
  return useQuery<MailServerConfig[], Error>({
    queryKey: ['mailServerConfigs', apiKey],
    queryFn: getConfigList,
    enabled: !!apiKey,
    staleTime: 60 * 1000,
    ...QUERY_RETRY,
  });
}

export function useCreateConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<MailServerConfig, Error, MailServerConfigData>({
    mutationFn: createConfig,
    onSuccess: (config) => {
      toast.success({ description: `Configuration "${config.config_name}" created` });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
    },
    onError: (error) => {
      toast.error({ description: error.message || 'Failed to create configuration' });
    },
  });
}

export function useUpdateConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<
    MailServerConfig,
    Error,
    { configId: number; data: Partial<MailServerConfigData> }
  >({
    mutationFn: ({ configId, data }) => updateConfig(configId, data),
    onSuccess: (config) => {
      toast.success({ description: `Configuration "${config.config_name}" updated` });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
      // Its domains show its name and servers
      queryClient.invalidateQueries({ queryKey: ['domains'] });
      queryClient.invalidateQueries({ queryKey: ['domain'] });
    },
    onError: (error) => {
      toast.error({ description: error.message || 'Failed to update configuration' });
    },
  });
}

export function useDeleteConfig() {
  const queryClient = useQueryClient();
  const toast = useToast();

  return useMutation<void, Error, number>({
    mutationFn: deleteConfig,
    onSuccess: () => {
      toast.success({ description: 'Configuration deleted' });
      queryClient.invalidateQueries({ queryKey: ['mailServerConfigs'] });
    },
    onError: (error) => {
      toast.error({ description: error.message || 'Failed to delete configuration' });
    },
  });
}
