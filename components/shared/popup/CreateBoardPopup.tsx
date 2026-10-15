'use client';

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

interface CreateBoardDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: CreateBoardFormData) => Promise<void>;
  isPending: boolean;
}

export default function CreateBoardDialog({
  open,
  onOpenChange,
  onSubmit,
  isPending,
}: CreateBoardDialogProps) {
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
  // gõ vào ô mã project.
  const isBoardCodeDirty = !!dirtyFields.boardCode;

  // Gợi ý mã project từ tên, nhưng chỉ khi người dùng chưa tự sửa mã — tránh
  // ghi đè giá trị họ đã chủ động nhập.
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
      title={t('dashboard.createProject.title')}
      closeOnOverlayClick={!isPending}
    >
      <form
        onSubmit={handleSubmit(handleFormSubmit)}
        className="flex flex-col gap-5"
        id="create-board-form"
      >
        <p className="text-[14.5px] leading-relaxed text-ink-2">
          {t('dashboard.createProject.description')}
        </p>

        <div className="flex flex-col gap-4">
          <Input
            label={t('dashboard.createProject.nameLabel')}
            placeholder={t('dashboard.createProject.namePlaceholder')}
            error={errors.title?.message}
            requiredIndicator
            autoFocus
            {...register('title')}
            onChange={handleTitleChange}
          />

          <div>
            <Input
              label={t('dashboard.createProject.codeLable')}
              error={errors.boardCode?.message}
              requiredIndicator
              className="font-semibold uppercase tabular-nums"
              {...register('boardCode')}
            />
            {!errors.boardCode && (
              <p className="mt-1.5 text-[13px] text-muted">
                {t('dashboard.createProject.codeHint')}
              </p>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            onClick={handleClose}
            disabled={isPending}
          >
            {t('dashboard.createProject.cancel')}
          </Button>
          <Button type="submit" variant="primary" disabled={isPending}>
            {isPending
              ? t('common.loading')
              : t('dashboard.createProject.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
