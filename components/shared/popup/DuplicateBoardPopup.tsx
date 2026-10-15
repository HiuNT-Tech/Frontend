'use client';

import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useTranslation } from 'react-i18next';
import { Modal } from '@/components/ui/modal';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  createBoardFormSchema,
  CreateBoardFormData,
} from '@/validation/create-board-form-schemas';
import { toBoardCode } from '@/utils/board-code';

interface DuplicateBoardDialogProps {
  open: boolean;
  sourceTitle: string;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBoardFormData) => Promise<void>;
  isPending: boolean;
}

export default function DuplicateBoardDialog({
  open,
  sourceTitle,
  onOpenChange,
  onSubmit,
  isPending,
}: DuplicateBoardDialogProps) {
  const { t } = useTranslation();

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors, dirtyFields },
  } = useForm<CreateBoardFormData>({
    resolver: zodResolver(createBoardFormSchema),
    defaultValues: {
      title: '',
      boardCode: '',
    },
  });

  // `setValue` không kèm `shouldDirty` nên cờ này chỉ bật khi chính người dùng
  // gõ vào ô mã board.
  const isBoardCodeDirty = !!dirtyFields.boardCode;

  // Gợi ý sẵn tên/mã dựa trên board nguồn mỗi khi mở dialog cho 1 board mới.
  // Mã phải là mã hợp lệ ngay từ đầu, nếu không người dùng bấm "Nhân bản" luôn
  // sẽ bị BE từ chối.
  useEffect(() => {
    if (open) {
      const title = `${sourceTitle} (copy)`;
      reset({ title, boardCode: toBoardCode(title) });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, sourceTitle]);

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setValue('title', value);
    if (!isBoardCodeDirty) {
      setValue('boardCode', toBoardCode(value), { shouldValidate: true });
    }
  };

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
      size="sm"
      title={t('dashboard.duplicateProject.title')}
      closeOnOverlayClick={!isPending}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5"
        id="duplicate-board-form"
      >
        <p className="text-[14.5px] leading-relaxed text-ink-2">
          {t('dashboard.duplicateProject.description', { sourceTitle })}
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label={t('dashboard.duplicateProject.nameLabel')}
            error={errors.title?.message}
            requiredIndicator
            autoFocus
            {...register('title')}
            onChange={handleTitleChange}
          />

          <Input
            label={t('dashboard.duplicateProject.codeLable')}
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
            {t('dashboard.duplicateProject.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending
              ? t('common.loading')
              : t('dashboard.duplicateProject.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
