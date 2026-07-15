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

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { useNavigate, useParams } from '@tanstack/react-router';
import { FiArrowLeft } from 'react-icons/fi';
import { Flex, Switch, Text } from '@radix-ui/themes';
import { Controller } from 'react-hook-form';
import { useCreateDomain, useUpdateDomain, useGetDomain } from '../../../hooks/useAdminDomain';
import { useToast } from '../../ui/ToastComponent';
import { apiKeyAtom } from '../../../state/auth';
import { useAtomValue } from 'jotai';

const schema = yup.object().shape({
  domain: yup.string().required('Domain name is required'),
  smtp_server: yup.string().required('SMTP server is required'),
  smtp_port: yup
    .number()
    .typeError('Port must be a number')
    .min(1, 'Port must be between 1-65535')
    .max(65535)
    .required('SMTP port is required'),
  imap_server: yup.string().required('IMAP server is required'),
  imap_port: yup
    .number()
    .typeError('Port must be a number')
    .min(1, 'Port must be between 1-65535')
    .max(65535)
    .required('IMAP port is required'),
  sieve_server: yup.string().required('Sieve server is required'),
  sieve_port: yup
    .number()
    .typeError('Port must be a number')
    .min(1, 'Port must be between 1-65535')
    .max(65535)
    .required('Sieve port is required'),
  is_active: yup.boolean().default(true),
  is_v2_user: yup.boolean().default(false),
});

type FormData = yup.InferType<typeof schema>;

function DomainForm() {
  const navigate = useNavigate();
  const apiKey = useAtomValue(apiKeyAtom);
  const params = useParams({ strict: false }) as { domain?: string };
  const isEditMode = !!params.domain;

  const { data: domainData, isLoading } = useGetDomain(params.domain);
  const createMutation = useCreateDomain();
  const updateMutation = useUpdateDomain();
  const toast = useToast();

  const {
    register,
    handleSubmit,
    reset,
    control,
    formState: { errors, isDirty },
  } = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      domain: '',
      smtp_server: '',
      smtp_port: 587,
      imap_server: '',
      imap_port: 993,
      sieve_server: '',
      sieve_port: 4190,
      is_active: true,
      is_v2_user: false,
    },
  });

  useEffect(() => {
    if (isEditMode && domainData) {
      reset({
        domain: domainData.data?.domain,
        smtp_server: domainData.data.smtp_server,
        smtp_port: domainData.data.smtp_port,
        imap_server: domainData.data.imap_server,
        imap_port: domainData.data.imap_port,
        sieve_server: domainData.data.sieve_server,
        sieve_port: domainData.data.sieve_port,
        is_active: domainData.data.is_active,
        is_v2_user: domainData.data.is_v2_user,
      });
    }
  }, [domainData, reset, isEditMode]);

  const onSubmit = (data: FormData) => {
    if (isEditMode && params.domain) {
      updateMutation.mutate(
        { domain: params.domain, data },
        {
          onSuccess: () => {
            navigate({ to: '/1219/admin/domain' });
          },
        }
      );
    } else {
      createMutation.mutate(data as any, {
        onSuccess: () => {
          navigate({ to: '/1219/admin/domain' });
        },
      });
    }
  };

  const isPending = createMutation.isPending || updateMutation.isPending;

  useEffect(() => {
    if (!apiKey && !sessionStorage.getItem('apiKey')) {
      navigate({ to: '/1219/admin/login' });
    }
  }, [apiKey, navigate]);

  if (isEditMode && isLoading) {
    return (
      <div className="min-h-screen bg-[var(--gray-2)] flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-[var(--accent-9)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[var(--gray-2)] p-4 md:p-8">
      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="mb-8 flex items-start justify-between">
          <div>
            <button
              onClick={() => navigate({ to: '/1219/admin/domain' })}
              className="inline-flex items-center gap-2 text-sm text-[var(--gray-11)] hover:text-[var(--gray-12)] mb-3 transition-colors"
            >
              <FiArrowLeft className="w-4 h-4" />
              Back to domains
            </button>
            <h1 className="text-3xl font-semibold text-[var(--gray-12)]">
              {isEditMode ? 'Edit Domain' : 'Add New Domain'}
            </h1>
            <p className="text-[var(--gray-11)] mt-2">
              Configure email server settings for this domain
            </p>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-10">
          {/* Domain Information */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
              Domain Information
            </h2>

            <div className="space-y-5">
              <FormField label="Domain Name" error={errors.domain?.message}>
                <input
                  type="text"
                  placeholder="example.com"
                  readOnly={isEditMode}
                  className={`w-full px-4 py-2.5 bg-[var(--gray-1)] border rounded-lg text-[var(--gray-12)] placeholder:text-[var(--gray-9)] focus:outline-none focus:ring-2 transition-all ${
                    errors.domain
                      ? 'border-[var(--red-9)] focus:ring-[var(--red-9)]'
                      : 'border-[var(--gray-6)] focus:ring-[var(--accent-9)] focus:border-[var(--accent-9)]'
                  } ${isEditMode ? 'bg-[var(--gray-3)] cursor-not-allowed' : ''}`}
                  {...register('domain')}
                />
                {isEditMode && (
                  <p className="text-xs text-[var(--gray-11)] mt-1.5">
                    Domain name cannot be changed
                  </p>
                )}
              </FormField>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <Controller
                  name="is_active"
                  control={control}
                  render={({ field }) => (
                    <Flex align="center" gap="3">
                      <Switch
                        id="is_active"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <label
                        htmlFor="is_active"
                        className="text-sm font-medium text-[var(--gray-12)] cursor-pointer"
                      >
                        Domain is active
                      </label>
                    </Flex>
                  )}
                />

                <Controller
                  name="is_v2_user"
                  control={control}
                  render={({ field }) => (
                    <Flex align="center" gap="3">
                      <Switch
                        id="is_v2_user"
                        checked={field.value}
                        onCheckedChange={field.onChange}
                      />
                      <div className="flex flex-col">
                        <label
                          htmlFor="is_v2_user"
                          className="text-sm font-medium text-[var(--gray-12)] cursor-pointer"
                        >
                          Is V2 User
                        </label>
                        <Text size="1" color="gray">
                          {' '}
                          Enable V2 user features for this domain
                        </Text>
                      </div>
                    </Flex>
                  )}
                />
              </div>
            </div>
          </div>

          <div className="border-t border-[var(--gray-5)]"></div>

          {/* SMTP Configuration */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
              SMTP Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="SMTP Server" error={errors.smtp_server?.message}>
                <input
                  type="text"
                  placeholder="smtp.example.com"
                  className="form-input"
                  {...register('smtp_server')}
                />
              </FormField>

              <FormField label="SMTP Port" error={errors.smtp_port?.message}>
                <input
                  type="number"
                  placeholder="587"
                  className="form-input"
                  {...register('smtp_port', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          <div className="border-t border-[var(--gray-5)]"></div>

          {/* IMAP Configuration */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
              IMAP Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="IMAP Server" error={errors.imap_server?.message}>
                <input
                  type="text"
                  placeholder="imap.example.com"
                  className="form-input"
                  {...register('imap_server')}
                />
              </FormField>

              <FormField label="IMAP Port" error={errors.imap_port?.message}>
                <input
                  type="number"
                  placeholder="993"
                  className="form-input"
                  {...register('imap_port', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          <div className="border-t border-[var(--gray-5)]"></div>

          {/* Sieve Configuration */}
          <div className="space-y-2">
            <h2 className="text-sm font-semibold text-[var(--gray-12)] uppercase tracking-wider">
              Sieve Configuration
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <FormField label="Sieve Server" error={errors.sieve_server?.message}>
                <input
                  type="text"
                  placeholder="sieve.example.com"
                  className="form-input"
                  {...register('sieve_server')}
                />
              </FormField>

              <FormField label="Sieve Port" error={errors.sieve_port?.message}>
                <input
                  type="number"
                  placeholder="4190"
                  className="form-input"
                  {...register('sieve_port', { valueAsNumber: true })}
                />
              </FormField>
            </div>
          </div>

          <div className="border-t border-[var(--gray-5)] pt-3"></div>

          {/* Actions */}
          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={() => navigate({ to: '/1219/admin/domain' })}
              className="px-5 py-2.5 text-sm font-medium text-[var(--gray-11)] hover:text-[var(--gray-12)] hover:bg-[var(--gray-4)] rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isPending || (isEditMode && !isDirty)}
              className="px-5 py-2.5 text-sm font-medium text-white bg-[var(--accent-9)] hover:bg-[var(--accent-10)] rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2 shadow-sm"
            >
              {isPending && (
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
              )}
              {isEditMode ? 'Update Domain' : 'Create Domain'}
            </button>
          </div>
        </form>
      </div>

      <style>{`
        .form-input {
          width: 100%;
          padding: 0.625rem 1rem;
          background-color: var(--gray-1);
          border: 1px solid var(--gray-6);
          border-radius: 0.5rem;
          color: var(--gray-12);
          transition: all 0.2s;
        }
        .form-input::placeholder {
          color: var(--gray-9);
        }
        .form-input:focus {
          outline: none;
          border-color: var(--accent-9);
          ring: 2px;
          ring-color: var(--accent-9);
        }
        .form-input[aria-invalid="true"] {
          border-color: var(--red-9);
        }
        .form-input[aria-invalid="true"]:focus {
          ring-color: var(--red-9);
        }
      `}</style>
    </div>
  );
}

const FormField = ({ label, error, children }: any) => (
  <div className="space-y-2">
    <label className="block text-sm font-medium text-[var(--gray-12)]">
      {label} <span className="text-[var(--red-9)]">*</span>
    </label>
    {children}
    {error && <p className="text-sm text-[var(--red-9)]">{error}</p>}
  </div>
);

export default DomainForm;
