'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';
import { Pagination } from './pagination';
import { useTranslation } from 'react-i18next';
import { StateMessage } from './state-message';

export interface TableColumn<T = any> {
  key: string;
  title: string | React.ReactNode;
  dataIndex?: keyof T;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  width?: string | number;
  minWidth?: string | number;
  maxWidth?: string | number;
  align?: 'left' | 'center' | 'right';
  sortable?: boolean;
  className?: string;
  children?: TableColumn<T>[];
}

export interface CustomTableProps<T = any> {
  columns: TableColumn<T>[];
  dataSource: T[];
  loading?: boolean;
  error?: boolean;
  rowKey?: string | ((record: T) => string);
  className?: string;
  maxHeight?: string;
  /**
   * Enable horizontal scroll only within the table.
   * When true, the table will have its own horizontal scrollbar
   * instead of affecting the entire page layout.
   * This is useful when you have many columns and want to prevent text wrapping.
   */
  horizontalScroll?: boolean;

  // Pagination props
  pagination?:
    | {
        current?: number;
        total?: number;
        pageSize?: number;
        showSizeChanger?: boolean;
        showQuickJumper?: boolean;
        showTotal?: boolean;
        rightAreaRender?: () => React.ReactNode;
        onChange?: (page: number, pageSize?: number) => void;
        onShowSizeChange?: (size: number) => void;
      }
    | false;

  // Loading and error states
  emptyText?: React.ReactNode;
  loadingText?: React.ReactNode;
  errorText?: React.ReactNode;
  onRetry?: () => void;

  // Row props
  onRow?: (
    record: T,
    index: number
  ) => {
    onClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
    onDoubleClick?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
    onContextMenu?: (event: React.MouseEvent<HTMLTableRowElement>) => void;
    className?: string;
  };
  actions?: {
    icon: string;
    title: string;
    onClick: (record: T, index: number) => void;
    key?: string | number;
    disabled?: boolean | ((record: T, index: number) => boolean);
    hidden?: (record: T, index: number) => boolean;
  }[];
}

const TableLoading: React.FC<{ text: React.ReactNode }> = ({ text }) => (
  <StateMessage
    variant="block"
    spinner
    className="py-16 text-muted"
    textClassName="mt-1"
  >
    {text}
  </StateMessage>
);

const TableLoadingOverlay: React.FC<{ text: React.ReactNode }> = ({ text }) => (
  <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-card/60">
    <StateMessage
      variant="block"
      spinner
      className="py-0 text-muted"
      textClassName="mt-1"
    >
      {text}
    </StateMessage>
  </div>
);

const TableError: React.FC<{
  text: React.ReactNode;
  retryText: string;
  onRetry?: () => void;
}> = ({ text, retryText, onRetry }) => (
  <div className="flex flex-col items-center justify-center py-16">
    <StateMessage as="p" tone="danger" className="mb-4">
      {text}
    </StateMessage>
    {onRetry && (
      <button
        onClick={onRetry}
        className="press h-[38px] rounded-xl bg-accent px-4 text-sm font-semibold text-on-accent transition-colors hover:bg-accent-hover"
      >
        {retryText}
      </button>
    )}
  </div>
);

const TableEmpty: React.FC<{ text: React.ReactNode }> = ({ text }) => (
  <StateMessage variant="block" className="py-16 text-muted">
    {text}
  </StateMessage>
);

const IconButton = ({
  src,
  onClick,
  title,
  disabled = false,
}: {
  src: string;
  onClick: () => void;
  title: string;
  disabled?: boolean;
}) => {
  return (
    <button
      onClick={e => {
        e.stopPropagation();
        if (!disabled) {
          onClick();
        }
      }}
      disabled={disabled}
      className={cn(
        'press inline-flex size-8 items-center justify-center rounded-[9px] transition-colors',
        disabled
          ? 'cursor-not-allowed opacity-50'
          : 'cursor-pointer hover:bg-hover'
      )}
      title={title}
    >
      <Image
        src={src}
        alt={title}
        width={20}
        height={20}
        className="icon-accent h-[18px] w-[18px]"
      />
    </button>
  );
};

const CustomTable = <T extends Record<string, any>>({
  columns,
  dataSource,
  loading = false,
  error = false,
  rowKey = 'id',
  className,

  pagination,
  emptyText,
  loadingText,
  errorText,
  onRetry,
  onRow,
  maxHeight,
  horizontalScroll = true,
  actions,
}: CustomTableProps<T>) => {
  const { t } = useTranslation();
  const resolvedLoadingText = loadingText ?? t('common.loading');
  const resolvedErrorText = errorText ?? t('common.errorLoadingData');
  const resolvedEmptyText = emptyText ?? t('common.noMatchingResults');
  const retryText = t('common.retry');
  const getRowKey = React.useCallback(
    (record: T, index: number): string => {
      if (typeof rowKey === 'function') {
        return String(rowKey(record));
      }
      return String(record[rowKey] ?? index);
    },
    [rowKey]
  );

  // Check if action column should be shown
  const hasActions = actions && actions.length > 0;
  // Create computed columns with action column if needed
  const computedColumns = React.useMemo(() => {
    if (!hasActions) return columns;

    return [
      ...columns,
      {
        key: 'actions',
        title: t('common.actions'),
        minWidth: '60px',
        align: 'center' as const,
        render: (value: any, record: T, index: number) => (
          <div className="flex items-center justify-center gap-2">
            {actions
              .filter(action => !action.hidden?.(record, index))
              .map((action, actionIndex) => {
                const isDisabled =
                  typeof action.disabled === 'function'
                    ? action.disabled(record, index)
                    : (action.disabled ?? false);
                return (
                  <IconButton
                    key={action.key ?? `${action.title}-${actionIndex}`}
                    src={action.icon}
                    onClick={() => action.onClick?.(record, index)}
                    title={action.title}
                    disabled={isDisabled}
                  />
                );
              })}
          </div>
        ),
      } as TableColumn<T>,
    ];
  }, [columns, hasActions, actions, t]);

  // Helper function to flatten columns (get all leaf columns)
  const flattenColumns = (cols: TableColumn<T>[]): TableColumn<T>[] => {
    const result: TableColumn<T>[] = [];
    cols.forEach(col => {
      if (col.children && col.children.length > 0) {
        result.push(...flattenColumns(col.children));
      } else {
        result.push(col);
      }
    });
    return result;
  };

  // Helper function to check if there are nested columns
  const hasNestedColumns = (cols: TableColumn<T>[]): boolean => {
    return cols.some(col => col.children && col.children.length > 0);
  };

  // Get flattened columns for rendering data rows
  const flattenedColumns = React.useMemo(
    () => flattenColumns(computedColumns),
    [computedColumns]
  );

  // Check if we have nested structure
  const isNested = React.useMemo(
    () => hasNestedColumns(computedColumns),
    [computedColumns]
  );

  return (
    <div
      className="flex flex-col gap-4"
      style={horizontalScroll ? { width: '100%', minWidth: 0 } : undefined}
    >
      <div
        className={cn(
          'overflow-hidden rounded-card border border-line bg-card shadow-card',
          className
        )}
        style={
          horizontalScroll ? { width: '100%', maxWidth: '100%' } : undefined
        }
      >
        {/* Table */}
        <div
          className={cn(
            'overflow-x-auto relative',
            horizontalScroll && 'table-horizontal-scroll'
          )}
        >
          <table
            className="border-collapse"
            style={
              horizontalScroll
                ? { width: 'max-content', minWidth: '100%' }
                : { width: '100%' }
            }
          >
            <thead>
              {isNested ? (
                <>
                  <tr>
                    {computedColumns.map(column => {
                      if (column.children && column.children.length > 0) {
                        return column.children.map((child, childIndex) => (
                          <th
                            key={child.key}
                            className={cn(
                              'relative border-b border-line px-4 py-2.5 text-[12.5px] font-semibold whitespace-break-spaces text-muted',
                              horizontalScroll
                                ? 'whitespace-nowrap'
                                : 'whitespace-break-spaces',
                              child.align === 'left' && 'text-left',
                              child.align === 'center' && 'text-center',
                              child.align === 'right' && 'text-right',
                              child.width && `w-[${child.width}]`,
                              child.minWidth && `min-w-[${child.minWidth}]`,
                              child.maxWidth && `max-w-[${child.maxWidth}]`,
                              child.className
                            )}
                            style={{
                              width: child.width,
                              minWidth: horizontalScroll
                                ? child.minWidth || child.width
                                : undefined,
                            }}
                          >
                            {child.title}
                          </th>
                        ));
                      }
                      return null;
                    })}
                  </tr>
                </>
              ) : (
                <tr>
                  {computedColumns.map((column, index) => (
                    <th
                      key={column.key}
                      className={cn(
                        'relative border-b border-line px-4 py-2.5 text-[12.5px] font-semibold whitespace-break-spaces text-muted',
                        horizontalScroll
                          ? 'whitespace-nowrap'
                          : 'whitespace-break-spaces',
                        column.align === 'left' && 'text-left',
                        column.align === 'center' && 'text-center',
                        column.align === 'right' && 'text-right',
                        column.width && `w-[${column.width}]`,
                        column.minWidth && `min-w-[${column.minWidth}]`,
                        column.maxWidth && `max-w-[${column.maxWidth}]`,
                        column.className
                      )}
                      style={{
                        width: column.width,
                        minWidth: column.minWidth || column.width,
                      }}
                    >
                      {column.title}
                    </th>
                  ))}
                </tr>
              )}
            </thead>

            <tbody
              className={cn(
                maxHeight && `max-h-[${maxHeight}] overflow-y-auto`
              )}
              style={maxHeight ? { maxHeight } : undefined}
            >
              {loading && dataSource.length === 0 ? (
                <tr>
                  <td colSpan={flattenedColumns.length}>
                    <TableLoading text={resolvedLoadingText} />
                  </td>
                </tr>
              ) : error ? (
                <tr>
                  <td colSpan={flattenedColumns.length}>
                    <TableError
                      text={resolvedErrorText}
                      retryText={retryText}
                      onRetry={onRetry}
                    />
                  </td>
                </tr>
              ) : dataSource.length === 0 ? (
                <tr>
                  <td colSpan={flattenedColumns.length}>
                    <TableEmpty text={resolvedEmptyText} />
                  </td>
                </tr>
              ) : (
                dataSource.map((record, index) => {
                  const recordKey = getRowKey(record, index);
                  const rowProps = onRow?.(record, index) || {};

                  const hasClick = Boolean(rowProps.onClick);
                  return (
                    <tr
                      key={`${recordKey}-${index}`}
                      className={cn(
                        'border-b border-line transition-colors last:border-b-0 hover:bg-fill/70',
                        rowProps.className,
                        hasClick && 'cursor-pointer'
                      )}
                      onClick={rowProps.onClick}
                      onDoubleClick={rowProps.onDoubleClick}
                      onContextMenu={rowProps.onContextMenu}
                    >
                      {flattenedColumns.map((column, colIndex) => {
                        const value = column.dataIndex
                          ? record[column.dataIndex]
                          : record;
                        const cellContent = column.render
                          ? column.render(value, record, index)
                          : value;

                        return (
                          <td
                            key={column.key}
                            className={cn(
                              'px-4 py-3 text-sm text-ink',
                              horizontalScroll && 'whitespace-nowrap',
                              column.align === 'center' && 'text-center',
                              column.align === 'right' && 'text-right',
                              column.className
                            )}
                            style={{
                              minWidth: horizontalScroll
                                ? column.minWidth || column.width
                                : undefined,
                            }}
                          >
                            {cellContent as React.ReactNode}
                          </td>
                        );
                      })}
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          {loading && dataSource.length > 0 && (
            <TableLoadingOverlay text={resolvedLoadingText} />
          )}
        </div>

        {pagination && !loading && !error && dataSource.length > 0 && (
          <div className="border-t border-line">
            <Pagination
              currentPage={pagination.current || 1}
              totalPages={Math.ceil(
                (pagination.total || 0) / (pagination.pageSize || 10)
              )}
              totalItems={pagination.total || 0}
              itemsPerPage={pagination.pageSize || 10}
              onPageChange={page =>
                pagination.onChange?.(page, pagination.pageSize || 10)
              }
              onItemsPerPageChange={pagination?.onShowSizeChange || (() => {})}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export { CustomTable };
