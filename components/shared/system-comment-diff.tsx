'use client';

import React, { useMemo } from 'react';
import { format } from 'jsondiffpatch/formatters/html';
import type { Delta } from 'jsondiffpatch';
import { useTranslation } from 'react-i18next';
import type { TFunction } from 'i18next';
import './system-comment-diff.css';

export interface SystemCommentDiffProps {
  /** Delta JSON của jsondiffpatch, được BE lưu trong comment.content. */
  content: string;
  className?: string;
}

// Key trong delta là tên field ổn định do BE sinh ra (xem
// CardHistoryService.toDiffable) — map sang nhãn hiển thị theo ngôn ngữ
// đang chọn thay vì hiển thị thẳng key.
export const FIELD_LABEL_KEYS: Record<string, string> = {
  title: 'addIssue.label.title',
  description: 'addIssue.label.description',
  priority: 'addIssue.label.priority',
  status: 'addIssue.label.status',
  assignee: 'addIssue.label.assignee',
  issueType: 'addIssue.label.issueType',
  milestone: 'addIssue.label.version',
  startDate: 'addIssue.label.startDate',
  dueDate: 'addIssue.label.dueDate',
  estimatedHours: 'addIssue.label.estimatedHours',
  actualHours: 'addIssue.label.actualHours',
};

const PRIORITY_LABEL_KEYS: Record<number, string> = {
  1: 'priority.low',
  2: 'priority.normal',
  3: 'priority.high',
};

const translatePriorityValue = (value: unknown, t: TFunction): unknown => {
  if (typeof value !== 'number') return value;
  const key = PRIORITY_LABEL_KEYS[value];
  return key ? t(key) : value;
};

/**
 * Dịch key + giá trị của delta sang ngôn ngữ hiện tại trước khi format.
 * Chỉ đổi tên field (key) và giá trị priority (số -> nhãn) — các giá trị
 * khác (tiêu đề, trạng thái, tên người dùng...) là dữ liệu người dùng nhập,
 * giữ nguyên không dịch.
 */
const translateDelta = (
  delta: Record<string, unknown>,
  t: TFunction
): Record<string, unknown> => {
  return Object.fromEntries(
    Object.entries(delta).map(([key, value]) => {
      const label = FIELD_LABEL_KEYS[key] ? t(FIELD_LABEL_KEYS[key]) : key;

      if (key !== 'priority' || !Array.isArray(value)) {
        return [label, value];
      }

      // Delta shape: [new] thêm mới, [old, new] sửa — chỉ 2 vị trí đầu là
      // giá trị priority thật, phần tử thứ 3 (nếu có) là marker loại delta.
      const translated = value.map((v, idx) =>
        idx < 2 ? translatePriorityValue(v, t) : v
      );
      return [label, translated];
    })
  );
};

/**
 * Render nội dung comment hệ thống (type = SYSTEM) — thay đổi của ticket
 * dưới dạng diff trước/sau. Chỉ parse + format delta đã được BE tính sẵn,
 * không tính lại diff ở FE.
 *
 * An toàn với dangerouslySetInnerHTML: html formatter của jsondiffpatch
 * tự escape mọi giá trị (& < > ' ") trước khi chèn vào chuỗi HTML.
 */
export const SystemCommentDiff: React.FC<SystemCommentDiffProps> = ({
  content,
  className,
}) => {
  const { t } = useTranslation();

  const html = useMemo(() => {
    try {
      const delta = JSON.parse(content) as Record<string, unknown>;
      const translated = translateDelta(delta, t);
      return format(translated as Delta) ?? '';
    } catch {
      // Content không phải delta hợp lệ -> không render thay vì crash list.
      return '';
    }
  }, [content, t]);

  if (!html) return null;

  return (
    <div
      className={`system-comment-diff text-sm text-ink-2 ${className ?? ''}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};
