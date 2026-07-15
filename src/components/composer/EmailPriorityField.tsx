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

import { Box, Button, DropdownMenu } from '@radix-ui/themes';
import { FaFlag, FaArrowUp, FaArrowDown } from 'react-icons/fa6';
import DropdownWrapper from '../common/DropdownWrapper';
import type { EmailPriority } from '.';

type EmailPriorityFieldProps = {
  priority: EmailPriority;
  onChange: (priority: EmailPriority) => void;
};

const EmailPriorityField = ({ priority, onChange }: EmailPriorityFieldProps) => {
  const priorityConfig: Record<EmailPriority, { label: string; icon: React.ComponentType<any> }> = {
    normal: {
      label: 'Normal Priority',
      icon: FaFlag,
    },
    high: {
      label: 'High Priority',
      icon: FaArrowUp,
    },
    low: {
      label: 'Low Priority',
      icon: FaArrowDown,
    },
  };

  const dropdownItems = (['normal', 'high', 'low'] as EmailPriority[]).map((value) => ({
    key: value,
    label: priorityConfig[value].label,
    icon: priorityConfig[value].icon,
    selected: value === priority,
    onSelect: () => onChange(value),
  }));

  const currentConfig = priorityConfig[priority];

  const trigger = (
    <Button variant="soft" className="min-w-[160px] justify-between">
      <div className="flex items-center gap-2">
        <currentConfig.icon size={14} />
        <span className="truncate">{currentConfig.label}</span>
      </div>
      <DropdownMenu.TriggerIcon />
    </Button>
  );

  return (
    <Box>
      <DropdownWrapper items={dropdownItems} trigger={trigger} className="email-priority-field" />
    </Box>
  );
};

export default EmailPriorityField;
