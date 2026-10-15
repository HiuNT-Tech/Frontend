'use client';

import React, { useState, useMemo } from 'react';
import { Check, Search } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import { cn } from '@/lib/utils';
import { StateMessage } from './state-message';

export interface MultiOptionsListOption {
  value: string;
  label: React.ReactNode;
  disabled?: boolean;
}

export interface MultiOptionsListProps {
  label?: string;
  options: MultiOptionsListOption[];
  value?: string[];
  onChange?: (value: string[]) => void;
  placeholder?: string;
  unselectLabel?: string;
  listHeight?: number;
  showSearch?: boolean;
  className?: string;
}

const getNodeText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') {
    return String(node).toLowerCase();
  }
  if (Array.isArray(node)) {
    return node.map(getNodeText).join(' ').trim();
  }
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return getNodeText(node.props.children);
  }
  return '';
};

/** Danh sách chọn nhiều: ô tìm kiếm + các hàng bật/tắt, hàng đã chọn tô accent nhạt với dấu tick. */
export const MultiOptionsList: React.FC<MultiOptionsListProps> = ({
  label,
  options,
  value = [],
  onChange,
  placeholder,
  unselectLabel,
  listHeight = 160,
  showSearch = true,
  className,
}) => {
  const { t } = useTranslation();
  const [search, setSearch] = useState('');
  const resolvedPlaceholder = placeholder ?? t('common.searchPlaceholder');
  const resolvedUnselectLabel = unselectLabel ?? t('common.unselect');

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = search.trim().toLowerCase();
    return options.filter(opt => {
      const labelText = getNodeText(opt.label);
      const valueText = String(opt.value).toLowerCase();
      return labelText.includes(query) || valueText.includes(query);
    });
  }, [options, search]);

  const selectedCount = value.length;

  const handleToggle = (optValue: string) => {
    if (value.includes(optValue)) {
      onChange?.(value.filter(v => v !== optValue));
    } else {
      onChange?.([...value, optValue]);
    }
  };

  const handleUnselectAll = () => {
    onChange?.([]);
  };

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Header: label + count + unselect */}
      {(label || selectedCount > 0) && (
        <div className="mb-1.5 flex min-h-5 items-center gap-2">
          {label && (
            <span className="text-[13px] font-semibold text-ink-2">
              {label}
            </span>
          )}
          {selectedCount > 0 && (
            <>
              <span className="inline-flex min-w-5 items-center justify-center rounded-full bg-accent-soft px-1.5 py-0.5 text-[11px] font-semibold leading-none text-accent-text tabular-nums">
                {selectedCount}
              </span>
              <button
                type="button"
                onClick={handleUnselectAll}
                className="cursor-pointer text-[13px] font-semibold text-accent transition-colors hover:text-accent-hover"
              >
                {resolvedUnselectLabel}
              </button>
            </>
          )}
        </div>
      )}

      {/* Search input */}
      {showSearch && (
        <div className="relative mb-1.5">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted"
          />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder={resolvedPlaceholder}
            className="h-9 w-full rounded-[10px] border border-line bg-card pl-8 pr-2.5 text-sm text-ink outline-none transition-[border-color,box-shadow] duration-200 ease-soft placeholder:text-faint focus:border-accent focus:shadow-[0_0_0_3px_var(--accent-soft)]"
          />
        </div>
      )}

      {/* Options list */}
      <div
        role="listbox"
        aria-multiselectable="true"
        className="overflow-y-auto rounded-[10px] border border-line bg-card"
        style={{ height: listHeight }}
      >
        {filteredOptions.length === 0 ? (
          <StateMessage
            i18nKey="common.noOptions"
            className="px-3 py-2 text-center text-faint"
          />
        ) : (
          filteredOptions.map(opt => {
            const isSelected = value.includes(opt.value);
            return (
              <div
                key={opt.value}
                role="option"
                aria-selected={isSelected}
                aria-disabled={opt.disabled || undefined}
                onClick={() => !opt.disabled && handleToggle(opt.value)}
                className={cn(
                  'flex cursor-pointer select-none items-center gap-2 px-3 py-2 text-sm transition-colors',
                  isSelected
                    ? 'bg-accent-soft font-medium text-accent-text'
                    : 'text-ink hover:bg-hover',
                  opt.disabled && 'cursor-not-allowed opacity-50'
                )}
              >
                <span className="min-w-0 flex-1 truncate">{opt.label}</span>
                {isSelected && (
                  <Check aria-hidden="true" className="size-3.5 flex-none" />
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
