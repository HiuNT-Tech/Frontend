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
import { useIssueType } from '@/hooks/use-issue-type';
import {
  createIssueTypeFormSchema,
  type CreateIssueTypeFormData,
} from '@/validation/create-issue-type-form-schemas';
import type { EntityId } from '@/config/interface';
import { ColorSwatchPicker } from './ColorSwatchPicker';
import { FieldRow, SettingsFormFrame } from './SettingsFormFrame';

export interface IssueTypeCreateFormProps {
  boardId: EntityId;
  onClose: () => void;
  onSubmit: (data: CreateIssueTypeFormData) => Promise<void>;
  isPending: boolean;
}

export const IssueTypeCreateForm: React.FC<IssueTypeCreateFormProps> = ({
  boardId,
  onClose,
  onSubmit,
  isPending,
}) => {
  const { t } = useTranslation();
  const { issueTypes, isLoading } = useIssueType(boardId);

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
      backLabel={t('settings.issueTypes.add.back')}
      onBack={handleClose}
      title={t('settings.issueTypes.add.title')}
      description={t('settings.issueTypes.add.description')}
      cancelLabel={t('settings.issueTypes.add.cancel')}
      submitLabel={t('settings.issueTypes.actions.add')}
      isPending={isPending}
      onSubmit={handleSubmit(onSubmit, onError)}
    >
      <Group
        title={t('settings.issueTypes.add.nameLabel')}
        hint={t('settings.issueTypes.add.nameHint')}
      >
        <FieldRow first>
          <Input
            aria-label={t('settings.issueTypes.add.nameLabel')}
            placeholder={t('settings.issueTypes.add.namePlaceholder')}
            error={getFieldError('name')}
            {...register('name')}
            disabled={isPending}
            autoFocus
          />
        </FieldRow>
      </Group>

      <Group
        title={t('settings.issueTypes.add.backgroundLabel')}
        hint={t('settings.issueTypes.add.backgroundHint')}
      >
        <FieldRow first>
          <ColorSwatchPicker
            value={selectedColorKey ?? 'blue'}
            onChange={key => setValue('selectedColorKey', key)}
            previewLabel={name || t('settings.issueTypes.add.colorSample')}
            disabled={isPending}
          />
          {getFieldError('selectedColorKey') && (
            <p className="mt-2 text-[13px] text-danger">
              {getFieldError('selectedColorKey')}
            </p>
          )}
        </FieldRow>
      </Group>

      <Group title={t('settings.issueTypes.add.existingLabel')}>
        <FieldRow first className="flex flex-wrap gap-2">
          {isLoading ? (
            <StateMessage as="p" i18nKey="common.loading" />
          ) : issueTypes.length === 0 ? (
            <StateMessage as="p" i18nKey="settings.issueTypes.table.empty" />
          ) : (
            issueTypes.map(type => (
              <ColorTag key={type.id} color={type.statusColor}>
                {type.name}
              </ColorTag>
            ))
          )}
        </FieldRow>
      </Group>
    </SettingsFormFrame>
  );
};
