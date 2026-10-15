'use client';

import { memo, useMemo } from 'react';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { useDroppable } from '@dnd-kit/core';
import { useTranslation } from 'react-i18next';
import { Card } from './card';
import type { Card as CardType, EntityId } from '@/config/interface';
import { toCardListDndId } from '@/utils/board-dnd';

interface CardListProps {
  cards: CardType[];
  columnId: EntityId;
}

/** Danh sách thẻ trong một cột: cuộn dọc riêng, luôn có vùng thả kể cả khi trống. */
function CardListBase({ cards, columnId }: CardListProps) {
  const { t } = useTranslation();
  const realCards = useMemo(
    () => cards.filter(card => !card.FE_PlaceholderCard),
    [cards]
  );
  const cardIds = useMemo(() => realCards.map(c => c.id), [realCards]);

  // Use unique ID "cards-{columnId}" to avoid conflict with Column sortable ID
  const { setNodeRef } = useDroppable({
    id: toCardListDndId(columnId),
    data: { type: 'CardList', columnId },
  });

  return (
    <SortableContext items={cardIds} strategy={verticalListSortingStrategy}>
      <div
        ref={setNodeRef}
        className="flex min-h-[80px] min-w-0 flex-1 flex-col gap-2 overflow-x-hidden overflow-y-auto px-0.5 pb-0.5"
      >
        {realCards.map(card => (
          <Card key={card.id} card={card} />
        ))}
        {realCards.length === 0 && (
          <div className="px-2 py-5 text-center text-[13px] leading-[1.45] text-muted">
            <b className="mb-0.5 block text-[13.5px] font-semibold text-ink-2">
              {t('board.column.empty.title')}
            </b>
            {t('board.column.empty.description')}
          </div>
        )}
      </div>
    </SortableContext>
  );
}

export const CardList = memo(CardListBase);
