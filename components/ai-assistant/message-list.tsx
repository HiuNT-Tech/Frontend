'use client';

import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { MARKDOWN_REMARK_PLUGINS } from '@/constant/markdown';
import Image from 'next/image';
import Icons from '@/assets/icons';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { EntityId } from '@/config/interface';
import type {
  AiChatMessage,
  AiMessageBlock,
  AiProposalState,
} from '@/types/ai-assistant';
import { ActionCard } from './action-card';
import { CardChipList } from './card-chip-list';

const markdownClassName =
  'prose prose-sm max-w-none text-theme-neutral-11 text-sm leading-relaxed [&_h1]:text-base [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-sm [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-sm [&_h3]:font-semibold [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_em]:italic [&_a]:text-theme-main [&_a]:hover:underline [&_blockquote]:border-l-4 [&_blockquote]:border-theme-neutral-5 [&_blockquote]:pl-3 [&_blockquote]:italic [&_blockquote]:text-theme-neutral-8 [&_code]:bg-theme-neutral-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs [&_code]:font-mono [&_pre]:bg-theme-neutral-3 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_table]:w-full [&_table]:text-xs [&_table]:mb-2 [&_th]:text-left [&_th]:font-semibold [&_th]:border-b [&_th]:border-theme-neutral-5 [&_th]:px-2 [&_th]:py-1 [&_td]:border-b [&_td]:border-theme-neutral-4 [&_td]:px-2 [&_td]:py-1';

interface MessageListProps {
  boardId: EntityId;
  messages: AiChatMessage[];
  isStreaming: boolean;
  onApply: (messageId: string, state: AiProposalState) => void;
  onCancel: (messageId: string, state: AiProposalState) => void;
  onRetryProposal: (messageId: string, state: AiProposalState) => void;
  onRetry: () => void;
}

export function MessageList({
  boardId,
  messages,
  isStreaming,
  onApply,
  onCancel,
  onRetryProposal,
  onRetry,
}: MessageListProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ block: 'end' });
  }, [messages]);

  const lastMessage = messages[messages.length - 1];

  return (
    <div className="flex flex-col gap-4 px-4 py-4" aria-live="polite">
      {messages.map(message =>
        message.role === 'user' ? (
          <UserMessage key={message.id} message={message} />
        ) : (
          <AssistantMessage
            key={message.id}
            boardId={boardId}
            message={message}
            isLast={message.id === lastMessage?.id}
            isStreaming={isStreaming && message.id === lastMessage?.id}
            onApply={onApply}
            onCancel={onCancel}
            onRetryProposal={onRetryProposal}
            onRetry={onRetry}
          />
        )
      )}
      <div ref={bottomRef} />
    </div>
  );
}

function UserMessage({ message }: { message: AiChatMessage }) {
  return (
    <div className="flex justify-end">
      <div className="max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-br-md bg-theme-main-1 px-4 py-2.5 text-sm text-theme-neutral-11">
        {message.content}
      </div>
    </div>
  );
}

interface AssistantMessageProps {
  boardId: EntityId;
  message: AiChatMessage;
  isLast: boolean;
  isStreaming: boolean;
  onApply: MessageListProps['onApply'];
  onCancel: MessageListProps['onCancel'];
  onRetryProposal: MessageListProps['onRetryProposal'];
  onRetry: MessageListProps['onRetry'];
}

function AssistantMessage({
  boardId,
  message,
  isLast,
  isStreaming,
  onApply,
  onCancel,
  onRetryProposal,
  onRetry,
}: AssistantMessageProps) {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const hasText = message.blocks.some(b => b.kind === 'text' && b.text.trim());
  const waitingFirstToken = isStreaming && message.blocks.length === 0;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(message.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard bị chặn — bỏ qua
    }
  };

  return (
    <div className="group flex gap-2.5">
      <div className="mt-0.5 flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-full bg-theme-main-1">
        <Image
          src={Icons.Sparkles}
          alt=""
          width={16}
          height={16}
          style={{ filter: 'var(--theme-filter-main)' }}
        />
      </div>
      <div className="min-w-0 flex-1 space-y-2">
        {waitingFirstToken && <TypingDots />}
        {message.blocks.map((block, index) => (
          <Block
            key={`${message.id}-${index}`}
            boardId={boardId}
            messageId={message.id}
            block={block}
            isStreamingTail={
              isStreaming &&
              index === message.blocks.length - 1 &&
              block.kind === 'text'
            }
            isLast={isLast}
            onApply={onApply}
            onCancel={onCancel}
            onRetryProposal={onRetryProposal}
            onRetry={onRetry}
          />
        ))}
        {hasText && !isStreaming && (
          <div className="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100">
            <button
              type="button"
              onClick={copy}
              className="flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-theme-neutral-7 hover:bg-theme-neutral-3 hover:text-theme-neutral-10"
            >
              <Image
                src={copied ? Icons.Check : Icons.Copy}
                alt=""
                width={12}
                height={12}
              />
              {copied ? t('aiAssistant.copied') : t('aiAssistant.copy')}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

interface BlockProps {
  boardId: EntityId;
  messageId: string;
  block: AiMessageBlock;
  isStreamingTail: boolean;
  isLast: boolean;
  onApply: MessageListProps['onApply'];
  onCancel: MessageListProps['onCancel'];
  onRetryProposal: MessageListProps['onRetryProposal'];
  onRetry: MessageListProps['onRetry'];
}

function Block({
  boardId,
  messageId,
  block,
  isStreamingTail,
  isLast,
  onApply,
  onCancel,
  onRetryProposal,
  onRetry,
}: BlockProps) {
  const { t } = useTranslation();

  switch (block.kind) {
    case 'text':
      return (
        <div
          className={cn(
            markdownClassName,
            isStreamingTail && 'ai-streaming-tail'
          )}
        >
          <ReactMarkdown remarkPlugins={MARKDOWN_REMARK_PLUGINS}>
            {block.text}
          </ReactMarkdown>
        </div>
      );
    case 'tool':
      return <ToolActivity block={block} />;
    case 'cards':
      return (
        <CardChipList
          boardId={boardId}
          items={block.items}
          total={block.total}
        />
      );
    case 'proposal':
      return (
        <ActionCard
          boardId={boardId}
          state={block.state}
          onApply={() => onApply(messageId, block.state)}
          onCancel={() => onCancel(messageId, block.state)}
          onRetry={() => onRetryProposal(messageId, block.state)}
        />
      );
    case 'error':
      return (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">
          <span>
            {t(`aiAssistant.error.${block.code}`, {
              defaultValue: block.message || t('aiAssistant.error.generic'),
            })}
          </span>
          {isLast && block.code !== 'AI_NOT_CONFIGURED' && (
            <Button
              type="button"
              variant="outline"
              size="xs"
              className="h-6 border-red-300 bg-white px-2 text-red-700 hover:bg-red-100"
              onClick={onRetry}
            >
              {t('aiAssistant.retry')}
            </Button>
          )}
        </div>
      );
    default:
      return null;
  }
}

function ToolActivity({
  block,
}: {
  block: Extract<AiMessageBlock, { kind: 'tool' }>;
}) {
  const { t } = useTranslation();
  const label =
    block.status === 'running'
      ? block.label
      : t(`aiAssistant.tool.${block.name}`, { defaultValue: block.name });

  return (
    <div
      className={cn(
        'flex items-center gap-1.5 text-xs text-theme-neutral-7',
        block.status === 'error' && 'text-red-600'
      )}
    >
      {block.status === 'running' ? (
        <Image
          src={Icons.Loader2}
          alt=""
          width={12}
          height={12}
          className="animate-spin"
        />
      ) : block.status === 'ok' ? (
        <Image src={Icons.Check} alt="" width={12} height={12} />
      ) : (
        <Image src={Icons.XCircle} alt="" width={12} height={12} />
      )}
      <span>{label}</span>
      {block.summary && block.status !== 'running' && (
        <span className="truncate text-theme-neutral-6">· {block.summary}</span>
      )}
    </div>
  );
}

function TypingDots() {
  return (
    <div className="flex items-center gap-1 py-2" aria-hidden>
      {[0, 1, 2].map(i => (
        <span
          key={i}
          className="h-1.5 w-1.5 animate-bounce rounded-full bg-theme-neutral-6"
          style={{ animationDelay: `${i * 120}ms` }}
        />
      ))}
    </div>
  );
}
