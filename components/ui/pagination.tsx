'use client';
import React from 'react';
import { Button } from './button';
import { ChevronDown, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTranslation } from 'react-i18next';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems: number;
  itemsPerPage: number;
  onItemsPerPageChange?: (itemsPerPage: number) => void;
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
}: PaginationProps) {
  const startItem = totalItems === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const { t } = useTranslation();
  const [showPerPageDropdown, setShowPerPageDropdown] = React.useState(false);
  const perPageOptions = React.useMemo(() => [10, 15, 20], []);

  const handlePerPageChange = (newPerPage: number) => {
    onItemsPerPageChange?.(newPerPage);
    onPageChange(1);
    setShowPerPageDropdown(false);
  };
  const getVisiblePages = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push('...');
        for (let i = totalPages - 3; i <= totalPages; i++) {
          pages.push(i);
        }
      } else {
        pages.push(1);
        pages.push('...');
        for (let i = currentPage - 1; i <= currentPage + 1; i++) {
          pages.push(i);
        }
        pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="flex w-full flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-2.5">
      <div className="flex items-center gap-3">
        <div className="flex items-center text-[13px] text-muted tabular-nums">
          <span className="font-semibold text-ink">
            {startItem}-{endItem}
          </span>
          <span className="mx-1">{t('common.of')}</span>
          <span>{totalItems}</span>
        </div>
        <div className="h-5 w-px bg-line" />
        {totalPages > 1 && (
          <>
            <Button
              variant="ghost"
              size="sm"
              className="size-8 rounded-[9px] p-0 text-ink-2"
              aria-label="Previous page"
              onClick={() => onPageChange(currentPage - 1)}
              disabled={currentPage === 1}
            >
              <ChevronLeft aria-hidden="true" />
            </Button>

            {getVisiblePages().map((page, index) => (
              <div key={index}>
                {page === '...' ? (
                  <span className="px-2 py-1 text-faint">…</span>
                ) : (
                  <Button
                    variant={currentPage === page ? 'outline' : 'ghost'}
                    size="sm"
                    aria-current={currentPage === page ? 'page' : undefined}
                    className={cn(
                      'h-8 min-w-8 rounded-[9px] px-2 text-[13px] tabular-nums',
                      currentPage === page ? 'text-ink' : 'text-muted'
                    )}
                    onClick={() => onPageChange(page as number)}
                  >
                    {page}
                  </Button>
                )}
              </div>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="size-8 rounded-[9px] p-0 text-ink-2"
              aria-label="Next page"
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
            >
              <ChevronRight aria-hidden="true" />
            </Button>
          </>
        )}
      </div>

      <div className="flex items-center gap-3">
        <div className="flex items-center gap-2 text-[13px] text-muted">
          <span>{t('common.rowsPerPage')}</span>
          <div className="relative">
            <button
              type="button"
              className="press flex h-8 min-w-[68px] items-center justify-between gap-2 rounded-[9px] border border-line bg-card px-2.5 text-[13px] text-ink shadow-hair transition-colors hover:bg-fill"
              aria-haspopup="listbox"
              aria-expanded={showPerPageDropdown}
              onClick={() => setShowPerPageDropdown(prev => !prev)}
            >
              <span className="font-semibold tabular-nums">
                {itemsPerPage || 10}
              </span>
              <ChevronDown className="size-4 text-muted" aria-hidden="true" />
            </button>
            {showPerPageDropdown && (
              <div className="animate-pop absolute right-0 bottom-full z-50 mb-2 w-28 overflow-hidden rounded-[14px] border border-line bg-card p-1 shadow-lift">
                {perPageOptions.map(option => (
                  <button
                    key={option}
                    type="button"
                    onClick={() => handlePerPageChange(option)}
                    className={cn(
                      'flex w-full items-center justify-between rounded-[10px] px-3 py-2 text-sm text-ink tabular-nums hover:bg-fill',
                      (itemsPerPage || 10) === option && 'font-semibold'
                    )}
                  >
                    <span>{option}</span>
                    {(itemsPerPage || 10) === option && (
                      <span className="text-accent">•</span>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
