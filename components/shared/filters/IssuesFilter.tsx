'use client';
import { useTranslation } from 'react-i18next';
import { CircleDot, Flag, Shapes, Tag, UserRound } from 'lucide-react';
import { SearchSection } from '@/components/search/SearchSection';
import type { SearchField } from '@/types/search-section';
import type { CardListParams, EntityId } from '@/config/interface';
import { useColumn } from '@/hooks/use-column';
import { useVersion } from '@/hooks/use-version';
import { useIssueType } from '@/hooks/use-issue-type';
import { useUserBoard } from '@/hooks/use-user-board';
import { PRIORITY_OPTIONS } from '@/constant/data';
import { ColorTag } from '@/components/ui/tag';
import { UserAvatar } from '@/components/ui/user-avatar';
import { PriorityLabel } from '@/components/issues/priority-flag';

/**
 * Thanh lọc của màn Issues: ô tìm kiếm + viên lọc trạng thái / loại / ưu tiên / người được giao,
 * phiên bản và người đăng ký nằm trong "Thêm bộ lọc". Tham số API giữ nguyên như trước.
 */
const IssuesFilter = ({
  boardId,
  onSearch,
  summary,
}: {
  boardId?: EntityId;
  onSearch: (params: CardListParams) => void;
  /** Dòng tóm tắt ở cuối thanh (vd. số công việc) */
  summary?: React.ReactNode;
}) => {
  const { t } = useTranslation();

  const { columns: columnList } = useColumn(boardId);
  const { versions } = useVersion(boardId, { skip: 0, limit: 100 });
  const { issueTypes } = useIssueType(boardId, { skip: 0, limit: 100 });
  const { listUser } = useUserBoard(boardId, { skip: 0, limit: 100 });

  const OptionsStatus = columnList.map(column => ({
    value: column.id.toString(),
    label: (
      <ColorTag color={column.statusColor} className="font-medium">
        {column.title}
      </ColorTag>
    ),
  }));

  const VersionOptions = versions.map(version => ({
    value: version.id.toString(),
    label: version.name,
  }));

  const IssueTypeOptions = issueTypes.map(issueType => ({
    value: issueType.id.toString(),
    label: (
      <ColorTag color={issueType.statusColor} className="font-medium">
        {issueType.name}
      </ColorTag>
    ),
  }));

  const userOptions = listUser.items.map(user => ({
    value: user.userId.toString(),
    label: (
      <span className="flex min-w-0 items-center gap-2">
        <UserAvatar name={user.displayName} src={user.avatar} size={22} />
        <span className="truncate">{user.displayName}</span>
      </span>
    ),
  }));

  const PriorityOptions = PRIORITY_OPTIONS.map(option => ({
    value: option.value,
    label: (
      <PriorityLabel priority={Number(option.value)} label={option.label} />
    ),
  }));

  const searchFields: SearchField[] = [
    {
      id: 'search',
      type: 'text',
      label: t('issues.filter.search'),
      placement: 'bar',
      props: {
        placeholder: t('issues.filter.searchPlaceholder'),
      },
    },
    {
      id: 'status',
      type: 'multiOptions',
      label: t('issues.filter.status'),
      icon: <CircleDot aria-hidden="true" />,
      options: OptionsStatus,
      props: {
        placeholder: t('issues.filter.statusPlaceholder'),
      },
    },
    {
      id: 'issueType',
      type: 'multiOptions',
      label: t('issues.filter.issueType'),
      icon: <Shapes aria-hidden="true" />,
      options: IssueTypeOptions,
      props: {
        placeholder: t('issues.filter.issueTypePlaceholder'),
      },
    },
    {
      id: 'priority',
      type: 'multiOptions',
      label: t('issues.filter.priority'),
      icon: <Flag aria-hidden="true" />,
      options: PriorityOptions,
      props: {
        placeholder: t('issues.filter.priorityPlaceholder'),
      },
    },
    {
      id: 'assignee',
      type: 'multiOptions',
      label: t('issues.filter.assignee'),
      icon: <UserRound aria-hidden="true" />,
      options: userOptions,
      props: {
        placeholder: t('issues.filter.assigneePlaceholder'),
      },
    },
    {
      id: 'version',
      type: 'multiOptions',
      label: t('issues.filter.version'),
      icon: <Tag aria-hidden="true" />,
      placement: 'advanced',
      options: VersionOptions,
      props: {
        placeholder: t('issues.filter.versionPlaceholder'),
      },
    },
    {
      id: 'registeredBy',
      type: 'multiOptions',
      label: t('issues.filter.registeredBy'),
      icon: <UserRound aria-hidden="true" />,
      placement: 'advanced',
      options: userOptions,
      props: {
        placeholder: t('issues.filter.registerByPlaceholder'),
      },
    },
  ];

  const normalizeMultiParam = (value: unknown) => {
    const values = Array.isArray(value) ? value : value ? [value] : [];

    const filteredValues = values
      .map(item => String(item).trim())
      .filter(Boolean);

    return filteredValues.length ? filteredValues.join(',') : undefined;
  };

  const handleSearch = (values: Record<string, any>) => {
    const {
      search,
      status,
      version,
      issueType,
      priority,
      assignee,
      registeredBy,
    } = values;

    const params: CardListParams = {};

    if (search && String(search).trim()) {
      params.search = String(search).trim();
    }

    params.columnId = normalizeMultiParam(status);
    params.versionId = normalizeMultiParam(version);
    params.issueTypeId = normalizeMultiParam(issueType);
    params.priority = normalizeMultiParam(priority);
    params.assigneeUserId = normalizeMultiParam(assignee);
    params.registeredByUserId = normalizeMultiParam(registeredBy);

    onSearch(params);
  };

  const handleReset = () => {
    onSearch({});
  };

  return (
    <SearchSection
      title={t('common.search')}
      fields={searchFields}
      onSearch={handleSearch}
      onReset={handleReset}
      summary={summary}
    />
  );
};

export default IssuesFilter;
