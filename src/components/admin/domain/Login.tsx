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

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { useAtom } from 'jotai';
import { useNavigate } from '@tanstack/react-router';
import { yupResolver } from '@hookform/resolvers/yup';
import { FiEye, FiEyeOff, FiKey } from 'react-icons/fi';
import { domainLoginSchema, type DomainLoginForm } from './domainSchema';
import { apiKeyAtom } from '../../../state/auth';
import { useToast } from '../../../hooks/useToast';

const DomainLogin = () => {
  const [showApiKey, setShowApiKey] = useState(false);
  const [apiKey, setApiKey] = useAtom(apiKeyAtom);
  const navigate = useNavigate();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<DomainLoginForm>({
    resolver: yupResolver(domainLoginSchema),
  });

  const onSubmit = async (data: DomainLoginForm) => {
    setApiKey(data.apiKey);
    toast.success({ description: 'Logged in successfully' });
  };

  useEffect(() => {
    if (apiKey) {
      navigate({ to: '/1219/admin/domain' });
    }
  }, [apiKey, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-[var(--gray-2)] px-4 py-12">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-full bg-[var(--accent-3)] mb-4">
            <FiKey className="w-6 h-6 text-[var(--accent-11)]" />
          </div>
          <h1 className="text-2xl font-semibold text-[var(--gray-12)] mb-2">Domain Management</h1>
          <p className="text-sm text-[var(--gray-11)]">Enter your Admin Key to continue</p>
        </div>

        <div className="bg-[var(--gray-1)] rounded-lg shadow-sm border border-[var(--gray-5)] p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="space-y-2">
              <label htmlFor="apiKey" className="block text-sm font-medium text-[var(--gray-12)]">
                Admin Key
              </label>
              <div className="relative">
                <input
                  type={showApiKey ? 'text' : 'password'}
                  id="apiKey"
                  placeholder="Enter your Admin Key"
                  className={`w-full px-4 py-2.5 pr-10 bg-[var(--gray-1)] border rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 transition-all ${
                    errors.apiKey
                      ? 'border-[var(--red-9)] focus:ring-[var(--red-9)] focus:border-[var(--red-9)]'
                      : 'border-[var(--gray-6)] focus:ring-[var(--accent-9)] focus:border-transparent hover:border-[var(--gray-7)]'
                  }`}
                  maxLength={200}
                  {...register('apiKey')}
                />
                <button
                  type="button"
                  onClick={() => setShowApiKey((prev) => !prev)}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-[var(--gray-11)] hover:text-[var(--gray-12)] transition-colors"
                  tabIndex={-1}
                >
                  {showApiKey ? <FiEye className="w-5 h-5" /> : <FiEyeOff className="w-5 h-5" />}
                </button>
              </div>
              {errors.apiKey && (
                <p className="text-sm text-[var(--red-9)]">{errors.apiKey.message}</p>
              )}
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-2.5 px-4 bg-[var(--accent-9)] hover:bg-[var(--accent-10)] text-white font-medium rounded-lg focus:outline-none focus:ring-2 focus:ring-[var(--accent-9)] focus:ring-offset-2 focus:ring-offset-[var(--gray-1)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default DomainLogin;
