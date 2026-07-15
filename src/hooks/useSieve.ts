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

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  listScripts,
  createScript,
  deleteScript,
  enableScript,
  renameScript,
  getScriptRaw,
  listFilters,
  createFilter,
  getFilter,
  updateFilter,
  deleteFilter,
  disableFilter,
  enableFilter,
} from '../api/sieve';
import type { SieveFilters, SieveApiResponse } from '../api/sieve';

const SIEVE_RETRY_DELAY = () => 500;

// Script Hooks
export function useScripts() {
  return useQuery({
    queryKey: ['sieve_scripts'],
    queryFn: () => listScripts(),
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 5,
    retryDelay: SIEVE_RETRY_DELAY,
    refetchOnWindowFocus: false,
  });
}

export function useScriptRaw(scriptName: string, enabled = true) {
  return useQuery({
    queryKey: ['sieve_script_raw', scriptName],
    queryFn: () => getScriptRaw(scriptName),
    enabled: enabled && !!scriptName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 5,
    retryDelay: SIEVE_RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useCreateScript() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { scriptName: string; scriptContent: string }>({
    mutationKey: ['create_script'],
    mutationFn: ({ scriptName, scriptContent }) => createScript(scriptName, scriptContent),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sieve_scripts'] });
    },
  });
}

export function useDeleteScript() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, string>({
    mutationKey: ['delete_script'],
    mutationFn: (scriptName: string) => deleteScript(scriptName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sieve_scripts'] });
    },
  });
}

export function useEnableScript() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, string>({
    mutationKey: ['enable_script'],
    mutationFn: (scriptName: string) => enableScript(scriptName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sieve_scripts'] });
    },
  });
}

export function useRenameScript() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { oldScriptName: string; newScriptName: string }>({
    mutationKey: ['rename_script'],
    mutationFn: ({ oldScriptName, newScriptName }) => renameScript(oldScriptName, newScriptName),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['sieve_scripts'] });
    },
  });
}

// Filter Hooks
export function useFilters(scriptName: string, enabled = true) {
  return useQuery({
    queryKey: ['sieve_filters', scriptName],
    queryFn: () => listFilters(scriptName),
    enabled: enabled && !!scriptName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 5,
    retryDelay: SIEVE_RETRY_DELAY,
    refetchOnWindowFocus: false,
  });
}

export function useFilter(scriptName: string, filterName: string, enabled = true) {
  return useQuery({
    queryKey: ['sieve_filter', scriptName, filterName],
    queryFn: () => getFilter(scriptName, filterName),
    enabled: enabled && !!scriptName && !!filterName,
    staleTime: 5 * 60 * 1000,
    gcTime: 15 * 60 * 1000,
    retry: 5,
    retryDelay: SIEVE_RETRY_DELAY,
    refetchOnWindowFocus: false,
    refetchOnMount: false,
  });
}

export function useCreateFilter() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { scriptName: string; filter: SieveFilters }>({
    mutationKey: ['create_filter'],
    mutationFn: ({ scriptName, filter }) => createFilter(scriptName, filter),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sieve_filters', variables.scriptName] });
    },
  });
}

export function useUpdateFilter() {
  const queryClient = useQueryClient();

  return useMutation<
    SieveApiResponse,
    Error,
    { scriptName: string; filterName: string; filter: SieveFilters }
  >({
    mutationKey: ['update_filter'],
    mutationFn: ({ scriptName, filterName, filter }) =>
      updateFilter(scriptName, filterName, filter),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sieve_filters', variables.scriptName] });
      queryClient.invalidateQueries({
        queryKey: ['sieve_filter', variables.scriptName, variables.filterName],
      });
    },
  });
}

export function useDeleteFilter() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { scriptName: string; filterName: string }>({
    mutationKey: ['delete_filter'],
    mutationFn: ({ scriptName, filterName }) => deleteFilter(scriptName, filterName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sieve_filters', variables.scriptName] });
    },
  });
}

export function useDisableFilter() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { scriptName: string; filterName: string }>({
    mutationKey: ['disable_filter'],
    mutationFn: ({ scriptName, filterName }) => disableFilter(scriptName, filterName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sieve_filters', variables.scriptName] });
      queryClient.invalidateQueries({
        queryKey: ['sieve_filter', variables.scriptName, variables.filterName],
      });
    },
  });
}

export function useEnableFilter() {
  const queryClient = useQueryClient();

  return useMutation<SieveApiResponse, Error, { scriptName: string; filterName: string }>({
    mutationKey: ['enable_filter'],
    mutationFn: ({ scriptName, filterName }) => enableFilter(scriptName, filterName),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['sieve_filters', variables.scriptName] });
      queryClient.invalidateQueries({
        queryKey: ['sieve_filter', variables.scriptName, variables.filterName],
      });
    },
  });
}
