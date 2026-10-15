'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, Plus, RefreshCw, Search, Sparkles } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { useDashboard } from '@/hooks/use-dashboard';
import BoardList from '@/components/dashboard/BoardList';
import CreateBoardDialog from '@/components/shared/popup/CreateBoardPopup';
import DuplicateBoardDialog from '@/components/shared/popup/DuplicateBoardPopup';
import SampleBoardDialog from '@/components/shared/popup/SampleBoardPopup';
import MyInvitationsBanner from '@/components/shared/invitations/MyInvitationsBanner';
import { Pane, PaneContent } from '@/components/layout/pane';
import { Button } from '@/components/ui/button';
import { EmptyState } from '@/components/ui/empty-state';
import { Card } from '@/components/ui/surface';
import type { CreateBoardFormData } from '@/validation/create-board-form-schemas';
import type { Board } from '@/config/interface';

/** Khung xương có hình dạng của danh sách thật: một thẻ với 4 hàng. */
function BoardListSkeleton() {
  return (
    <div aria-hidden="true">
      <div className="skel mb-2 ml-1.5 h-4 w-28" />
      <Card className="overflow-hidden">
        {Array.from({ length: 4 }).map((_, i) => (
          <div
            key={i}
            className="flex min-h-16 items-center gap-4 border-t border-line px-[14px] py-2.5 first:border-t-0"
          >
            <div className="skel size-[34px] rounded-[10px]" />
            <div className="flex-1 space-y-2">
              <div className="skel h-4 w-2/5" />
              <div className="skel h-3 w-3/5" />
            </div>
            <div className="skel hidden h-3 w-16 md:block" />
          </div>
        ))}
      </Card>
    </div>
  );
}

export default function DashboardPage() {
  const { t } = useTranslation();
  const router = useRouter();
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [isSampleDialogOpen, setIsSampleDialogOpen] = useState(false);
  const [duplicateSource, setDuplicateSource] = useState<Board | null>(null);
  const [query, setQuery] = useState('');

  const {
    boards,
    isLoading,
    boardListError,
    refetchBoardList,
    createBoard,
    isCreateBoardPending,
    createSampleBoard,
    isCreateSampleBoardPending,
    duplicateBoard,
    isDuplicateBoardPending,
  } = useDashboard();

  // Lọc tại chỗ theo tên hoặc mã dự án (danh sách đã có đủ trên client).
  const filteredBoards = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return boards;
    return boards.filter(
      b =>
        b.title.toLowerCase().includes(q) ||
        b.boardCode.toLowerCase().includes(q)
    );
  }, [boards, query]);

  const handleCreateBoard = async (data: CreateBoardFormData) => {
    await createBoard({
      title: data.title,
      boardCode: data.boardCode,
      type: 'PUBLIC',
    });
    setIsCreateDialogOpen(false);
  };

  const handleCreateSampleBoard = async (data: CreateBoardFormData) => {
    const newBoard = await createSampleBoard({
      title: data.title,
      boardCode: data.boardCode,
    });
    setIsSampleDialogOpen(false);
    router.push(`/project/${newBoard.id}/issues`);
  };

  const handleDuplicateBoard = async (data: CreateBoardFormData) => {
    if (!duplicateSource) return;
    const newBoard = await duplicateBoard({
      sourceBoardId: duplicateSource.id,
      data: {
        title: data.title,
        boardCode: data.boardCode,
      },
    });
    setDuplicateSource(null);
    router.push(`/project/${newBoard.id}/issues`);
  };

  const hasBoards = !isLoading && !boardListError && boards.length > 0;

  return (
    <Pane
      title={t('dashboard.title')}
      subtitle={
        hasBoards
          ? t('dashboard.projectCount', { count: boards.length })
          : t('dashboard.description')
      }
      actions={
        <>
          {/* Lối vào nhanh cho người chưa quen tool: xem trước một project thật
              trông như thế nào thay vì bắt đầu từ board trống. */}
          <Button
            id="create-sample-board-btn"
            variant="outline"
            size="sm"
            onClick={() => setIsSampleDialogOpen(true)}
          >
            <Sparkles aria-hidden="true" />
            <span className="hidden sm:inline">
              {t('dashboard.createSampleProject')}
            </span>
          </Button>
          <Button
            id="add-new-board-btn"
            variant="primary"
            size="sm"
            onClick={() => setIsCreateDialogOpen(true)}
          >
            <Plus aria-hidden="true" />
            {t('dashboard.addNewProject')}
          </Button>
        </>
      }
    >
      <PaneContent className="flex flex-col gap-6">
        <MyInvitationsBanner />

        {isLoading && <BoardListSkeleton />}

        {boardListError && !isLoading && (
          <EmptyState
            card
            title={t('dashboard.loadFailedTitle')}
            description={t('toast.error.boardLoadFailed')}
            action={
              <Button
                variant="outline"
                size="sm"
                onClick={() => refetchBoardList()}
              >
                <RefreshCw aria-hidden="true" />
                {t('common.retry')}
              </Button>
            }
          />
        )}

        {!isLoading && !boardListError && boards.length === 0 && (
          <EmptyState
            card
            icon={<FolderKanban aria-hidden="true" />}
            title={t('dashboard.empty.title')}
            description={t('dashboard.empty.description')}
            action={
              // Người dùng mới chưa có board nào — đây là chỗ họ cần gợi ý nhất,
              // nên nút project mẫu được đặt làm hành động chính ở đây.
              <div className="flex flex-wrap items-center justify-center gap-2">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => setIsSampleDialogOpen(true)}
                >
                  <Sparkles aria-hidden="true" />
                  {t('dashboard.createSampleProject')}
                </Button>
                <Button
                  variant="outline"
                  size="md"
                  onClick={() => setIsCreateDialogOpen(true)}
                >
                  <Plus aria-hidden="true" />
                  {t('dashboard.addNewProject')}
                </Button>
              </div>
            }
          />
        )}

        {hasBoards && (
          <>
            <div className="relative -mb-2 w-full max-w-[280px]">
              <Search
                aria-hidden="true"
                className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted"
              />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                placeholder={t('dashboard.filterPlaceholder')}
                aria-label={t('dashboard.filterPlaceholder')}
                className="h-[38px] w-full rounded-[10px] border border-transparent bg-track pr-3 pl-9 text-[15px] text-ink transition-[border-color,box-shadow,background-color] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:bg-card focus:shadow-[0_0_0_3px_var(--accent-soft)] focus:outline-none"
              />
            </div>

            {filteredBoards.length === 0 ? (
              <EmptyState
                card
                title={t('dashboard.noMatch', { query: query.trim() })}
                description={t('dashboard.noMatchHint')}
              />
            ) : (
              <BoardList
                boards={filteredBoards}
                onDuplicate={setDuplicateSource}
              />
            )}
          </>
        )}
      </PaneContent>

      <CreateBoardDialog
        open={isCreateDialogOpen}
        onOpenChange={setIsCreateDialogOpen}
        onSubmit={handleCreateBoard}
        isPending={isCreateBoardPending}
      />

      {/* Sample Board Dialog */}
      <SampleBoardDialog
        open={isSampleDialogOpen}
        onOpenChange={setIsSampleDialogOpen}
        onSubmit={handleCreateSampleBoard}
        isPending={isCreateSampleBoardPending}
      />

      {/* Duplicate Board Dialog */}
      <DuplicateBoardDialog
        open={!!duplicateSource}
        sourceTitle={duplicateSource?.title ?? ''}
        onOpenChange={open => {
          if (!open) setDuplicateSource(null);
        }}
        onSubmit={handleDuplicateBoard}
        isPending={isDuplicateBoardPending}
      />
    </Pane>
  );
}
