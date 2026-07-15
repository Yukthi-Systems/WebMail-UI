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

import { Button, Dialog, Flex } from '@radix-ui/themes';
import { useAtom } from 'jotai';
import { FaXmark } from 'react-icons/fa6';
import { createFolderOpenAtom } from '../../state/composer';
import { Input } from '../ui/InputComponents';
import * as yup from 'yup';
import { yupResolver } from '@hookform/resolvers/yup';
import { FormProvider, useForm } from 'react-hook-form';
import { useCreateEmailFolder } from '../../hooks/useEmails';
import { useToast } from '../ui/ToastComponent';
import { useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react'; // Added useEffect

const schema = yup.object({
  folder_path: yup.string().required('Folder Name is required'),
});

type FormData = yup.InferType<typeof schema>;

function CreateFolder() {
  const [open, setOpen] = useAtom(createFolderOpenAtom);
  const { mutate, isPending: isCreating } = useCreateEmailFolder();
  const toast = useToast();
  const methods = useForm<FormData>({
    resolver: yupResolver(schema),
    defaultValues: {
      folder_path: '',
    },
  });
  const queryClient = useQueryClient();

  // Reset form when dialog opens/closes
  useEffect(() => {
    methods.reset();
  }, [open, methods]);

  const onSubmit = (data: FormData) => {
    const loadingId = toast.loading({ description: 'Creating folder…' });
    mutate(
      { path: data.folder_path },
      {
        onSuccess: () => {
          toast.dismiss(loadingId);
          toast.success({ description: 'Folder created.' });
          queryClient.invalidateQueries({ queryKey: ['folders'] });
          queryClient.invalidateQueries({ queryKey: ['foldersFullPath'] });
          setOpen(false);
          methods.reset();
        },
        onError: (error: any) => {
          toast.dismiss(loadingId);
          toast.error({
            description: error.message || 'Failed to create folder. Please try again.',
            duration: 3000,
          });
        },
      }
    );
  };

  const handleOpenChange = (open: boolean) => {
    setOpen(open);
  };

  return (
    <Dialog.Root open={open} onOpenChange={handleOpenChange}>
      <Dialog.Content>
        <Flex justify="end">
          <Dialog.Close>
            <Button variant="ghost" color="gray">
              <FaXmark />
            </Button>
          </Dialog.Close>
        </Flex>

        <FormProvider {...methods}>
          <form onSubmit={methods.handleSubmit(onSubmit)}>
            <Dialog.Title>Create New Folder</Dialog.Title>
            <Dialog.Description size="2" mb="4">
              Enter a name for your new folder
            </Dialog.Description>

            <Input
              name="folder_path"
              label="Folder Name"
              type="text"
              placeholder="Enter Name"
              variant="surface"
              size="3"
            />

            <Flex gap="3" justify="end" mt="4">
              <Dialog.Close>
                <Button variant="soft" color="gray">
                  Cancel
                </Button>
              </Dialog.Close>
              <Button type="submit" disabled={isCreating} loading={isCreating}>
                Create
              </Button>
            </Flex>
          </form>
        </FormProvider>
      </Dialog.Content>
    </Dialog.Root>
  );
}

export default CreateFolder;
