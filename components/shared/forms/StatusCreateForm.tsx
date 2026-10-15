'use client';

import React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { StateMessage } from '@/components/ui/state-message';
import { Group } from '@/components/ui/surface';
import { ColorTag } from '@/components/ui/tag';
import type { ColorStatusKey } from '@/constant/data';
import { useColumn } from '@/hooks/use-column';
import {
  createIssueTypeFormSchema,
  type CreateIssueTypeFormData,
} from '@/validation/create-issue-type-form-schemas';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { FieldRow, SettingsFormFrame } from './SettingsFormFrame';

export interface StatusCreateFormProps {
  onClose: () => void;
  onSubmit: (data: CreateIssueTypeFormData) => Promise<void>;
  isPending: boolean;
}

export const StatusCreateForm: React.FC<StatusCreateFormProps> = ({
  onClose,
  onSubmit,
  isPending,
}) => {
  const { t } = useTranslation();
  const { columns, isLoading } = useColumn();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<CreateIssueTypeFormData>({
    resolver: zodResolver(createIssueTypeFormSchema),
    defaultValues: {
      name: '',
      selectedColorKey: 'blue' as ColorStatusKey,
    },
  });

  const selectedColorKey = watch('selectedColorKey');
  const name = watch('name');

  const getFieldError = (
    field: keyof CreateIssueTypeFormData
  ): string | undefined => {
    const msg = errors[field]?.message;
    return typeof msg === 'string' ? msg : undefined;
  };

  const onError = () => {
    setTimeout(() => {}, 200);
  };

  const handleClose = () => {
    reset({ name: '', selectedColorKey: 'blue' });
    onClose();
  };

  return (
    <SettingsFormFrame
      backLabel={t('settings.statuses.add.back')}
      onBack={handleClose}
      title={t('settings.statuses.add.title')}
      description={t('settings.statuses.add.description')}
      cancelLabel={t('settings.statuses.add.cancel')}
      submitLabel={t('settings.statuses.actions.add')}
      isPending={isPending}
      onSubmit={handleSubmit(onSubmit, onError)}
    >
      <Group
        title={t('settings.statuses.add.nameLabel')}
        hint={t('settings.statuses.add.nameHint')}
      >
        <FieldRow first>
          <Input
            aria-label={t('settings.statuses.add.nameLabel')}
            placeholder={t('settings.statuses.add.namePlaceholder')}
            error={getFieldError('name')}
            {...register('name')}
            disabled={isPending}
            autoFocus
          />
        </FieldRow>
      </Group>

      <Group
        title={t('settings.statuses.add.backgroundLabel')}
        hint={t('settings.statuses.add.backgroundHint')}
      >
        <FieldRow first>
          <ColorSwatchPicker
            value={selectedColorKey ?? 'blue'}
            onChange={key => setValue('selectedColorKey', key)}
            previewLabel={name || t('settings.statuses.add.colorSample')}
            disabled={isPending}
          />
          {getFieldError('selectedColorKey') && (
            <p className="mt-2 text-[13px] text-danger">
              {getFieldError('selectedColorKey')}
            </p>
          )}
        </FieldRow>
      </Group>

      <Group title={t('settings.statuses.add.existingLabel')}>
        <FieldRow first className="flex flex-wrap gap-2">
          {isLoading ? (
            <StateMessage as="p" i18nKey="common.loading" />
          ) : columns?.length === 0 ? (
            <StateMessage as="p" i18nKey="settings.statuses.table.empty" />
          ) : (
            columns?.map(column => (
              <ColorTag key={column.id} color={column.statusColor}>
                {column.title}
              </ColorTag>
            ))
          )}
        </FieldRow>
      </Group>
    </SettingsFormFrame>
  );
};
