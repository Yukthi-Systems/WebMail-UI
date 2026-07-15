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

import { Box, Flex, Text, Progress } from '@radix-ui/themes';
import { FiCode, FiCpu, FiDatabase, FiCheckCircle } from 'react-icons/fi';

interface EmailParsingStateProps {
  currentStep?: number;
  totalSteps?: number;
  message?: string;
}

const EmailParsingState = ({
  currentStep = 0,
  totalSteps = 4,
  message = 'Parsing email content...',
}: EmailParsingStateProps) => {
  const steps = [
    { icon: <FiDatabase />, label: 'Extracting data' },
    { icon: <FiCode />, label: 'Processing content' },
    { icon: <FiCpu />, label: 'Analyzing structure' },
    { icon: <FiCheckCircle />, label: 'Finalizing' },
  ];

  const progress = totalSteps > 0 ? (currentStep / totalSteps) * 100 : 0;

  return (
    <Box
      p="6"
      style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        minHeight: '200px',
      }}
    >
      <Flex direction="column" align="center" gap="4" style={{ width: '100%', maxWidth: '400px' }}>
        <Box style={{ position: 'relative', marginBottom: 'var(--space-2)' }}>
          <FiCode
            size={32}
            color="var(--accent-9)"
            style={{
              opacity: 0.9,
              animation: 'pulse 2s infinite',
            }}
          />
        </Box>

        <Text size="3" weight="medium" color="gray" style={{ textAlign: 'center' }}>
          {message}
        </Text>

        {/* Progress bar */}
        <Box style={{ width: '100%', margin: 'var(--space-3) 0' }}>
          <Progress value={progress} style={{ width: '100%', height: '6px' }} />
          <Flex justify="between" mt="1">
            <Text size="1" color="gray">
              {Math.round(progress)}% complete
            </Text>
            <Text size="1" color="gray">
              Step {currentStep} of {totalSteps}
            </Text>
          </Flex>
        </Box>

        {/* Step indicators */}
        <Flex gap="4" style={{ width: '100%', justifyContent: 'space-between' }}>
          {steps.slice(0, totalSteps).map((step, index) => (
            <Box key={index} style={{ textAlign: 'center', flex: 1 }}>
              <Box
                style={{
                  color: index < currentStep ? 'var(--accent-9)' : 'var(--gray-8)',
                  fontSize: '18px',
                  marginBottom: '4px',
                }}
              >
                {step.icon}
              </Box>
              <Text
                size="1"
                color={index < currentStep ? 'blue' : 'gray'}
                style={{
                  display: 'block',
                  fontWeight: index === currentStep ? 'bold' : 'normal',
                }}
              >
                {step.label}
              </Text>
            </Box>
          ))}
        </Flex>
      </Flex>

      <style>
        {`
          @keyframes pulse {
            0% { opacity: 0.7; transform: scale(1); }
            50% { opacity: 1; transform: scale(1.05); }
            100% { opacity: 0.7; transform: scale(1); }
          }
        `}
      </style>
    </Box>
  );
};

export default EmailParsingState;
