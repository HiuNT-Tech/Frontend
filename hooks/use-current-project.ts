'use client';

import { useParams } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { BoardService } from '@/lib/apis/board';
import { useAppSelector } from '@/redux/hooks';
import { selectCurrentActiveBoard } from '@/redux/activeBoard/activeBoardSlice';

/**
 * Dự án đang mở (theo `/project/:projectId`) lấy từ cache danh sách dự án
 * (cùng key với Dashboard / sidebar), dự phòng bằng board đang active trong Redux.
 * Dùng cho tiêu đề phụ của toolbar: mã dự án, tên dự án.
 */
export function useCurrentProject() {
  const params = useParams<{ projectId?: string }>();
  const projectId = params?.projectId;
  const activeBoard = useAppSelector(selectCurrentActiveBoard);

  const { data, isLoading } = useQuery({
    queryKey: ['dashboard-boards'],
    queryFn: () => BoardService.getBoard(),
    staleTime: 30 * 1000,
  });

  const fromList = data?.items.find(board => String(board.id) === projectId);
  const fromRedux =
    activeBoard && String(activeBoard.id) === projectId
      ? activeBoard
      : undefined;
  const project = fromList ?? fromRedux;

  return {
    projectId,
    project,
    title: project?.title,
    code: project?.boardCode,
    isLoading,
  };
}
