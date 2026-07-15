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

// import { Box, Select } from '@radix-ui/themes';
// import type { ReactNode } from '@tanstack/react-router';

// interface SelectOption {
//   value: string;
//   label: string;
//   icon?: ReactNode;
// }

// interface SelectWrapperProps {
//   value: string;
//   onValueChange: (value: string) => void;
//   options: SelectOption[];
//   label?: string;
//   placeholder?: string;
//   size?: '1' | '2' | '3';
//   variant?: 'surface' | 'classic' | 'soft' | 'ghost';
// }

// const SelectWrapper = ({
//   value,
//   onValueChange,
//   options,
//   label,
//   placeholder,
//   size = '2',
//   variant = 'surface',
// }: SelectWrapperProps) => {
//   const selectedOption = options.find(option => option.value === value);
//   const displayText = selectedOption ? selectedOption.label : (placeholder || 'Select');

//   return (
//     <Box pt="2">
//       <Select.Root value={value} onValueChange={onValueChange} size={size}>
//         <Select.Trigger variant={variant}>
//           {label && `${label}: `}{displayText}
//         </Select.Trigger>
//         <Select.Content>
//           {options.map((option) => (
//             <Select.Item key={option.value} value={option.value}>
//               {option.icon && option.icon} {option.label}
//             </Select.Item>
//           ))}
//         </Select.Content>
//       </Select.Root>
//     </Box>
//   );
// };

// export default SelectWrapper;
