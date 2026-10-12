import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useTranslation } from 'react-i18next';
import { AiService } from '@/lib/apis/ai';
import { toastHelpers } from '@/hooks/use-toast';
import type { EntityId } from '@/config/interface';
import type { AiConversationListResponse } from '@/types/ai-assistant';

export const AI_CONVERSATIONS_QUERY_KEY = 'ai-conversations';

/** Danh sách hội thoại AI của user hiện tại trên một board. */
export const useAiConversations = (boardId?: EntityId) => {
  const { t } = useTranslation();
  const queryClient = useQueryClient();

  const {
    data = { items: [], total: 0 },
    isLoading,
    error: listError,
    refetch: refetchConversations,
  } = useQuery<AiConversationListResponse>({
    queryKey: [AI_CONVERSATIONS_QUERY_KEY, boardId],
    queryFn: () => AiService.listConversations(boardId!),
    enabled: !!boardId,
    staleTime: 15 * 1000,
  });

  const { mutateAsync: deleteConversation, isPending: isDeleting } =
    useMutation({
      mutationFn: (id: EntityId) => AiService.deleteConversation(id),
      onSuccess: () => {
        queryClient.invalidateQueries({
          queryKey: [AI_CONVERSATIONS_QUERY_KEY, boardId],
        });
        toastHelpers.success({
          description: t('aiAssistant.conversations.deleted'),
        });
      },
    });

  return {
    conversations: data.items,
    totalConversations: data.total,
    isLoading,
    listError,
    refetchConversations,
    deleteConversation,
    isDeleting,
  };
};
