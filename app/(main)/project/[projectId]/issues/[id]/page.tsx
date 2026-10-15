'use client';

import { useCallback } from 'react';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useIssueInspector } from '@/components/issues/issue-inspector';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { IssueDetail } from './issue-detail';

/**
 * Route chi tiết issue: chỉ đọc param rồi giao cho `IssueDetail`. Trang này được
 * layout Issues hiển thị trong inspector (cột phải / panel trượt); đóng = về danh sách.
 */
export default function IssueDetailPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const inspector = useIssueInspector();

  const cardId = toEntityIdOrUndefined(params.id as string);
  const boardId =
    toEntityIdOrUndefined(params.projectId as string) ??
    toEntityIdOrUndefined(searchParams.get('boardId'));

  const inspectorClose = inspector?.close;
  const handleClose = useCallback(() => {
    if (inspectorClose) inspectorClose();
    else if (boardId) router.push(`/project/${boardId}/issues`);
    else router.back();
  }, [inspectorClose, boardId, router]);

  return (
    <IssueDetail boardId={boardId} cardId={cardId} onClose={handleClose} />
  );
}
