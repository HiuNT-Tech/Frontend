'use client';

import { useTranslation } from 'react-i18next';
import { SearchSection } from '@/components/search/SearchSection';
import type { SearchField } from '@/types/search-section';
import { MemberRole } from '@/config/enum';
import { UsersBoardParams } from '@/config/interface';

const MembersFilter = ({
  onSearch,
}: {
  onSearch: (params: UsersBoardParams) => void;
}) => {
  const { t } = useTranslation();

  const searchFields: SearchField[] = [
    {
      id: 'search',
      type: 'text',
      props: {
        placeholder: t('settings.members.searchPlaceholder'),
      },
    },
    {
      id: 'role',
      type: 'select',
      label: t('settings.members.table.role'),
      options: [
        {
          value: MemberRole.ADMINISTRATOR,
          label: t('settings.members.roleOptions.administrator'),
        },
        {
          value: MemberRole.PROJECT_MANAGER,
          label: t('settings.members.roleOptions.projectManager'),
        },
        {
          value: MemberRole.MEMBER,
          label: t('settings.members.roleOptions.member'),
        },
        {
          value: MemberRole.GUEST,
          label: t('settings.members.roleOptions.guest'),
        },
      ],
      props: {
        placeholder: t('settings.members.roleFilterPlaceholder'),
      },
    },
  ];

  const handleSearch = (values: Record<string, any>) => {
    const { search, role, ...rest } = values;

    const params: UsersBoardParams = { ...rest };

    if (search) {
      params.search = String(search).trim();
    }
    if (role) {
      params.role = role;
    }
    onSearch(params);
  };

  const handleReset = () => {
    onSearch({});
  };

  return (
    <div className="mt-0">
      <SearchSection
        itemsPerRow={2}
        title={t('common.search')}
        fields={searchFields}
        onSearch={handleSearch}
        onReset={handleReset}
      />
    </div>
  );
};

export default MembersFilter;
