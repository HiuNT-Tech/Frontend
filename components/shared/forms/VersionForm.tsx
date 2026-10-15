'use client';

import React, { useEffect } from 'react';
import { useForm, type Resolver } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';

import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { DatePicker } from '@/components/ui/date-picker';
import { Group } from '@/components/ui/surface';
import {
  createVersionFormSchema,
  type CreateVersionFormData,
} from '@/validation/version-form-schema';
import type { Version } from '@/config/interface';
import { FieldRow, SettingsFormFrame } from './SettingsFormFrame';

export interface VersionFormProps {
  /** null = create, Version = edit */
  editingVersion: Version | null;
  onClose: () => void;
  onSubmit: (data: CreateVersionFormData) => Promise<void>;
  isPending: boolean;
}

export const VersionForm: React.FC<VersionFormProps> = ({
  editingVersion,
  onClose,
  onSubmit,
  isPending,
}) => {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<CreateVersionFormData>({
    resolver: zodResolver(
      createVersionFormSchema
    ) as Resolver<CreateVersionFormData>,
    defaultValues: {
      name: '',
      startDate: '',
      endDate: '',
      description: '',
    },
  });

  const startDate = watch('startDate');
  const endDate = watch('endDate');

  useEffect(() => {
    if (editingVersion) {
      reset({
        name: editingVersion.name,
        startDate: editingVersion.startDate ?? '',
        endDate: editingVersion.endDate ?? '',
        description: editingVersion.description ?? '',
      });
    } else {
      reset({
        name: '',
        startDate: '',
        endDate: '',
        description: '',
      });
    }
  }, [editingVersion, reset]);

  const getFieldError = (
    field: keyof CreateVersionFormData
  ): string | undefined => {
    const msg = errors[field]?.message;
    return typeof msg === 'string' ? msg : undefined;
  };

  const onError = () => {
    setTimeout(() => {}, 200);
  };

  const isEditing = editingVersion !== null;

  return (
    <SettingsFormFrame
      backLabel={t('settings.issueTypes.add.back')}
      onBack={onClose}
      title={
        isEditing
          ? t('settings.versions.form.editTitle', {
              name: editingVersion.name,
            })
          : t('settings.versions.form.createTitle')
      }
      description={t('settings.versions.hint')}
      cancelLabel={t('common.cancel')}
      submitLabel={
        isEditing
          ? t('settings.versions.form.save')
          : t('settings.versions.actions.add')
      }
      isPending={isPending}
      onSubmit={handleSubmit(onSubmit, onError)}
    >
      <Group title={t('settings.versions.add.nameLabel')}>
        <FieldRow first>
          <Input
            aria-label={t('settings.versions.add.nameLabel')}
            placeholder={t('settings.versions.add.namePlaceholder')}
            error={getFieldError('name')}
            {...register('name')}
            disabled={isPending}
            autoFocus={!isEditing}
          />
        </FieldRow>
      </Group>

      <Group title={t('settings.versions.add.setDateLabel')}>
        <FieldRow first className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label={t('settings.versions.table.startDate')}
            value={startDate ?? ''}
            {...register('startDate')}
            error={getFieldError('startDate')}
            onChange={e => {
              setValue('startDate', e.target.value);
              void trigger('endDate');
            }}
            placeholder={t('settings.versions.add.datePlaceholder')}
            disabled={isPending}
          />
          <DatePicker
            label={t('settings.versions.table.endDate')}
            value={endDate ?? ''}
            {...register('endDate')}
            error={getFieldError('endDate')}
            onChange={e => {
              setValue('endDate', e.target.value);
              void trigger('endDate');
            }}
            placeholder={t('settings.versions.add.datePlaceholder')}
            disabled={isPending}
          />
        </FieldRow>
      </Group>

      <Group
        title={t('settings.versions.add.descriptionLabel')}
        hint={t('settings.versions.add.descriptionHint')}
      >
        <FieldRow first>
          <Textarea
            aria-label={t('settings.versions.add.descriptionLabel')}
            placeholder={t('settings.versions.add.descriptionPlaceholder')}
            error={getFieldError('description')}
            rows={4}
            className="min-h-[96px]"
            {...register('description')}
            disabled={isPending}
          />
        </FieldRow>
      </Group>
    </SettingsFormFrame>
  );
};
