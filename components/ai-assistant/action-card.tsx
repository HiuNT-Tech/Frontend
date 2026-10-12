'use client';

import Link from 'next/link';
import { useTranslation } from 'react-i18next';
import Image from 'next/image';
import Icons from '@/assets/icons';
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
 * Đề xuất ghi của AI: người dùng duyệt rồi bấm Áp dụng. Sau khi xử lý thì
 * khoá lại để không áp dụng trùng.
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

  return (
    <div
      className={cn(
        'rounded-xl border bg-theme-neutral-1 text-sm shadow-sm transition-opacity',
        isDelete ? 'border-red-300' : 'border-theme-main-3',
        status === 'cancelled' && 'opacity-60',
        className
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2 rounded-t-xl px-3 py-2 text-xs font-semibold',
          isDelete
            ? 'bg-red-50 text-red-700'
            : 'bg-theme-main-1 text-theme-main-7'
        )}
      >
        <Image
          src={isDelete ? Icons.XCircle : Icons.Sparkles}
          alt=""
          width={14}
          height={14}
          style={isDelete ? undefined : { filter: 'var(--theme-filter-main)' }}
        />
        <span>
          {t('aiAssistant.proposal.heading')} ·{' '}
          {t(`aiAssistant.proposal.type.${proposal.type}`)}
          {proposal.card ? ` ${proposal.card.cardCode}` : ''}
        </span>
      </div>

      <div className="px-3 py-2">
        {proposal.card && (isUpdate || isDelete) && (
          <p className="mb-2 text-sm text-theme-neutral-11">
            <span className="font-semibold">{proposal.card.cardCode}</span>{' '}
            {proposal.card.title}
          </p>
        )}

        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-xs">
          {proposal.fields
            .filter(
              field =>
                !(
                  isDelete &&
                  (field.key === 'cardCode' || field.key === 'title')
                )
            )
            .map(field => (
              <div key={field.key} className="contents">
                <dt className="text-theme-neutral-7">
                  {t(`aiAssistant.fields.${field.key}`, {
                    defaultValue: field.label,
                  })}
                </dt>
                <dd className="min-w-0 break-words text-theme-neutral-11">
                  {isUpdate ? (
                    <>
                      <span className="text-theme-neutral-7 line-through">
                        {clip(field.before) || '—'}
                      </span>
                      <span className="mx-1 text-theme-neutral-6">→</span>
                      <span className="font-medium">
                        {clip(field.after) || '—'}
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

        {proposal.reason && (
          <p className="mt-2 text-xs italic text-theme-neutral-7">
            {proposal.reason}
          </p>
        )}

        {isDelete && status === 'pending' && (
          <p className="mt-2 text-xs font-medium text-red-700">
            {t('aiAssistant.proposal.deleteWarning')}
          </p>
        )}

        {status === 'failed' && state.error && (
          <p className="mt-2 rounded bg-red-50 px-2 py-1 text-xs text-red-700">
            {t('aiAssistant.proposal.failed')}: {state.error}
          </p>
        )}
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-theme-neutral-4 px-3 py-2">
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
                    <Image
                      src={Icons.Loader2}
                      alt=""
                      width={14}
                      height={14}
                      className="mr-1.5 animate-spin brightness-0 invert"
                    />
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
      <span className="text-xs text-theme-neutral-7">
        {t('aiAssistant.proposal.cancelled')}
      </span>
    );
  }

  return (
    <div className="flex w-full items-center justify-between gap-2 text-xs">
      <span className="flex items-center gap-1 font-medium text-theme-main-6">
        <Image
          src={Icons.CheckCircle2}
          alt=""
          width={14}
          height={14}
          style={{ filter: 'var(--theme-filter-main)' }}
        />
        {t('aiAssistant.proposal.applied', { code: cardCode ?? '' })}
      </span>
      {!isDelete && cardId && (
        <Link
          href={`/project/${boardId}/issues/${cardId}`}
          className="font-medium text-theme-main hover:underline"
        >
          {t('aiAssistant.proposal.openCard')}
        </Link>
      )}
    </div>
  );
}
