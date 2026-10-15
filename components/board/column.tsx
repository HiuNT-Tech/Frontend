'use client';

import { memo, useState } from 'react';
import { useDndContext } from '@dnd-kit/core';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { Plus } from 'lucide-react';

import { CardList } from './card-list';
import type { Column as ColumnType } from '@/config/interface';
import { AddCardPopup, type CardFormData } from './add-card-popup';
import { useDispatch, useSelector } from 'react-redux';
import {
  selectCurrentActiveBoard,
  updateCurrentActiveBoard,
} from '@/redux/activeBoard/activeBoardSlice';
import { BoardService } from '@/lib/apis/board';
import { cloneDeep } from 'lodash';
import { toastHelpers } from '@/hooks/use-toast';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { CreateNewCardRequest } from '@/config/interface';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { useTranslation } from 'react-i18next';
import { sortByPosition } from '@/utils/sorts';
import { CardPreview } from './card';
import { useBoardRole } from '@/hooks/use-board-role';
import { ColorDot } from '@/components/ui/tag';
import { IconButton } from '@/components/ui/icon-button';
import { cn } from '@/lib/utils';

interface ColumnProps {
  column: ColumnType;
}

const isRealCard = (card: ColumnType['cards'][number]): boolean =>
  !card.FE_PlaceholderCard;

/** Cột = một dải mờ trên nền (như track của segmented control), không phải thẻ; thẻ là các card. */
const COLUMN_CLASS =
  'flex w-[288px] max-h-full flex-none flex-col rounded-card bg-track p-2 transition-shadow duration-200 ease-soft';

function ColumnHeader({
  column,
  count,
  action,
  handleProps,
}: {
  column: ColumnType;
  count: number;
  action?: React.ReactNode;
  handleProps?: React.HTMLAttributes<HTMLDivElement>;
}) {
  return (
    <header className="flex items-center gap-2 pb-2 pl-1">
      <div
        {...handleProps}
        className={cn(
          'flex h-8 min-w-0 flex-1 items-center gap-2 rounded-[8px] pl-1',
          handleProps && 'cursor-grab active:cursor-grabbing'
        )}
      >
        <ColorDot color={column.statusColor} />
        <h3 className="truncate text-sm font-semibold text-ink">
          {column?.title}
        </h3>
        <span className="text-[13px] font-medium text-muted tabular-nums">
          {count}
        </span>
      </div>
      {action}
    </header>
  );
}

export const ColumnPreview = memo(function ColumnPreview({
  column,
}: ColumnProps) {
  const realCards = column.cards.filter(isRealCard);

  return (
    <div className={cn(COLUMN_CLASS, 'shadow-lift')}>
      <ColumnHeader column={column} count={realCards.length} />
      <div className="flex min-h-[40px] flex-1 flex-col gap-2 overflow-hidden px-0.5 pb-0.5">
        {realCards.map(card => (
          <CardPreview key={card.id} card={card} />
        ))}
      </div>
    </div>
  );
});

function ColumnBase({ column }: ColumnProps) {
  const { t } = useTranslation();
  const dispatch = useDispatch();
  const board = useSelector(selectCurrentActiveBoard);
  const { isContributor } = useBoardRole(board?.id);
  const queryClient = useQueryClient();

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: `column-${column.id}`,
    data: column,
  });

  // Đang kéo một thẻ qua cột này → viền accent báo chỗ thả.
  const { active, over } = useDndContext();
  const draggingCard = Boolean(active?.data?.current?.columnId);
  const isDropTarget =
    draggingCard &&
    over != null &&
    (over.id === `cards-${column.id}` ||
      column.cards.some(card => card.id === over.id));

  const [isAddCardPopupOpen, setIsAddCardPopupOpen] = useState(false);

  const dndKitColumnStyles: React.CSSProperties = {
    transform: CSS.Translate.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : undefined,
    willChange: 'transform',
  };

  const orderedCards = column.cards;
  const realCount = orderedCards.filter(isRealCard).length;

  const { mutateAsync: createNewCard } = useMutation({
    mutationFn: async (card: CreateNewCardRequest) => {
      return await BoardService.createNewCard(card);
    },
    onSuccess: createdCard => {
      if (!board) return;

      // Update Redux state locally
      const newBoard = cloneDeep(board);
      const columnToUpdate = newBoard.columns.find(
        col => col.id === createdCard.columnId
      );

      if (columnToUpdate) {
        if (columnToUpdate.cards.some(card => card.FE_PlaceholderCard)) {
          columnToUpdate.cards = [createdCard];
        } else {
          columnToUpdate.cards.push(createdCard);
        }

        columnToUpdate.cards = sortByPosition(columnToUpdate.cards);
      }

      dispatch(updateCurrentActiveBoard(newBoard));
      queryClient.invalidateQueries({ queryKey: ['boards'] });
      toastHelpers.success({ title: t('toast.success.cardCreated') });
      setIsAddCardPopupOpen(false);
    },
  });

  const handleAddCardConfirm = async (cardData: CardFormData) => {
    if (!board) return;

    try {
      const payload: CreateNewCardRequest = {
        boardId: board.id,
        columnId: column.id,
        title: cardData.title.trim(),
        ...(cardData.description && { description: cardData.description }),
        ...(cardData.priority && { priority: Number(cardData.priority) }),
        ...(cardData.assignee && {
          assigneeUserId: toEntityIdOrUndefined(cardData.assignee),
        }),
        ...(cardData.issueType && {
          issueTypeId: toEntityIdOrUndefined(cardData.issueType),
        }),
        ...(cardData.version && {
          versionId: toEntityIdOrUndefined(cardData.version),
        }),
        ...(cardData.startDate && { startDate: cardData.startDate }),
        ...(cardData.dueDate && { dueDate: cardData.dueDate }),
        ...(cardData.estimatedHours && {
          estimatedHours: cardData.estimatedHours,
        }),
        ...(cardData.actualHours && { actualHours: cardData.actualHours }),
      };

      await createNewCard(payload);
    } catch (error) {
      console.error('Failed to create card:', error);
    }
  };

  const addLabel = t('board.column.addIssueTo', { name: column.title });

  return (
    <div
      ref={setNodeRef}
      style={dndKitColumnStyles}
      className="h-full max-h-full"
    >
      <section
        aria-label={column.title}
        className={cn(
          COLUMN_CLASS,
          isDropTarget && 'shadow-[inset_0_0_0_2px_var(--accent)]'
        )}
      >
        <ColumnHeader
          column={column}
          count={realCount}
          handleProps={{ ...attributes, ...listeners }}
          action={
            isContributor ? (
              <IconButton
                size="sm"
                aria-label={addLabel}
                onClick={() => setIsAddCardPopupOpen(true)}
                className="text-muted hover:bg-card"
              >
                <Plus />
              </IconButton>
            ) : undefined
          }
        />

        {/* List Cards */}
        <CardList cards={orderedCards} columnId={column.id} />

        {isContributor && (
          <button
            type="button"
            onClick={() => setIsAddCardPopupOpen(true)}
            aria-label={addLabel}
            className="press mt-1 flex h-[34px] flex-none items-center gap-1.5 rounded-[10px] px-2.5 text-[13.5px] font-medium text-muted transition-colors duration-200 ease-soft hover:bg-card hover:text-ink"
          >
            <Plus aria-hidden="true" className="size-[14px]" />
            {t('board.column.addIssue')}
          </button>
        )}

        {/* Add New Card Popup */}
        <AddCardPopup
          isOpen={isAddCardPopupOpen}
          onClose={() => setIsAddCardPopupOpen(false)}
          onConfirm={handleAddCardConfirm}
          columnId={column.id}
        />
      </section>
    </div>
  );
}

export const Column = memo(ColumnBase);
