'use client';

import React from 'react';
import { useParams } from 'next/navigation';
import { Modal } from '@/components/ui/modal';
import { useTranslation } from 'react-i18next';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DatePicker } from '@/components/ui/date-picker';
import { Select } from '@/components/ui/select';
import { TimePicker } from '@/components/ui/time-picker';
import { Textarea } from '@/components/ui/textarea';
import { ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { useVersion } from '@/hooks/use-version';
import { useColumn } from '@/hooks/use-column';
import { useIssueType } from '@/hooks/use-issue-type';
import { useUserBoard } from '@/hooks/use-user-board';
import { PRIORITY } from '@/config/enum';
import type { EntityId } from '@/config/interface';
import { toEntityIdOrUndefined } from '@/lib/entity-id';
import { isOverdue, OVERDUE_INPUT_CLASS } from '@/utils/due-date';

interface AddCardPopupProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: (cardData: CardFormData) => void;
  /** Cột đang thêm thẻ: điền sẵn trạng thái */
  columnId?: EntityId;
}

export interface CardFormData {
  title: string;
  description: string;
  status?: string;
  assignee?: string;
  priority?: string;
  issueType?: string;
  version?: string;
  startDate?: string;
  dueDate?: string;
  estimatedHours?: string;
  actualHours?: string;
}

const LIST_PARAMS = { skip: 0, limit: 100 };

const emptyForm = (columnId?: EntityId): CardFormData => ({
  title: '',
  description: '',
  status: columnId != null ? String(columnId) : undefined,
  assignee: undefined,
  priority: undefined,
  issueType: undefined,
  version: undefined,
  startDate: undefined,
  dueDate: undefined,
  estimatedHours: undefined,
  actualHours: undefined,
});

/** Sheet "Thêm thẻ" trên board: tiêu đề + mô tả, rồi các trường phụ xếp hai cột. */
export const AddCardPopup: React.FC<AddCardPopupProps> = ({
  isOpen,
  onClose,
  onConfirm,
  columnId,
}) => {
  const { t } = useTranslation();
  const params = useParams<{ projectId?: string }>();
  const boardId = toEntityIdOrUndefined(params?.projectId);

  const { versions } = useVersion(boardId, LIST_PARAMS);
  const { columns } = useColumn(boardId);
  const { issueTypes } = useIssueType(boardId, LIST_PARAMS);
  const { listUser } = useUserBoard(boardId, LIST_PARAMS);

  const [formData, setFormData] = React.useState<CardFormData>(() =>
    emptyForm(columnId)
  );

  React.useEffect(() => {
    if (!isOpen) {
      setFormData(emptyForm(columnId));
    }
  }, [isOpen, columnId]);

  const handleConfirm = () => {
    if (formData.title.trim() && onConfirm) {
      onConfirm(formData);
    }
  };
  const updateField = (
    field: keyof CardFormData,
    value: string | undefined
  ) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Options from hooks and enums
  const statusOptions = columns.map(column => ({
    value: String(column.id),
    label: <ColorTag color={column.statusColor}>{column.title}</ColorTag>,
  }));

  const priorityOptions = [
    { value: String(PRIORITY.LOW), label: t('priority.low') },
    { value: String(PRIORITY.NORMAL), label: t('priority.normal') },
    { value: String(PRIORITY.HIGH), label: t('priority.high') },
  ];

  const versionOptions = versions.map(version => ({
    value: String(version.id),
    label: version.name,
  }));

  const issueTypeOptions = issueTypes.map(issueType => ({
    value: String(issueType.id),
    label: <ColorTag color={issueType.statusColor}>{issueType.name}</ColorTag>,
  }));

  const assigneeOptions = listUser.items.map(user => {
    const name = user.displayName || user.username || user.email;
    return {
      value: String(user.userId),
      label: (
        <span className="flex min-w-0 items-center gap-2">
          <UserAvatar name={name} src={user.avatar} size={20} />
          <span className="truncate">{name}</span>
        </span>
      ),
    };
  });

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={t('column.addNewCard.popup.title')}
      size="lg"
    >
      <form
        className="flex flex-col gap-4"
        onSubmit={event => {
          event.preventDefault();
          handleConfirm();
        }}
      >
        <Input
          label={t('column.addNewCard.popup.titleLabel')}
          placeholder={t('column.addNewCard.popup.titlePlaceholder')}
          value={formData.title}
          onChange={e => updateField('title', e.target.value)}
          autoFocus
          required
        />

        <Textarea
          label={t('column.addNewCard.popup.descriptionLabel')}
          placeholder={t('column.addNewCard.popup.descriptionPlaceholder')}
          value={formData.description}
          onChange={e => updateField('description', e.target.value)}
          className="min-h-[100px]"
        />

        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label={t('column.addNewCard.popup.statusLabel')}
            placeholder={t('column.addNewCard.popup.statusPlaceholder')}
            value={formData.status}
            disabled={columnId != null}
            onValueChange={(value: string) => updateField('status', value)}
            options={statusOptions}
          />
          <Select
            label={t('column.addNewCard.popup.assigneeLabel')}
            placeholder={t('column.addNewCard.popup.assigneePlaceholder')}
            value={formData.assignee}
            onValueChange={(value: string) => updateField('assignee', value)}
            options={assigneeOptions}
            showSearch
            allowClear
          />
          <Select
            label={t('column.addNewCard.popup.priorityLabel')}
            placeholder={t('column.addNewCard.popup.priorityPlaceholder')}
            value={formData.priority}
            onValueChange={(value: string) => updateField('priority', value)}
            options={priorityOptions}
            allowClear
          />
          <Select
            label={t('addIssue.label.issueType')}
            placeholder={t('addIssue.placeholder.issueType')}
            value={formData.issueType}
            onValueChange={(value: string) => updateField('issueType', value)}
            options={issueTypeOptions}
            showSearch
            allowClear
          />
          <Select
            label={t('addIssue.label.version')}
            placeholder={t('addIssue.placeholder.version')}
            value={formData.version}
            onValueChange={(value: string) => updateField('version', value)}
            options={versionOptions}
            showSearch
            allowClear
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <DatePicker
            label={t('column.addNewCard.popup.startDateLabel')}
            value={formData.startDate || ''}
            onChange={e => updateField('startDate', e.target.value)}
          />
          <DatePicker
            label={t('column.addNewCard.popup.dueDateLabel')}
            value={formData.dueDate || ''}
            onChange={e => updateField('dueDate', e.target.value)}
            className={isOverdue(formData.dueDate) ? OVERDUE_INPUT_CLASS : ''}
          />
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <TimePicker
            label={t('column.addNewCard.popup.estimatedHoursLabel')}
            placeholder={t('column.addNewCard.popup.estimatedHoursPlaceholder')}
            value={formData.estimatedHours}
            onChange={e => updateField('estimatedHours', e.target.value)}
          />
          <TimePicker
            label={t('column.addNewCard.popup.actualHoursLabel')}
            placeholder={t('column.addNewCard.popup.actualHoursPlaceholder')}
            value={formData.actualHours}
            onChange={e => updateField('actualHours', e.target.value)}
          />
        </div>

        <div className="-mx-[22px] -mb-[22px] flex flex-wrap justify-end gap-2 border-t border-line bg-bg px-[22px] py-3.5">
          <Button type="button" variant="outline" onClick={onClose}>
            {t('common.cancel')}
          </Button>
          <Button type="submit" disabled={!formData.title.trim()}>
            {t('column.addNewCard.popup.submit')}
          </Button>
        </div>
      </form>
    </Modal>
  );
};
