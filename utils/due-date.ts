import dayjs from 'dayjs';

/**
 * Due date được coi là quá hạn khi đã qua hết ngày đó so với thời điểm hiện tại
 * (dayjs() = now). Dùng chung cho mọi màn để giao diện đồng bộ.
 */
export const isOverdue = (value?: string | number | null): boolean =>
  !!value && dayjs(value).endOf('day').isBefore(dayjs());

/** Bôi đỏ due date quá hạn ở dạng text (bảng, header chi tiết, preview...). */
export const OVERDUE_TEXT_CLASS = 'font-semibold text-danger';

/** Bôi đỏ due date quá hạn ở dạng badge (card trên board). */
export const OVERDUE_BADGE_CLASS = 'bg-danger-soft text-danger';

/** Bôi đỏ ô nhập due date quá hạn (antd DatePicker). */
export const OVERDUE_INPUT_CLASS =
  '[&.ant-picker]:border-danger! [&_.ant-picker-input>input]:text-danger! [&_.ant-picker-input>input]:font-semibold!';
