'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import {
  ArrowRight,
  CircleCheck,
  LoaderCircle,
  Sparkles,
  TriangleAlert,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { EntityId } from '@/config/interface';
import type { AiProposalState } from '@/types/ai-assistant';

interface ActionCardProps {
  boardId: EntityId;
  state: AiProposalState;
  onApply: () => void;
  onCancel: () => void;
  onRetry: () => void;
  className?: string;
}

const MAX_INLINE = 160;

const clip = (value: string | null | undefined) => {
  if (!value) return value ?? '';
  return value.length > MAX_INLINE ? `${value.slice(0, MAX_INLINE)}…` : value;
};

/**
 * Đề xuất ghi của AI: thẻ trắng, đầu thẻ màu nhạt nói đây là gì, các hàng
 * trước/sau cách nhau bằng đường kẻ mảnh, nút đặt tên theo kết quả. Sau khi xử
 * lý thì khoá lại để không áp dụng trùng.
 */
export function ActionCard({
  boardId,
  state,
  onApply,
  onCancel,
  onRetry,
  className,
}: ActionCardProps) {
  const { t } = useTranslation();
  const { proposal, status } = state;
  const isDelete = proposal.type === 'delete_card';
  const isUpdate = proposal.type === 'update_card';
  const isFinal = status === 'applied' || status === 'cancelled';
  const busy = status === 'applying';

  const resultCardId = state.resultCardId ?? proposal.card?.id;
  const resultCardCode = state.resultCardCode ?? proposal.card?.cardCode;

  const fields = proposal.fields.filter(
    field => !(isDelete && (field.key === 'cardCode' || field.key === 'title'))
  );

  return (
    <div
      className={cn(
        'animate-pop overflow-hidden rounded-card border border-line bg-card text-sm shadow-card transition-opacity duration-200 ease-soft',
        status === 'cancelled' && 'opacity-60',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 px-4 py-2.5 text-[12.5px] font-semibold',
          isDelete ? 'bg-danger-soft text-danger' : 'bg-fill text-muted'
        )}
      >
        {isDelete ? (
          <TriangleAlert className="size-3.5 flex-none" aria-hidden="true" />
        ) : (
          <Sparkles className="size-3.5 flex-none" aria-hidden="true" />
        )}
        <span className="min-w-0 truncate">
          {t('aiAssistant.proposal.heading')} ·{' '}
          {t(`aiAssistant.proposal.type.${proposal.type}`)}
          {proposal.card ? (
            <span className="tabular-nums"> {proposal.card.cardCode}</span>
          ) : null}
        </span>
      </div>

      <div className="px-4 py-3">
        {proposal.card && (isUpdate || isDelete) && (
          <p className="mb-2.5 text-[15px] font-medium leading-snug text-ink">
            <span className="tabular-nums text-muted">
              {proposal.card.cardCode}
            </span>{' '}
            {proposal.card.title}
          </p>
        )}

        {fields.length > 0 && (
          <dl className="divide-y divide-line">
            {fields.map(field => (
              <div
                key={field.key}
                className="grid grid-cols-[96px_minmax(0,1fr)] gap-x-3 py-2 text-[13px] first:pt-0 last:pb-0"
              >
                <dt className="text-muted">
                  {t(`aiAssistant.fields.${field.key}`, {
                    defaultValue: field.label,
                  })}
                </dt>
                <dd className="min-w-0 break-words text-ink">
                  {isUpdate ? (
                    <>
                      <span className="block text-muted line-through decoration-line-strong">
                        {clip(field.before) || '—'}
                      </span>
                      <span className="flex items-start gap-1.5 font-medium">
                        <ArrowRight
                          className="mt-[3px] size-3.5 flex-none text-muted"
                          aria-hidden="true"
                        />
                        <span
                          className={cn(
                            'min-w-0',
                            field.key === 'description' && 'whitespace-pre-wrap'
                          )}
                        >
                          {clip(field.after) || '—'}
                        </span>
                      </span>
                    </>
                  ) : (
                    <span
                      className={cn(
                        field.key === 'description' && 'whitespace-pre-wrap'
                      )}
                    >
                      {clip(field.after ?? field.before) || '—'}
                    </span>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        )}

        {proposal.reason && (
          <p className="mt-2.5 text-pretty text-[13px] leading-relaxed text-muted">
            {proposal.reason}
          </p>
        )}

        {isDelete && status === 'pending' && (
          <p className="mt-2.5 text-[13px] font-medium text-danger">
            {t('aiAssistant.proposal.deleteWarning')}
          </p>
        )}

        {status === 'failed' && state.error && (
          <p className="mt-2.5 rounded-[10px] bg-danger-soft px-3 py-2 text-[13px] text-danger">
            {t('aiAssistant.proposal.failed')}: {state.error}
          </p>
        )}
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line px-4 py-2.5">
        {isFinal ? (
          <StatusLine
            status={status}
            boardId={boardId}
            cardId={resultCardId}
            cardCode={resultCardCode}
            isDelete={isDelete}
          />
        ) : (
          <>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={onCancel}
              disabled={busy}
            >
              {t('aiAssistant.proposal.cancel')}
            </Button>
            <div className="flex items-center gap-2">
              {status === 'failed' && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onRetry}
                >
                  {t('aiAssistant.retry')}
                </Button>
              )}
              {status !== 'failed' && (
                <Button
                  type="button"
                  variant={isDelete ? 'danger' : 'primary'}
                  size="sm"
                  onClick={onApply}
                  disabled={busy}
                >
                  {busy && (
                    <LoaderCircle className="animate-spin" aria-hidden="true" />
                  )}
                  {t(`aiAssistant.proposal.apply.${proposal.type}`)}
                </Button>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatusLine({
  status,
  boardId,
  cardId,
  cardCode,
  isDelete,
}: {
  status: AiProposalState['status'];
  boardId: EntityId;
  cardId?: EntityId;
  cardCode?: string;
  isDelete: boolean;
}) {
  const { t } = useTranslation();

  if (status === 'cancelled') {
    return (
      <span className="py-1.5 text-[13px] text-muted">
        {t('aiAssistant.proposal.cancelled')}
      </span>
    );
  }

  return (
    <div className="flex w-full min-h-8 flex-wrap items-center justify-between gap-2 text-[13px]">
      <span className="flex items-center gap-1.5 font-medium text-accent-text">
        <CircleCheck className="size-4 flex-none" aria-hidden="true" />
        <span className="tabular-nums">
          {t('aiAssistant.proposal.applied', { code: cardCode ?? '' })}
        </span>
      </span>
      {!isDelete && cardId && (
        <Link
          href={`/project/${boardId}/issues/${cardId}`}
          className="font-semibold text-accent hover:underline"
        >
          {t('aiAssistant.proposal.openCard')}
        </Link>
      )}
    </div>
  );
}
