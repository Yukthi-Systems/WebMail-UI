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

import { useMutation } from '@tanstack/react-query';
import { draftMail, sendMailV2, type ComposerRequest } from '../api/composer';

export function useSendMail() {
  return useMutation<void, Error, ComposerRequest>({
    mutationKey: ['send_mail'],
    mutationFn: (payLoad) => sendMailV2(payLoad),
  });
}

export function useDraftMail() {
  return useMutation<void, Error, ComposerRequest>({
    mutationKey: ['draft_mail'],
    mutationFn: (payLoad) => draftMail(payLoad),
  });
}
