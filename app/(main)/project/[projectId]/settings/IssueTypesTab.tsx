'use client';

import React, { useEffect, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Plus } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Button } from '@/components/ui/button';
import { IssueTypesTable } from '@/components/shared/tables/IssueTypesTable';
import { IssueTypeCreateForm } from '@/components/shared/forms/IssueTypesCreateForm';
import { replaceWithUpdatedSearchParams } from '@/lib/url';
import { useIssueType } from '@/hooks/use-issue-type';
import { useBoardRole } from '@/hooks/use-board-role';
import { toastHelpers } from '@/hooks/use-toast';
import { COLOR_KEY_TO_STATUS } from '@/constant/data';
import type { CreateIssueTypeFormData } from '@/validation/create-issue-type-form-schemas';
import IssueTypesFilter from '@/components/shared/filters/IssueTypesFilter';
import { usePagination } from '@/hooks/use-pagination';
import type { EntityId } from '@/config/interface';
import { SectionHeader } from './SectionHeader';

export const IssueTypesTab: React.FC<{ boardId: EntityId }> = ({ boardId }) => {
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
    issueTypes,
    totalCount,
    isLoading,
    createNewIssueType,
    deleteIssueType,
    isCreatePending,
  } = useIssueType(boardId, apiParams);

  const isCreateModeFromUrl = searchParams.get('issueTypesMode') === 'create';
  const [isCreatingIssueType, setIsCreatingIssueType] =
    useState(isCreateModeFromUrl);

  useEffect(() => {
    setIsCreatingIssueType(isCreateModeFromUrl);
  }, [isCreateModeFromUrl]);

  const handleSearch = (params: Record<string, any>) => {
    setSearchParamsState(params);
    pagination.setPage(1);
  };

  const handleCloseCreate = () => {
    replaceWithUpdatedSearchParams(router, pathname, searchParams, params => {
      params.set('tab', 'issueTypes');
      params.delete('issueTypesMode');
    });
    setIsCreatingIssueType(false);
  };

  const handleSubmitIssueType = async (data: CreateIssueTypeFormData) => {
    try {
      const statusColor = COLOR_KEY_TO_STATUS[data.selectedColorKey];
      await createNewIssueType({
        boardId,
        name: data.name.trim(),
        statusColor,
      });
      toastHelpers.success({
        title: t('common.success.add'),
      });
      handleCloseCreate();
    } catch {
      // Toast đã xử lý trong useIssueType
    }
  };

  const handleDelete = async (id: EntityId) => {
    try {
      await deleteIssueType(id);
      toastHelpers.success({
        title: t('common.success.delete'),
      });
    } catch {}
  };

  if (isCreatingIssueType && isManager) {
    return (
      <IssueTypeCreateForm
        boardId={boardId}
        onClose={handleCloseCreate}
        onSubmit={handleSubmitIssueType}
        isPending={isCreatePending}
      />
    );
  }

  return (
    <div className="space-y-5">
      <SectionHeader
        title={t('settings.issueTypes.heading')}
        description={t('settings.issueTypes.hint')}
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
                    params.set('tab', 'issueTypes');
                    params.set('issueTypesMode', 'create');
                  }
                );
                setIsCreatingIssueType(true);
              }}
            >
              <Plus />
              {t('settings.issueTypes.actions.add')}
            </Button>
          )
        }
      />

      <IssueTypesFilter onSearch={handleSearch} />

      <IssueTypesTable
        boardId={boardId}
        data={issueTypes}
        loading={isLoading}
        totalCount={totalCount}
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
