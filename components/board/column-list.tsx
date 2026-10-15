'use client';

import { memo, useMemo } from 'react';
import {
  SortableContext,
  horizontalListSortingStrategy,
} from '@dnd-kit/sortable';

import { Column } from './column';
import type { Column as ColumnType } from '@/config/interface';
import { toColumnDndId } from '@/utils/board-dnd';
interface ColumnListProps {
  columns: ColumnType[];
}

/** Dải cột cuộn ngang trong pane; mỗi cột tự cuộn dọc, cao tối đa bằng vùng này. */
function ColumnListBase({ columns }: ColumnListProps) {
  const columnIds = useMemo(
    () => columns?.map(c => toColumnDndId(c.id)) || [],
    [columns]
  );

  return (
    <SortableContext items={columnIds} strategy={horizontalListSortingStrategy}>
      <div className="flex h-full w-full items-start gap-3.5 overflow-x-auto overflow-y-hidden px-4 pb-5 lg:px-5">
        {columns?.map(column => (
          <Column key={column.id} column={column} />
        ))}
      </div>
    </SortableContext>
  );
}

export const ColumnList = memo(ColumnListBase);
