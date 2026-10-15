'use client';

import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { ColorTag } from '@/components/ui/tag';
import { cn } from '@/lib/utils';
import type {
  Card,
  CardIssueType,
  CardStatus,
  EntityId,
  Version,
} from '@/config/interface';
import {
  DescriptionCard,
  DetailsCard,
  PriorityValue,
} from '../issues/[id]/description-card';

interface PreviewIssueProps {
  card: Card;
  versions: Version[];
  issueTypeInfo: CardIssueType | null;
  statusInfo: CardStatus | null;
  priorityLabel: string | null;
  resolveUser: (
    user: Card['assignee'] | EntityId,
    fallbackId?: EntityId
  ) => string;
  isSubmitting: boolean;
  onBack: () => void;
  onAdd: () => void;
  /** Hiện nút "Quay lại chỉnh sửa" / "Tạo công việc" dưới bản xem trước */
  showActions?: boolean;
  className?: string;
}

/**
 * Xem trước issue sắp tạo, cùng ngôn ngữ hình ảnh với inspector chi tiết:
 * loại + ưu tiên, tiêu đề lớn, trạng thái, thẻ Details, thẻ Description.
 */
export const PreviewIssue: React.FC<PreviewIssueProps> = ({
  card,
  versions,
  issueTypeInfo,
  statusInfo,
  priorityLabel,
  resolveUser,
  isSubmitting,
  onBack,
  onAdd,
  showActions = true,
  className,
}) => {
  const { t } = useTranslation();

  return (
    <div className={cn('animate-pop min-w-0', className)}>
      <div className="px-1.5 pb-2 text-[13px] font-semibold text-muted">
        {t('addIssue.previewTitle')}
      </div>
      <p className="mb-4 px-1.5 text-[13px] text-muted">
        {t('addIssue.previewHint')}
      </p>

      {(issueTypeInfo || priorityLabel) && (
        <div className="mb-2.5 flex flex-wrap items-center gap-2.5 px-0.5">
          {issueTypeInfo && (
            <ColorTag color={issueTypeInfo.statusColor}>
              {issueTypeInfo.name}
            </ColorTag>
          )}
          {priorityLabel && (
            <PriorityValue
              priority={card.priority}
              label={t('issueDetail.priorityLabel', {
                priority: priorityLabel,
              })}
              className="text-[13px] text-muted"
            />
          )}
        </div>
      )}

      <h2
        className={cn(
          'mb-5 px-0.5 text-[22px] font-bold leading-[1.25] tracking-[-0.02em] text-balance',
          card.title ? 'text-ink' : 'text-faint'
        )}
      >
        {card.title || t('addIssue.placeholder.title')}
      </h2>

      <section className="mb-6">
        <div className="px-1.5 pb-2 text-[13px] font-semibold text-muted">
          {t('issueDetail.metadata.status')}
        </div>
        <div className="flex h-11 items-center rounded-xl border border-line bg-card px-3.5 shadow-card">
          {statusInfo ? (
            <ColorTag color={statusInfo.statusColor}>
              {statusInfo.title}
            </ColorTag>
          ) : (
            <span className="text-sm text-muted">
              {t('issueDetail.notSet')}
            </span>
          )}
        </div>
      </section>

      <DetailsCard
        className="mb-6"
        card={card}
        versions={versions}
        issueTypeInfo={issueTypeInfo}
        priorityLabel={priorityLabel}
        resolveUser={resolveUser}
        hideStatus
      />

      <DescriptionCard card={card} />

      {showActions && (
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button type="button" variant="outline" onClick={onBack}>
            {t('addIssue.backToEditing')}
          </Button>
          <Button type="button" onClick={onAdd} disabled={isSubmitting}>
            {isSubmitting ? t('common.loading') : t('addIssue.create')}
          </Button>
        </div>
      )}
    </div>
  );
};
