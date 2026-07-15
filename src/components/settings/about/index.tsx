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

import { Flex, Heading, Text, Badge } from '@radix-ui/themes';
import { FaEnvelope } from 'react-icons/fa';
import { API_CONFIG } from '../../../constants/config';

const About = () => {
  return (
    <div className="h-full w-full flex flex-col items-center justify-center p-6 bg-[var(--gray-1)] animate-in fade-in duration-500">
      <Flex direction="column" align="center" gap="5" className="max-w-md text-center">
        {/* Minimal Icon Identity */}
        <div className="p-4 bg-[var(--accent-3)] rounded-2xl text-[var(--accent-9)] shadow-sm">
          <FaEnvelope size={32} />
        </div>

        {/* Title & Version */}
        <div className="space-y-2 mt-2">
          <Heading size="7" className="text-[var(--gray-12)] tracking-tight font-bold">
            Mail Service 25
          </Heading>

          <Badge variant="surface" color="gray" radius="full" size="2" className="px-3">
            v{API_CONFIG.version}
          </Badge>
        </div>

        {/* Brief Description */}
        <Text size="3" className="text-[var(--gray-11)] leading-relaxed">
          A next-generation email experience designed for speed, security, and simplicity.
        </Text>
      </Flex>
    </div>
  );
};

export default About;
