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

import { useState } from 'react';
import { FaXmark, FaChevronRight, FaChevronLeft } from 'react-icons/fa6';
import {
  BsFilter,
  BsFileText,
  BsCheckCircle,
  BsLightning,
  BsEnvelope,
  BsFolder,
  BsFlag,
  BsTrash,
} from 'react-icons/bs';

interface SieveTutorialModalProps {
  isOpen: boolean;
  onComplete: () => void;
  onSkip: () => void;
}

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Sieve Filters',
    content:
      'Sieve filters allow you to automatically organize incoming emails based on rules you define.',
    highlights: ['automatically organize', 'rules you define'],
    examples: [
      { icon: BsFolder, text: 'Move to folders' },
      { icon: BsEnvelope, text: 'Mark as read' },
      { icon: BsFlag, text: 'Flag important' },
      { icon: BsTrash, text: 'Auto-delete' },
    ],
    icon: BsFilter,
    color: 'var(--blue-9)',
    bgColor: 'var(--blue-3)',
  },
  {
    title: 'Filter Sets & Filters',
    content:
      'Filter sets are containers for multiple filters. Create a filter set first, then add filters to it.',
    highlights: ['containers', 'multiple filters'],
    structure: true,
    icon: BsFileText,
    color: 'var(--purple-9)',
    bgColor: 'var(--purple-3)',
  },
  {
    title: 'Creating Rules',
    content: 'Rules define conditions that emails must match.',
    highlights: ['conditions', 'match'],
    ruleExamples: [
      'From contains @company.com',
      'Subject contains "invoice"',
      'Size greater than 5MB',
    ],
    icon: BsCheckCircle,
    color: 'var(--green-9)',
    bgColor: 'var(--green-3)',
  },
  {
    title: 'Actions',
    content: 'Actions determine what happens to matching emails.',
    highlights: ['happens to', 'matching emails'],
    actionFlow: true,
    icon: BsLightning,
    color: 'var(--orange-9)',
    bgColor: 'var(--orange-3)',
  },
];

export const SieveTutorialModal = ({ isOpen, onComplete, onSkip }: SieveTutorialModalProps) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) return null;

  const isLastStep = currentStep === TUTORIAL_STEPS.length - 1;
  const step = TUTORIAL_STEPS[currentStep];
  const StepIcon = step.icon;

  return (
    <div className="fixed inset-0 z-[10000] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="bg-[var(--color-background)] rounded-lg shadow-2xl max-w-2xl w-full animate-in zoom-in-95 duration-300">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[var(--gray-5)]">
          <div className="flex items-center gap-3">
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center animate-pulse"
              style={{ backgroundColor: step.bgColor }}
            >
              <StepIcon size={24} style={{ color: step.color }} />
            </div>
            <h2 className="text-xl font-bold text-[var(--gray-12)]">{step.title}</h2>
          </div>
          <button
            onClick={onSkip}
            className="p-2 text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-md transition-colors"
          >
            <FaXmark />
          </button>
        </div>

        {/* Content with visual elements */}
        <div className="px-8 py-8 min-h-[280px]">
          <div
            key={currentStep}
            className="animate-in fade-in slide-in-from-right-5 duration-300 space-y-6"
          >
            <p className="text-[var(--gray-11)] text-lg leading-relaxed">{step.content}</p>

            {/* Step 0: Visual examples */}
            {step.examples && (
              <div className="grid grid-cols-2 gap-3 mt-6">
                {step.examples.map((example, idx) => {
                  const ExampleIcon = example.icon;
                  return (
                    <div
                      key={idx}
                      className="flex items-center gap-3 p-3 rounded-lg border border-[var(--gray-5)] bg-[var(--gray-2)] hover:border-[var(--blue-6)] transition-all"
                      style={{ animationDelay: `${idx * 100}ms` }}
                    >
                      <ExampleIcon size={20} style={{ color: step.color }} />
                      <span className="text-sm font-medium text-[var(--gray-12)]">
                        {example.text}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}

            {/* Step 1: Structure visualization */}
            {step.structure && (
              <div
                className="mt-6 p-4 rounded-lg border-2 border-dashed"
                style={{ borderColor: step.color }}
              >
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <div className="w-3 h-3 rounded-full" style={{ backgroundColor: step.color }} />
                    <span className="font-semibold text-[var(--gray-12)]">Filter Set (Active)</span>
                  </div>
                  <div className="ml-6 space-y-2">
                    <div className="flex items-center gap-2 text-[var(--gray-11)]">
                      <div className="w-2 h-2 rounded-full bg-[var(--gray-6)]" />
                      Filter 1: Work emails
                    </div>
                    <div className="flex items-center gap-2 text-[var(--gray-11)]">
                      <div className="w-2 h-2 rounded-full bg-[var(--gray-6)]" />
                      Filter 2: Newsletters
                    </div>
                    <div className="flex items-center gap-2 text-[var(--gray-11)]">
                      <div className="w-2 h-2 rounded-full bg-[var(--gray-6)]" />
                      Filter 3: Invoices
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Rule examples */}
            {step.ruleExamples && (
              <div className="mt-6 space-y-2">
                <p className="text-sm font-semibold text-[var(--gray-12)] mb-3">Example Rules:</p>
                {step.ruleExamples.map((rule, idx) => (
                  <div
                    key={idx}
                    className="flex items-center gap-3 p-3 rounded-lg bg-[var(--gray-2)] border-l-3"
                    style={{
                      borderLeftColor: step.color,
                      borderLeftWidth: '3px',
                      animationDelay: `${idx * 100}ms`,
                    }}
                  >
                    <BsCheckCircle size={16} style={{ color: step.color }} />
                    <code className="text-sm text-[var(--gray-12)] font-mono">{rule}</code>
                  </div>
                ))}
              </div>
            )}

            {/* Step 3: Action flow */}
            {step.actionFlow && (
              <div className="mt-6 flex items-center justify-center gap-4">
                <div className="text-center p-4 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
                  <BsEnvelope size={24} className="mx-auto mb-2 text-[var(--gray-11)]" />
                  <span className="text-xs text-[var(--gray-11)]">Email arrives</span>
                </div>
                <FaChevronRight size={20} style={{ color: step.color }} />
                <div
                  className="text-center p-4 rounded-lg border-2"
                  style={{ borderColor: step.color }}
                >
                  <BsLightning size={24} className="mx-auto mb-2" style={{ color: step.color }} />
                  <span className="text-xs font-semibold text-[var(--gray-12)]">Rules match</span>
                </div>
                <FaChevronRight size={20} style={{ color: step.color }} />
                <div className="text-center p-4 rounded-lg bg-[var(--gray-2)] border border-[var(--gray-5)]">
                  <BsFolder size={24} className="mx-auto mb-2 text-[var(--gray-11)]" />
                  <span className="text-xs text-[var(--gray-11)]">Action applied</span>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-[var(--gray-5)]">
          <div className="flex gap-1.5">
            {TUTORIAL_STEPS.map((s, idx) => (
              <div
                key={idx}
                className={`h-2 rounded-full transition-all duration-300 ${
                  idx === currentStep ? 'w-8' : 'w-2'
                }`}
                style={{
                  backgroundColor: idx <= currentStep ? step.color : 'var(--gray-6)',
                }}
              />
            ))}
          </div>

          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={() => setCurrentStep(currentStep - 1)}
                className="px-3 py-2 text-sm text-[var(--gray-11)] hover:bg-[var(--gray-4)] rounded-md flex items-center gap-1.5 transition-colors"
              >
                <FaChevronLeft size={12} /> Back
              </button>
            )}
            <button
              onClick={() => {
                if (isLastStep) {
                  onComplete();
                } else {
                  setCurrentStep(currentStep + 1);
                }
              }}
              className="px-5 py-2 text-sm font-semibold text-white rounded-md flex items-center gap-1.5 transition-all hover:scale-105 shadow-lg"
              style={{ backgroundColor: step.color }}
            >
              {isLastStep ? 'Get Started' : 'Next'} {!isLastStep && <FaChevronRight size={12} />}
            </button>
          </div>
        </div>
      </div>

      <style>{`
        @keyframes fade-in {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes zoom-in-95 {
          from { opacity: 0; transform: scale(0.95); }
          to { opacity: 1; transform: scale(1); }
        }
        @keyframes slide-in-from-right-5 {
          from { opacity: 0; transform: translateX(20px); }
          to { opacity: 1; transform: translateX(0); }
        }
        .animate-in {
          animation-fill-mode: both;
        }
        .fade-in { animation-name: fade-in; }
        .zoom-in-95 { animation-name: zoom-in-95; }
        .slide-in-from-right-5 { animation-name: slide-in-from-right-5; }
        .duration-200 { animation-duration: 200ms; }
        .duration-300 { animation-duration: 300ms; }
      `}</style>
    </div>
  );
};
