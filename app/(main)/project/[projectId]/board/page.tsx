'use client';

import { useEffect, useMemo, useState, Suspense } from 'react';
import Link from 'next/link';
import { useDispatch, useSelector, useStore } from 'react-redux';
import { useTranslation } from 'react-i18next';
import { Plus } from 'lucide-react';
import { BoardContent } from '@/components/board/board-content';
import { BoardSkeleton } from '@/components/board/board-skeleton';
import type { BoardFilterValue } from '@/components/board/board-filters';
import { Pane } from '@/components/layout/pane';
import { IssueViewSwitcher } from '@/components/issues/issue-view-switcher';
import { buttonVariants } from '@/components/ui/button';
import { useCurrentProject } from '@/hooks/use-current-project';
import { cloneDeep } from 'lodash';
import {
  fetchBoardDetailsAPI,
  selectCurrentActiveBoard,
  updateCurrentActiveBoard,
} from '@/redux/activeBoard/activeBoardSlice';
import type { AppDispatch, RootState } from '@/redux/store';
import type {
  Board,
  BoardDetailParams,
  Column as ColumnType,
  Card,
  EntityId,
} from '@/config/interface';
import { useBoard } from '@/hooks/use-board';
import { useParams } from 'next/navigation';
import { toPositionPayload, withSequentialPositions } from '@/utils/sorts';
import {
  restoreCardPlacement,
  restoreColumnPositions,
} from '@/utils/board-dnd';

const EMPTY_BOARD_FILTERS: BoardFilterValue = {
  issueTypeId: '',
  assigneeUserId: '',
};

const toPositiveId = (value: string): EntityId | undefined => {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : undefined;
};

const countBoardCards = (board: Board): number =>
  board.columns.reduce(
    (total, column) => total + (column.cards?.length ?? 0),
    0
  );

function BoardPageContent() {
  const dispatch = useDispatch<AppDispatch>();
  const store = useStore<RootState>();
  const board = useSelector(selectCurrentActiveBoard) as Board | null;
  const params = useParams<{ projectId: string }>();
  const boardId = params.projectId;

  // Use the hook to get mutation functions - use board.id for mutations (numeric ID)
  const {
    updateBoardDetail,
    updateColumnDetails,
    moveCardToDifferentColumn: moveCardToDifferentColumnAPI,
  } = useBoard(board?.id);

  const [filters, setFilters] = useState<BoardFilterValue>(EMPTY_BOARD_FILTERS);
  const [totalCards, setTotalCards] = useState(0);

  // Build the query params sent to the API for server-side filtering
  const boardDetailParams = useMemo<BoardDetailParams>(() => {
    const nextParams: BoardDetailParams = {};
    const issueTypeId = toPositiveId(filters.issueTypeId);
    const assigneeUserId = toPositiveId(filters.assigneeUserId);

    if (issueTypeId) nextParams.issueTypeId = issueTypeId;
    if (assigneeUserId) nextParams.assigneeUserId = assigneeUserId;

    return nextParams;
  }, [filters.issueTypeId, filters.assigneeUserId]);

  // Refetch the board whenever the board or filters change so the BE returns
  // the already-filtered cards instead of filtering on the client.
  useEffect(() => {
    if (!boardId) return;

    const hasActiveFilter = Object.keys(boardDetailParams).length > 0;
    const promise = dispatch(
      fetchBoardDetailsAPI({
        boardId: parseInt(boardId),
        params: boardDetailParams,
      })
    );

    // Capture the unfiltered total so the "visible / total" badge stays accurate
    if (!hasActiveFilter) {
      promise
        .unwrap()
        .then(result => setTotalCards(countBoardCards(result)))
        .catch(() => {});
    }
  }, [dispatch, boardId, boardDetailParams]);

  if (!board) {
    return <BoardSkeleton />;
  }

  // BE không lưu (403 khi không đủ quyền, lỗi mạng...) → sửa lại board MỚI NHẤT
  // trong store bằng `restore`, không dùng snapshot cả board, để không ghi đè
  // thay đổi khác xảy ra trong lúc chờ request. Toast lỗi đã do interceptor
  // axios hiện.
  const rollbackBoard =
    (restore: (columns: ColumnType[]) => ColumnType[]) => () => {
      const latestBoard = selectCurrentActiveBoard(store.getState());
      if (latestBoard?.id !== board.id) return;

      dispatch(
        updateCurrentActiveBoard({
          ...latestBoard,
          columns: restore(latestBoard.columns),
        })
      );
    };

  const moveColumns = (dndOrderedColumns: ColumnType[]) => {
    const previousColumns = board.columns;
    const positionedColumns = withSequentialPositions(dndOrderedColumns);
    const newBoard = cloneDeep(board);
    newBoard.columns = positionedColumns;
    dispatch(updateCurrentActiveBoard(newBoard));

    updateBoardDetail({
      id: board.id,
      columns: toPositionPayload(positionedColumns),
    }).catch(
      rollbackBoard(columns => restoreColumnPositions(columns, previousColumns))
    );
  };

  const moveCardInTheSameColumn = (
    dndOrderedCards: Card[],
    columnId: EntityId
  ) => {
    const previousColumns = board.columns.filter(
      column => column.id === columnId
    );
    const positionedCards = withSequentialPositions(dndOrderedCards);
    const newBoard = cloneDeep(board);
    const columnToUpdate = newBoard.columns.find(
      column => column.id === columnId
    );
    if (columnToUpdate) {
      columnToUpdate.cards = positionedCards;
    }
    dispatch(updateCurrentActiveBoard(newBoard));

    updateColumnDetails({
      id: columnId,
      cards: toPositionPayload(positionedCards),
    }).catch(
      rollbackBoard(columns => restoreCardPlacement(columns, previousColumns))
    );
  };

  const moveCardToDifferentColumn = (
    currentCardId: EntityId,
    prevColumnId: EntityId,
    nextColumnId: EntityId,
    dndOrderedColumns: ColumnType[]
  ) => {
    const previousColumns = board.columns.filter(
      column => column.id === prevColumnId || column.id === nextColumnId
    );
    const newBoard = cloneDeep(board);
    newBoard.columns = dndOrderedColumns;
    dispatch(updateCurrentActiveBoard(newBoard));

    const prevCards =
      dndOrderedColumns.find(c => c.id === prevColumnId)?.cards || [];
    const nextCards =
      dndOrderedColumns.find(c => c.id === nextColumnId)?.cards || [];

    moveCardToDifferentColumnAPI({
      currentCardId,
      prevColumnId,
      prevCards: toPositionPayload(prevCards),
      nextColumnId,
      nextCards: toPositionPayload(nextCards),
    }).catch(
      rollbackBoard(columns => restoreCardPlacement(columns, previousColumns))
    );
  };

  return (
    <BoardContent
      board={board}
      filters={filters}
      onFiltersChange={setFilters}
      totalCards={totalCards}
      moveColumns={moveColumns}
      moveCardInTheSameColumn={moveCardInTheSameColumn}
      moveCardToDifferentColumn={moveCardToDifferentColumn}
    />
  );
}

/** Trang Board: toolbar của pane + vùng cột tự cuộn ngang, cao bằng pane. */
function BoardPage() {
  const { t } = useTranslation();
  const { projectId, code, title } = useCurrentProject();

  return (
    <Pane
      title={t('shell.nav.board')}
      subtitle={[code, title].filter(Boolean).join(' · ') || undefined}
      center={<IssueViewSwitcher />}
      scroll={false}
      actions={
        projectId ? (
          <Link
            href={`/project/${projectId}/add-issue`}
            className={buttonVariants({ size: 'sm' })}
          >
            <Plus aria-hidden="true" />
            {t('shell.nav.newIssue')}
          </Link>
        ) : undefined
      }
    >
      <Suspense fallback={<BoardSkeleton />}>
        <BoardPageContent />
      </Suspense>
    </Pane>
  );
}

export default BoardPage;
