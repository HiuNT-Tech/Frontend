'use client';

import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Check, ChevronDown, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface FilterPillOption {
  value: string;
  label: React.ReactNode;
  /** Icon nhỏ đứng trước nhãn trong menu (avatar, chấm màu…) */
  icon?: React.ReactNode;
  disabled?: boolean;
}

/** Lấy chữ thuần từ nhãn (có thể là ReactNode) để tìm kiếm và tóm tắt. */
export const nodeToText = (node: React.ReactNode): string => {
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(nodeToText).join(' ').trim();
  if (React.isValidElement<{ children?: React.ReactNode }>(node)) {
    return nodeToText(node.props.children);
  }
  return '';
};

interface FilterPillProps {
  label: string;
  icon?: React.ReactNode;
  options: FilterPillOption[];
  /** Mảng giá trị đã chọn (chọn một thì tối đa 1 phần tử) */
  value: string[];
  onChange: (value: string[]) => void;
  multiple?: boolean;
  /** Ô tìm trong menu (mặc định bật khi > 6 lựa chọn) */
  searchable?: boolean;
  searchPlaceholder?: string;
  disabled?: boolean;
  menuWidth?: number;
  className?: string;
}

/**
 * Viên lọc: trắng viền mảnh khi rỗng, nhuộm accent khi đang lọc, có nút × để bỏ.
 * Menu rơi xuống là lớp nổi (shadow-lift) với các hàng checkbox.
 */
export function FilterPill({
  label,
  icon,
  options,
  value,
  onChange,
  multiple = true,
  searchable,
  searchPlaceholder,
  disabled,
  menuWidth = 256,
  className,
}: FilterPillProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const rootRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const active = value.length > 0;
  const showSearch = searchable ?? options.length > 6;

  useEffect(() => {
    if (!open) return;
    const onDown = (event: MouseEvent | TouchEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.stopPropagation();
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('touchstart', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('touchstart', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  useEffect(() => {
    if (open) {
      setQuery('');
      requestAnimationFrame(() => searchRef.current?.focus());
    }
  }, [open]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      option =>
        nodeToText(option.label).toLowerCase().includes(q) ||
        option.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const summary = useMemo(() => {
    if (!active) return '';
    if (value.length > 2)
      return t('common.selectedCount', { count: value.length });
    return value
      .map(v => {
        const option = options.find(o => o.value === v);
        return option ? nodeToText(option.label) || v : v;
      })
      .join(', ');
  }, [active, options, t, value]);

  const toggle = (optionValue: string) => {
    if (multiple) {
      onChange(
        value.includes(optionValue)
          ? value.filter(v => v !== optionValue)
          : [...value, optionValue]
      );
    } else {
      onChange(value[0] === optionValue ? [] : [optionValue]);
      setOpen(false);
    }
  };

  return (
    <div ref={rootRef} className={cn('relative flex-none', className)}>
      <div
        className={cn(
          'flex h-[34px] items-center overflow-hidden rounded-[10px] transition-colors duration-200 ease-soft',
          active
            ? 'bg-accent-soft text-accent-text'
            : 'bg-card text-ink-2 shadow-[inset_0_0_0_1px_var(--line)]',
          open && !active && 'bg-fill',
          disabled && 'opacity-50'
        )}
      >
        <button
          ref={triggerRef}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="menu"
          onClick={() => setOpen(prev => !prev)}
          className={cn(
            'press inline-flex h-full items-center gap-1.5 whitespace-nowrap pl-3 text-[13.5px] font-medium transition-colors hover:bg-hover [&_svg]:size-[14px] [&_svg]:shrink-0',
            active ? 'pr-2' : 'pr-2.5'
          )}
        >
          {icon}
          {active ? (
            <>
              <span className="opacity-80">{label}:</span>
              <span className="max-w-[170px] truncate font-semibold">
                {summary}
              </span>
            </>
          ) : (
            <>
              {label}
              <ChevronDown
                aria-hidden="true"
                className={cn(
                  'text-muted transition-transform duration-300 ease-soft',
                  open && 'rotate-180'
                )}
              />
            </>
          )}
        </button>
        {active && (
          <button
            type="button"
            onClick={() => onChange([])}
            aria-label={t('common.filter.remove', { label })}
            title={t('common.filter.remove', { label })}
            className="grid h-full w-[30px] place-items-center border-l border-accent-line text-accent-text transition-colors hover:bg-hover"
          >
            <X aria-hidden="true" className="size-3" />
          </button>
        )}
      </div>

      {open && (
        <div
          role="menu"
          style={{ width: menuWidth }}
          className="animate-pop absolute top-[calc(100%+8px)] left-0 z-40 max-w-[calc(100vw-32px)] overflow-hidden rounded-[14px] border border-line bg-card shadow-lift"
        >
          {showSearch && (
            <div className="px-2 pt-2 pb-1.5">
              <label className="flex h-9 items-center gap-2 rounded-[10px] bg-fill px-2.5 text-muted">
                <Search aria-hidden="true" className="size-[14px] flex-none" />
                <input
                  ref={searchRef}
                  value={query}
                  onChange={event => setQuery(event.target.value)}
                  onKeyDown={event => {
                    if (event.key === 'Enter' && filtered[0]) {
                      event.preventDefault();
                      toggle(filtered[0].value);
                    }
                  }}
                  placeholder={
                    searchPlaceholder ?? t('common.searchPlaceholder')
                  }
                  aria-label={
                    searchPlaceholder ?? t('common.searchPlaceholder')
                  }
                  className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none focus-visible:outline-none"
                />
              </label>
            </div>
          )}
          <div className="max-h-[288px] overflow-y-auto p-1.5">
            {filtered.length === 0 ? (
              <p className="px-2 py-3 text-center text-[13.5px] text-muted">
                {t('common.filter.noMatch', { query })}
              </p>
            ) : (
              filtered.map(option => {
                const on = value.includes(option.value);
                return (
                  <button
                    key={option.value}
                    type="button"
                    role="menuitemcheckbox"
                    aria-checked={on}
                    disabled={option.disabled}
                    onClick={() => toggle(option.value)}
                    className="flex h-9 w-full items-center gap-2.5 rounded-[10px] px-2.5 text-left text-sm text-ink transition-colors hover:bg-hover disabled:opacity-45"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        'grid size-[18px] flex-none place-items-center rounded-[6px] transition-colors',
                        on
                          ? 'bg-accent text-on-accent'
                          : 'bg-card shadow-[inset_0_0_0_1.5px_var(--line-strong)]'
                      )}
                    >
                      {on && (
                        <Check className="size-[11px]" strokeWidth={3.4} />
                      )}
                    </span>
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">
                      {option.label}
                    </span>
                  </button>
                );
              })
            )}
          </div>
          {active && (
            <div className="border-t border-line p-1.5">
              <button
                type="button"
                onClick={() => {
                  onChange([]);
                  setOpen(false);
                }}
                className="h-[34px] w-full rounded-[10px] px-2.5 text-left text-[13.5px] font-medium text-muted transition-colors hover:bg-hover hover:text-ink"
              >
                {t('common.filter.clearSelection')}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
