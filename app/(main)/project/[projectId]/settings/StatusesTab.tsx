'use client';

import React from 'react';
import { useState, useEffect } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { replaceWithUpdatedSearchParams } from '@/lib/url';
import { useColumn } from '@/hooks/use-column';
import { useBoardRole } from '@/hooks/use-board-role';
import { toastHelpers } from '@/hooks/use-toast';
import { COLOR_KEY_TO_STATUS } from '@/constant/data';
import type { CreateIssueTypeFormData } from '@/validation/create-issue-type-form-schemas';
import { Button } from '@/components/ui/button';
import { StatusesTable } from '@/components/shared/tables/StatusesTable';
import { StatusCreateForm } from '@/components/shared/forms/StatusCreateForm';
import StatusesFilter from '@/components/shared/filters/StatusesFilter';
import { usePagination } from '@/hooks/use-pagination';
import type { EntityId } from '@/config/interface';
import { SectionHeader } from './SectionHeader';

export const StatusesTab: React.FC<{ boardId: EntityId }> = ({ boardId }) => {
  const { t } = useTranslation();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const pagination = usePagination();
  const { isManager } = useBoardRole(boardId);

  const [searchParamsState, setSearchParamsState] =
    useState<Record<string, any>>();

  const apiParams = {
    ...pagination.apiParams,
    ...searchParamsState,
  };

  const {
    columns: columnList,
    isLoading,
    createNewColumn,
    deleteColumn,
    isCreatePending,
  } = useColumn(boardId, apiParams);

  const isCreateModeFromUrl = searchParams.get('statusesMode') === 'create';
  const [isCreatingStatus, setIsCreatingStatus] = useState(isCreateModeFromUrl);

  useEffect(() => {
    setIsCreatingStatus(isCreateModeFromUrl);
  }, [isCreateModeFromUrl]);

  const handleSearch = (params: Record<string, any>) => {
    setSearchParamsState(params);
    pagination.setPage(1);
  };

  const handleCloseCreate = () => {
    replaceWithUpdatedSearchParams(router, pathname, searchParams, params => {
      params.set('tab', 'statuses');
      params.delete('statusesMode');
    });
    setIsCreatingStatus(false);
  };

  const handleSubmitColumn = async (data: CreateIssueTypeFormData) => {
    try {
      const statusColor = COLOR_KEY_TO_STATUS[data.selectedColorKey];
      await createNewColumn({
        title: data.name.trim(),
        statusColor,
        selectedColorKey: data.selectedColorKey,
      });
      toastHelpers.success({
        title: t('settings.issueTypes.createSuccess'),
      });
      handleCloseCreate();
    } catch {
      // Toast đã xử lý trong hook
    }
  };

  const handleDelete = async (id: EntityId) => {
    try {
      await deleteColumn(id);
      toastHelpers.success({
        title: t('common.success.delete'),
      });
    } catch {}
  };

  if (isCreatingStatus && isManager) {
    return (
      <StatusCreateForm
        onClose={handleCloseCreate}
        onSubmit={handleSubmitColumn}
        isPending={isCreatePending}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('settings.statuses.heading')}
        description={t('settings.statuses.hint')}
        action={
          isManager && (
            <Button
              variant="primary"
              onClick={() => {
                replaceWithUpdatedSearchParams(
                  router,
                  pathname,
                  searchParams,
                  params => {
                    params.set('tab', 'statuses');
                    params.set('statusesMode', 'create');
                  }
                );
                setIsCreatingStatus(true);
              }}
            >
              <Plus />
              {t('settings.statuses.actions.add')}
            </Button>
          )
        }
      />

      <StatusesFilter onSearch={handleSearch} />

      <StatusesTable
        boardId={boardId}
        data={columnList}
        loading={isLoading}
        page={pagination.page}
        limit={pagination.limit}
        onPageChange={pagination.setPage}
        onPageSizeChange={pagination.setLimit}
        onDelete={handleDelete}
        canManage={isManager}
      />
    </div>
  );
};
