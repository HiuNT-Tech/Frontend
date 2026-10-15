'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Check } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createBoardFormSchema,
  CreateBoardFormData,
} from '@/validation/create-board-form-schemas';

interface SampleBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBoardFormData) => Promise<void>;
  isPending: boolean;
}

const createDefaultSampleBoardCode = () =>
  `SAMPLE-${crypto.randomUUID().slice(0, 8).toUpperCase()}`;

const INCLUDES_KEYS = [
  'dashboard.sampleProject.includesColumns',
  'dashboard.sampleProject.includesIssueTypes',
  'dashboard.sampleProject.includesMilestones',
  'dashboard.sampleProject.includesTickets',
] as const;

export default function SampleBoardDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: SampleBoardDialogProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardFormSchema),
    defaultValues: {
      title: '',
      boardCode: '',
    },
  });

  useEffect(() => {
    if (open) {
      reset({
        title: t('dashboard.sampleProject.defaultTitle'),
        boardCode: createDefaultSampleBoardCode(),
      });
    }
  }, [open, reset, t]);

  const handleFormSubmit = async (data: CreateBoardFormData) => {
    await onSubmit(data);
    reset();
  };

  const handleClose = () => {
    reset();
    onOpenChange(false);
  };

  return (
    <Modal
      isOpen={open}
      onClose={handleClose}
      size="md"
      title={t('dashboard.sampleProject.title')}
      closeOnOverlayClick={!isPending}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5"
        id="sample-board-form"
      >
        <p className="text-[14.5px] leading-relaxed text-ink-2">
          {t('dashboard.sampleProject.description')}
        </p>

        {/* Nhóm "có sẵn": tiêu đề nhóm nhỏ + khối nền xám, mỗi dòng một hairline */}
        <section>
          <h4 className="mb-2 px-1.5 text-[13px] font-semibold text-muted">
            {t('dashboard.sampleProject.includesTitle')}
          </h4>
          <ul className="m-0 list-none overflow-hidden rounded-[14px] bg-fill p-0 text-[14px] text-ink-2">
            {INCLUDES_KEYS.map(key => (
              <li
                key={key}
                className="flex items-start gap-2.5 border-t border-line px-3.5 py-2.5 first:border-t-0"
              >
                <Check
                  aria-hidden="true"
                  className="mt-0.5 size-4 flex-none text-accent"
                />
                <span>{t(key)}</span>
              </li>
            ))}
          </ul>
        </section>

        <div className="flex flex-col gap-4">
          <Input
            label={t('dashboard.sampleProject.nameLabel')}
            error={errors.title?.message}
            requiredIndicator
            {...register('title')}
          />

          <Input
            label={t('dashboard.sampleProject.codeLabel')}
            error={errors.boardCode?.message}
            requiredIndicator
            className="font-semibold uppercase tabular-nums"
            {...register('boardCode')}
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {t('common.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending
              ? t('common.loading')
              : t('dashboard.sampleProject.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
