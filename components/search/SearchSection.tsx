'use client';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useTranslation } from 'react-i18next';
import { ChevronDown, Search, SlidersHorizontal, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { TimePicker } from '@/components/ui/time-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import { Button } from '@/components/ui/button';
import { useSearchForm } from '@/hooks/use-search-form';
import type { SearchSectionConfig, SearchField } from '@/types/search-section';
import { FilterPill, type FilterPillOption } from './filter-pill';

const TEXT_DEBOUNCE_MS = 350;

const isEmpty = (value: unknown): boolean => {
  if (value === undefined || value === null || value === '') return true;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') {
    return Object.values(value as Record<string, unknown>).every(isEmpty);
  }
  return false;
};

const toArray = (value: unknown): string[] =>
  Array.isArray(value)
    ? value.map(String).filter(Boolean)
    : value
      ? [String(value)]
      : [];

/** Thanh lọc: ô text đầu tiên + select/multiOptions nằm trên thanh, còn lại gập vào "Thêm bộ lọc". */
const placementOf = (field: SearchField, firstTextId?: string) => {
  if (field.placement) return field.placement;
  if (field.type === 'text')
    return field.id === firstTextId ? 'bar' : 'advanced';
  if (field.type === 'select' || field.type === 'multiOptions') return 'bar';
  return 'advanced';
};

/**
 * Thanh lọc yên tĩnh dùng chung cho mọi danh sách: ô tìm kiếm, các viên lọc
 * (nhuộm accent khi đang lọc), nút "Thêm bộ lọc" mở bảng gập cho các trường còn lại
 * và nút xoá. Giá trị vẫn đồng bộ URL qua `useSearchForm` như trước.
 */
export const SearchSection = ({
  fields,
  onSearch,
  onReset,
  onFieldChange,
  searchButtonText,
  resetButtonText,
  title,
  syncWithUrl = true,
  urlParamsPrefix = '',
  triggerSearchOnMount = true,
  summary,
  applyOnChange = true,
  className,
}: SearchSectionConfig) => {
  const { t } = useTranslation();
  const searchParams = useSearchParams();
  const { values, handleChange, handleRangeChange, handleSearch, handleReset } =
    useSearchForm({
      fields,
      onSearch,
      onReset,
      syncWithUrl,
      urlParamsPrefix,
      triggerSearchOnMount,
    });

  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [applyTick, setApplyTick] = useState(0);
  const handleSearchRef = useRef(handleSearch);
  handleSearchRef.current = handleSearch;
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Áp dụng sau khi state đã cập nhật (setValues + setApplyTick cùng một batch).
  useEffect(() => {
    if (applyTick === 0) return;
    handleSearchRef.current();
  }, [applyTick]);

  useEffect(
    () => () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    },
    []
  );

  const apply = useCallback(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
      debounceRef.current = null;
    }
    setApplyTick(tick => tick + 1);
  }, []);

  const applyDebounced = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      debounceRef.current = null;
      setApplyTick(tick => tick + 1);
    }, TEXT_DEBOUNCE_MS);
  }, []);

  const setField = useCallback(
    (field: SearchField, value: unknown, mode: 'now' | 'debounce') => {
      handleChange(field.id, value);
      onFieldChange?.(field.id, value);
      if (!applyOnChange) return;
      if (mode === 'now') apply();
      else applyDebounced();
    },
    [apply, applyDebounced, applyOnChange, handleChange, onFieldChange]
  );

  const firstTextId = fields.find(field => field.type === 'text')?.id;
  const barFields = fields.filter(
    field => placementOf(field, firstTextId) === 'bar'
  );
  const advancedFields = fields.filter(
    field => placementOf(field, firstTextId) === 'advanced'
  );
  const searchField = barFields.find(field => field.type === 'text');
  const barPills = barFields.filter(field => field.type !== 'text');

  const activeCount = fields.filter(field => !isEmpty(values[field.id])).length;
  const advancedActiveCount = advancedFields.filter(
    field => !isEmpty(values[field.id])
  ).length;

  // Ô tìm kiếm theo URL: sidebar đẩy `?search=…` khi pane đã mount → nhận và áp dụng.
  // Bỏ qua giá trị do chính mình vừa ghi lên URL để không ghi đè lúc đang gõ.
  const paramKey = searchField
    ? urlParamsPrefix
      ? `${urlParamsPrefix}_${searchField.id}`
      : searchField.id
    : undefined;
  const urlSearchValue = paramKey ? (searchParams.get(paramKey) ?? '') : '';
  const lastSeenUrlValue = useRef(urlSearchValue);
  useEffect(() => {
    if (!searchField || !syncWithUrl) return;
    if (lastSeenUrlValue.current === urlSearchValue) return;
    lastSeenUrlValue.current = urlSearchValue;
    const current = String(values[searchField.id] ?? '');
    if (current === urlSearchValue) return;
    handleChange(searchField.id, urlSearchValue);
    apply();
    // Chỉ chạy khi giá trị trên URL đổi.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [urlSearchValue]);

  const pillOptions = (field: SearchField): FilterPillOption[] =>
    field.type === 'select' || field.type === 'multiOptions'
      ? (field.options ?? []).map(option => ({
          value: String(option.value),
          label: option.label,
          disabled: option.disabled,
        }))
      : [];

  const renderPill = (field: SearchField) => {
    const multiple =
      field.type === 'multiOptions' ||
      (field.type === 'select' && Boolean(field.selectMulti));
    const placeholder =
      field.type === 'select' || field.type === 'multiOptions'
        ? field.props?.placeholder
        : undefined;
    return (
      <FilterPill
        key={field.id}
        label={field.label ?? field.id}
        icon={field.icon}
        options={pillOptions(field)}
        multiple={multiple}
        value={toArray(values[field.id])}
        searchPlaceholder={placeholder}
        onChange={next => {
          const value = multiple ? next : (next[0] ?? '');
          setField(field, value, 'now');
        }}
      />
    );
  };

  const renderAdvancedField = (field: SearchField) => {
    switch (field.type) {
      case 'text':
        return (
          <Input
            label={field.label}
            required={field.required}
            value={values[field.id] || ''}
            onChange={event => setField(field, event.target.value, 'debounce')}
            onKeyDown={event => {
              if (event.key === 'Enter') apply();
            }}
            {...field.props}
          />
        );
      case 'select':
      case 'multiOptions':
        return (
          <div className="flex flex-col gap-1">
            {field.label && (
              <span className="text-[13px] font-semibold text-ink-2">
                {field.label}
              </span>
            )}
            <div className="flex">{renderPill(field)}</div>
          </div>
        );
      case 'date':
        return (
          <DatePicker
            label={field.label}
            required={field.required}
            value={values[field.id] || ''}
            onChange={event => setField(field, event.target.value, 'now')}
            {...field.props}
          />
        );
      case 'time':
        return (
          <TimePicker
            label={field.label}
            required={field.required}
            value={values[field.id] || ''}
            onChange={event => setField(field, event.target.value, 'now')}
            {...field.props}
          />
        );
      case 'dateRange':
      case 'timeRange': {
        const Picker =
          field.type === 'dateRange' ? DateRangePicker : TimeRangePicker;
        const onPart = (part: 'start' | 'end', value: string) => {
          handleRangeChange(field.id, part, value);
          onFieldChange?.(field.id, {
            ...(values[field.id] || {}),
            [part]: value,
          });
          if (applyOnChange) apply();
        };
        return (
          <Picker
            label={field.label}
            required={field.required}
            startProps={{
              value: values[field.id]?.start || '',
              onChange: event => onPart('start', event.target.value),
            }}
            endProps={{
              value: values[field.id]?.end || '',
              onChange: event => onPart('end', event.target.value),
            }}
            {...field.props}
          />
        );
      }
      default:
        return null;
    }
  };

  return (
    <div
      role="search"
      aria-label={title || t('common.searchTitle')}
      className={cn('flex min-w-0 flex-col gap-2.5', className)}
    >
      <div className="flex min-h-[34px] flex-wrap items-center gap-2">
        {searchField && (
          <label
            className={cn(
              'flex h-[34px] min-w-[200px] flex-[0_1_340px] items-center gap-2 rounded-[10px] bg-card pr-1.5 pl-3 text-muted shadow-[inset_0_0_0_1px_var(--line)] transition-shadow focus-within:shadow-[inset_0_0_0_1px_var(--accent),0_0_0_3px_var(--accent-soft)]'
            )}
          >
            <Search aria-hidden="true" className="size-[15px] flex-none" />
            <input
              type="search"
              enterKeyHint="search"
              value={values[searchField.id] || ''}
              onChange={event =>
                setField(searchField, event.target.value, 'debounce')
              }
              onKeyDown={event => {
                if (event.key === 'Enter') {
                  event.preventDefault();
                  apply();
                } else if (event.key === 'Escape' && values[searchField.id]) {
                  setField(searchField, '', 'now');
                }
              }}
              placeholder={
                searchField.props?.placeholder ?? t('common.searchPlaceholder')
              }
              aria-label={searchField.label ?? t('common.search')}
              className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none [&::-webkit-search-cancel-button]:appearance-none focus-visible:outline-none"
            />
            {values[searchField.id] ? (
              <button
                type="button"
                onClick={() => setField(searchField, '', 'now')}
                aria-label={t('shell.clearSearch')}
                className="grid size-6 flex-none place-items-center rounded-full bg-fill text-muted hover:text-ink"
              >
                <X aria-hidden="true" className="size-3" />
              </button>
            ) : null}
          </label>
        )}

        {barPills.map(renderPill)}

        {advancedFields.length > 0 && (
          <button
            type="button"
            aria-expanded={advancedOpen}
            onClick={() => setAdvancedOpen(open => !open)}
            className={cn(
              'press inline-flex h-[34px] items-center gap-1.5 rounded-[10px] px-3 text-[13.5px] font-medium transition-colors',
              advancedActiveCount > 0
                ? 'bg-accent-soft text-accent-text'
                : advancedOpen
                  ? 'bg-fill text-ink'
                  : 'text-muted hover:bg-hover hover:text-ink'
            )}
          >
            <SlidersHorizontal aria-hidden="true" className="size-[14px]" />
            {t('common.filter.more')}
            {advancedActiveCount > 0 && (
              <span className="grid h-[18px] min-w-[18px] place-items-center rounded-full bg-accent px-1.5 text-[11px] font-semibold text-on-accent tabular-nums">
                {advancedActiveCount}
              </span>
            )}
            <ChevronDown
              aria-hidden="true"
              className={cn(
                'size-3 transition-transform duration-300 ease-soft',
                advancedOpen && 'rotate-180'
              )}
            />
          </button>
        )}

        <div className="min-w-2 flex-1" />

        {!applyOnChange && (
          <>
            <Button variant="outline" size="sm" onClick={handleReset}>
              {resetButtonText || t('common.reset')}
            </Button>
            <Button size="sm" onClick={apply}>
              <Search aria-hidden="true" />
              {searchButtonText || t('common.search')}
            </Button>
          </>
        )}
        {applyOnChange && activeCount > 0 && (
          <Button
            variant="ghost"
            size="sm"
            onClick={handleReset}
            className="text-muted"
          >
            {resetButtonText || t('common.filter.clear')}
          </Button>
        )}
        {summary && (
          <span className="whitespace-nowrap text-[13.5px] text-muted tabular-nums">
            {summary}
          </span>
        )}
      </div>

      {advancedOpen && advancedFields.length > 0 && (
        <div className="animate-pop grid gap-3 rounded-card border border-line bg-card p-4 shadow-card [grid-template-columns:repeat(auto-fill,minmax(min(100%,220px),1fr))]">
          {advancedFields.map(field => (
            <div key={field.id} className="min-w-0">
              {renderAdvancedField(field)}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
