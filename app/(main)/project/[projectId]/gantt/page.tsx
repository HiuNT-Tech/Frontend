'use client';

import { Suspense } from 'react';
import { useParams } from 'next/navigation';
import { GanttWorkspace } from '@/components/gantt/gantt-workspace';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { IssueDetail } from '../issues/[id]/issue-detail';

/** Tab Gantt: route riêng như Board; chi tiết issue mở ở cột phải qua `?issue=<id>`. */
export default function GanttPage() {
  const params = useParams<{ projectId: string }>();
  const boardId = toEntityIdOrUndefined(params?.projectId);

  return (
    <Suspense fallback={null}>
      <GanttWorkspace
        renderInspector={(cardId, close) => (
          <IssueDetail boardId={boardId} cardId={cardId} onClose={close} />
        )}
      />
    </Suspense>
  );
}
