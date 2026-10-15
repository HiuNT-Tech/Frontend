'use client';

import { useTranslation } from 'react-i18next';
import { SearchSection } from '@/components/search/SearchSection';
import { BoardInvitationStatus } from '@/config/enum';
import { getInvitationStatusLabelKey } from '@/constant/data';
import type { InvitationListParams } from '@/config/interface';
import type { SearchField } from '@/types/search-section';

interface InvitationsFilterProps {
  onSearch: (params: InvitationListParams) => void;
}

export default function InvitationsFilter({
  onSearch,
}: InvitationsFilterProps) {
  const { t } = useTranslation();

  const statusOptions = Object.values(BoardInvitationStatus).map(status => ({
    value: status,
    label: t(getInvitationStatusLabelKey(status)),
  }));

  const searchFields: SearchField[] = [
    {
      id: 'status',
      type: 'select',
      label: t('settings.invitations.table.status'),
      options: statusOptions,
      props: {
        placeholder: t('settings.invitations.statusFilterPlaceholder'),
      },
    },
  ];

  const handleSearch = (values: Record<string, any>) => {
    onSearch({
      status: values.status as BoardInvitationStatus | undefined,
    });
  };

  return (
    <SearchSection
      itemsPerRow={1}
      minItemWidth={240}
      title={t('settings.invitations.searchTitle')}
      fields={searchFields}
      onSearch={handleSearch}
      onReset={() => onSearch({})}
      syncWithUrl={false}
      triggerSearchOnMount={false}
    />
  );
}
