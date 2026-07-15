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

import { useMutation, useQuery } from '@tanstack/react-query';
import {
  getACL,
  setACL,
  deleteACL,
  getOwnACL,
  type ACLResponse,
  type SetACLPayload,
  type DeleteACLPayload,
  type ACLOwnResponse,
} from '../api/acl';

// Get ACL for a folder
export function useGetACL(folder_path: string, enabled: boolean = true) {
  return useQuery<ACLResponse, Error>({
    queryKey: ['acl', folder_path],
    queryFn: () => getACL(folder_path),
    enabled: enabled && !!folder_path,
  });
}

// Get own ACL for a folder
export function useGetOwnACL(folder_path: string, enabled: boolean = true) {
  return useQuery<ACLOwnResponse, Error>({
    queryKey: ['acl', 'own', folder_path],
    queryFn: () => getOwnACL(folder_path),
    enabled: enabled && !!folder_path,
  });
}

// Set ACL for a folder
export function useSetACL() {
  return useMutation<ACLResponse, Error, SetACLPayload>({
    mutationKey: ['set_acl'],
    mutationFn: setACL,
  });
}

// Delete ACL for a folder
export function useDeleteACL() {
  return useMutation<ACLResponse, Error, DeleteACLPayload>({
    mutationKey: ['delete_acl'],
    mutationFn: deleteACL,
  });
}
