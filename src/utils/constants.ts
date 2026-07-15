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

import type { Badge } from '@radix-ui/themes';

export const LOCALES: {
  label: NonNullable<string>;
  value: NonNullable<string>;
}[] = [
  { label: 'English (United States)', value: 'en-US' },
  { label: 'English (United Kingdom)', value: 'en-GB' },
  { label: 'English (India)', value: 'en-IN' },
  { label: 'Spanish (Spain)', value: 'es-ES' },
  { label: 'Spanish (Mexico)', value: 'es-MX' },
  { label: 'French (France)', value: 'fr-FR' },
  { label: 'French (Canada)', value: 'fr-CA' },
  { label: 'German (Germany)', value: 'de-DE' },
  { label: 'Italian (Italy)', value: 'it-IT' },
  { label: 'Portuguese (Brazil)', value: 'pt-BR' },
  { label: 'Portuguese (Portugal)', value: 'pt-PT' },
  { label: 'Russian (Russia)', value: 'ru-RU' },
  { label: 'Japanese (Japan)', value: 'ja-JP' },
  { label: 'Korean (South Korea)', value: 'ko-KR' },
  { label: 'Chinese (Simplified, China)', value: 'zh-CN' },
  { label: 'Chinese (Traditional, Taiwan)', value: 'zh-TW' },
  { label: 'Arabic (Saudi Arabia)', value: 'ar-SA' },
  { label: 'Hindi (India)', value: 'hi-IN' },
  { label: 'Bengali (Bangladesh)', value: 'bn-BD' },
  { label: 'Dutch (Netherlands)', value: 'nl-NL' },
  { label: 'Turkish (Turkey)', value: 'tr-TR' },
  { label: 'Polish (Poland)', value: 'pl-PL' },
  { label: 'Thai (Thailand)', value: 'th-TH' },
  { label: 'Vietnamese (Vietnam)', value: 'vi-VN' },
  { label: 'Swedish (Sweden)', value: 'sv-SE' },
  { label: 'Norwegian (Norway)', value: 'nb-NO' },
  { label: 'Danish (Denmark)', value: 'da-DK' },
  { label: 'Finnish (Finland)', value: 'fi-FI' },
  { label: 'Hebrew (Israel)', value: 'he-IL' },
  { label: 'Ukrainian (Ukraine)', value: 'uk-UA' },
];

export const TIMEZONES: {
  label: NonNullable<string>;
  value: NonNullable<string>;
}[] = [
  { label: '(UTC-12:00) International Date Line West', value: 'Etc/GMT+12' },
  { label: '(UTC-11:00) Coordinated Universal Time-11', value: 'Etc/GMT+11' },
  { label: '(UTC-10:00) Hawaii', value: 'Pacific/Honolulu' },
  { label: '(UTC-09:00) Alaska', value: 'America/Anchorage' },
  {
    label: '(UTC-08:00) Pacific Time (US & Canada)',
    value: 'America/Los_Angeles',
  },
  { label: '(UTC-07:00) Mountain Time (US & Canada)', value: 'America/Denver' },
  { label: '(UTC-06:00) Central Time (US & Canada)', value: 'America/Chicago' },
  {
    label: '(UTC-05:00) Eastern Time (US & Canada)',
    value: 'America/New_York',
  },
  { label: '(UTC-04:00) Atlantic Time (Canada)', value: 'America/Halifax' },
  {
    label: '(UTC-03:00) Buenos Aires',
    value: 'America/Argentina/Buenos_Aires',
  },
  { label: '(UTC-02:00) Coordinated Universal Time-2', value: 'Etc/GMT+2' },
  { label: '(UTC-01:00) Azores', value: 'Atlantic/Azores' },
  { label: '(UTC+00:00) London, Dublin, Lisbon', value: 'Europe/London' },
  { label: '(UTC+01:00) Berlin, Rome, Paris', value: 'Europe/Berlin' },
  { label: '(UTC+02:00) Athens, Cairo, Jerusalem', value: 'Europe/Athens' },
  { label: '(UTC+03:00) Moscow, Nairobi', value: 'Europe/Moscow' },
  { label: '(UTC+03:30) Tehran', value: 'Asia/Tehran' },
  { label: '(UTC+04:00) Abu Dhabi, Baku', value: 'Asia/Dubai' },
  { label: '(UTC+04:30) Kabul', value: 'Asia/Kabul' },
  { label: '(UTC+05:00) Islamabad, Karachi', value: 'Asia/Karachi' },
  { label: '(UTC+05:30) India Standard Time', value: 'Asia/Kolkata' },
  { label: '(UTC+05:45) Kathmandu', value: 'Asia/Kathmandu' },
  { label: '(UTC+06:00) Dhaka', value: 'Asia/Dhaka' },
  { label: '(UTC+06:30) Yangon (Rangoon)', value: 'Asia/Yangon' },
  { label: '(UTC+07:00) Bangkok, Hanoi, Jakarta', value: 'Asia/Bangkok' },
  { label: '(UTC+08:00) Beijing, Singapore, Perth', value: 'Asia/Shanghai' },
  { label: '(UTC+09:00) Tokyo, Seoul', value: 'Asia/Tokyo' },
  { label: '(UTC+09:30) Adelaide, Darwin', value: 'Australia/Adelaide' },
  { label: '(UTC+10:00) Sydney, Guam', value: 'Australia/Sydney' },
  {
    label: '(UTC+11:00) Magadan, Solomon Islands',
    value: 'Pacific/Guadalcanal',
  },
  { label: '(UTC+12:00) Auckland, Wellington', value: 'Pacific/Auckland' },
  { label: "(UTC+13:00) Nuku'alofa", value: 'Pacific/Tongatapu' },
];

// make colour selection constants for below
// Gray, Gold, Bronze, Brown, Yellow, Amber, Orange, Tomato, Red, Ruby, Crimson, Pink, Plum, Purple, Violet, Iris, Indigo, Blue, Cyan, Teal, Jade, Green, Grass, Lime, Mint, Sky
export const COLOR_OPTIONS: {
  value: NonNullable<React.ComponentProps<typeof Badge>['color']>;
  label: string;
}[] = [
  { value: 'gray', label: 'Gray' },
  { value: 'gold', label: 'Gold' },
  { value: 'bronze', label: 'Bronze' },
  { value: 'brown', label: 'Brown' },
  { value: 'yellow', label: 'Yellow' },
  { value: 'amber', label: 'Amber' },
  { value: 'orange', label: 'Orange' },
  { value: 'tomato', label: 'Tomato' },
  { value: 'red', label: 'Red' },
  { value: 'ruby', label: 'Ruby' },
  { value: 'crimson', label: 'Crimson' },
  { value: 'pink', label: 'Pink' },
  { value: 'plum', label: 'Plum' },
  { value: 'purple', label: 'Purple' },
  { value: 'violet', label: 'Violet' },
  { value: 'iris', label: 'Iris' },
  { value: 'indigo', label: 'Indigo' },
  { value: 'blue', label: 'Blue' },
  { value: 'cyan', label: 'Cyan' },
  { value: 'teal', label: 'Teal' },
  { value: 'jade', label: 'Jade' },
  { value: 'green', label: 'Green' },
  { value: 'grass', label: 'Grass' },
  { value: 'lime', label: 'Lime' },
  { value: 'mint', label: 'Mint' },
  { value: 'sky', label: 'Sky' },
];

export const COLOR_MAP: Record<string, string> = {
  gray: '#6B7280',
  gold: '#FFD700',
  bronze: '#CD7F32',
  brown: '#8B4513',
  yellow: '#FACC15',
  amber: '#FFB000',
  orange: '#FB923C',
  tomato: '#FF6347',
  red: '#EF4444',
  ruby: '#E0115F',
  crimson: '#DC143C',
  pink: '#EC4899',
  plum: '#DDA0DD',
  purple: '#A855F7',
  violet: '#8B5CF6',
  iris: '#5D3FD3',
  indigo: '#6366F1',
  blue: '#3B82F6',
  cyan: '#06B6D4',
  teal: '#14B8A6',
  jade: '#00A86B',
  green: '#22C55E',
  grass: '#7CFC00',
  lime: '#84CC16',
  mint: '#98FF98',
  sky: '#38BDF8',
};
