import type { InputProps } from '@/components/ui/input';
import type { SelectProps } from '@/components/ui/select';
import type { DatePickerProps } from '@/components/ui/date-picker';
import type { TimePickerProps } from '@/components/ui/time-picker';
import type { DateRangePickerProps } from '@/components/ui/date-range-picker';
import type { TimeRangePickerProps } from '@/components/ui/time-range-picker';
import type { MultiOptionsListProps } from '@/components/ui/multi-options-list';

export type SearchFieldType =
  | 'text'
  | 'select'
  | 'multiOptions'
  | 'date'
  | 'time'
  | 'dateRange'
  | 'timeRange';

export interface BaseSearchField {
  id: string;
  type: SearchFieldType;
  label?: string;
  required?: boolean;
  defaultValue?: any;
  /** Số cột grid mà field chiếm; 'full' để chiếm hết chiều rộng hàng */
  colSpan?: number | 'full';
  /**
   * Vị trí trên thanh lọc: 'bar' = ngay trên thanh (ô tìm kiếm / viên lọc),
   * 'advanced' = trong bảng "Thêm bộ lọc" gập được.
   * Mặc định: ô text đầu tiên + select/multiOptions nằm trên thanh, còn lại vào advanced.
   */
  placement?: 'bar' | 'advanced';
  /** Icon nhỏ đứng trước nhãn của viên lọc */
  icon?: React.ReactNode;
}

export interface TextSearchField extends BaseSearchField {
  type: 'text';
  props?: Omit<InputProps, 'label' | 'required'>;
}

export interface SelectSearchField extends BaseSearchField {
  type: 'select';
  selectMulti?: boolean;
  props?: Omit<
    SelectProps,
    | 'label'
    | 'required'
    | 'options'
    | 'mode'
    | 'value'
    | 'defaultValue'
    | 'onChange'
    | 'onValueChange'
  >;
  options: SelectProps['options'];
}

export interface MultiOptionsSearchField extends BaseSearchField {
  type: 'multiOptions';
  props?: Omit<
    MultiOptionsListProps,
    'label' | 'options' | 'value' | 'onChange'
  >;
  options: { value: string; label: React.ReactNode; disabled?: boolean }[];
}

export interface DateSearchField extends BaseSearchField {
  type: 'date';
  props?: Omit<DatePickerProps, 'label' | 'required'>;
}

export interface TimeSearchField extends BaseSearchField {
  type: 'time';
  props?: Omit<TimePickerProps, 'label' | 'required'>;
}

export interface DateRangeSearchField extends BaseSearchField {
  type: 'dateRange';
  props?: Omit<DateRangePickerProps, 'label' | 'required'>;
}

export interface TimeRangeSearchField extends BaseSearchField {
  type: 'timeRange';
  props?: Omit<TimeRangePickerProps, 'label' | 'required'>;
}

export type SearchField =
  | TextSearchField
  | SelectSearchField
  | MultiOptionsSearchField
  | DateSearchField
  | TimeSearchField
  | DateRangeSearchField
  | TimeRangeSearchField;

export interface SearchSectionConfig {
  title?: string;
  fields: SearchField[];
  itemsPerRow?: number; // default: 5
  minItemWidth?: number; // default: 250px
  noExpand?: boolean; // default: false - if true, disable expand/collapse and show all items
  onSearch?: (values: Record<string, any>) => void;
  onReset?: () => void;
  onFieldChange?: (id: string, value: any) => void;
  searchButtonText?: string; // default: "検索"
  resetButtonText?: string; // default: "リフレッシュ"
  expandButtonText?: string; // default: "詳細検索はこちら"
  collapseButtonText?: string; // default: "詳細検索はこちら"
  syncWithUrl?: boolean; // default: true - sync search state with URL params
  urlParamsPrefix?: string; // default: '' - prefix for URL params to avoid conflicts
  triggerSearchOnMount?: boolean; // default: true - trigger onSearch when mounting with URL params
  /** Hiện số kết quả (hoặc nội dung bất kỳ) ở cuối thanh lọc */
  summary?: React.ReactNode;
  /** Tự áp dụng ngay khi đổi viên lọc / select (mặc định true) */
  applyOnChange?: boolean;
  className?: string;
}

export interface SearchFormValues {
  [key: string]: any;
}
