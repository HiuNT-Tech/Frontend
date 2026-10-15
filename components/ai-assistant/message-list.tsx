'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import ReactMarkdown from 'react-markdown';
import { Check, CircleX, Copy, LoaderCircle } from 'lucide-react';
import { MARKDOWN_REMARK_PLUGINS } from '@/constant/markdown';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import type { EntityId } from '@/config/interface';
import type {
  AiChatMessage,
  AiMessageBlock,
  AiProposalState,
} from '@/types/ai-assistant';
import { ActionCard } from './action-card';
import { AiMark } from './ai-mark';
import { CardChipList } from './card-chip-list';

/** Markdown của câu trả lời: 14.5px/1.6, chữ ink-2, code trên nền fill. */
const markdownClassName =
  'max-w-none text-[14.5px] leading-[1.6] text-ink-2 text-pretty [&_h1]:text-base [&_h1]:font-semibold [&_h1]:text-ink [&_h1]:mt-3 [&_h1]:mb-1 [&_h2]:text-[15px] [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-3 [&_h2]:mb-1 [&_h3]:text-[14.5px] [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-2 [&_h3]:mb-1 [&_h1:first-child]:mt-0 [&_h2:first-child]:mt-0 [&_h3:first-child]:mt-0 [&_p]:mb-2 [&_p:last-child]:mb-0 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_ul:last-child]:mb-0 [&_ol:last-child]:mb-0 [&_li]:mb-1 [&_li]:marker:text-muted [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic [&_a]:text-accent [&_a]:font-medium [&_a]:hover:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-3 [&_blockquote]:text-muted [&_code]:bg-fill [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-md [&_code]:text-[13px] [&_code]:font-mono [&_code]:text-ink [&_pre]:bg-fill [&_pre]:p-3 [&_pre]:rounded-xl [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_pre]:text-[13px] [&_pre_code]:bg-transparent [&_pre_code]:p-0 [&_table]:w-full [&_table]:text-[13px] [&_table]:mb-2 [&_table]:tabular-nums [&_th]:text-left [&_th]:font-semibold [&_th]:text-muted [&_th]:border-b [&_th]:border-line [&_th]:px-2 [&_th]:py-1.5 [&_td]:border-b [&_td]:border-line-2 [&_td]:px-2 [&_td]:py-1.5 [&_hr]:my-3 [&_hr]:border-line';

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
    <div className="flex flex-col gap-3.5 px-4 py-4" aria-live="polite">
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

/** Tin của người dùng: bong bóng lặng, canh phải, nền fill. */
function UserMessage({ message }: { message: AiChatMessage }) {
  return (
    <div className="flex justify-end pl-8">
      <div className="max-w-[85%] whitespace-pre-wrap text-pretty rounded-2xl rounded-br-md bg-fill px-4 py-2.5 text-[14.5px] leading-[1.55] text-ink">
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

type IndexedBlock = { block: AiMessageBlock; index: number };
/**
 * Một tin trả lời được chia thành các đoạn: văn bản / hoạt động tool / card
 * gom vào một thẻ trắng; đề xuất và lỗi đứng riêng (tránh thẻ lồng thẻ).
 */
type Segment =
  | { kind: 'card'; blocks: IndexedBlock[] }
  | { kind: 'standalone'; item: IndexedBlock };

const splitSegments = (blocks: AiMessageBlock[]): Segment[] => {
  const segments: Segment[] = [];
  blocks.forEach((block, index) => {
    if (block.kind === 'proposal' || block.kind === 'error') {
      segments.push({ kind: 'standalone', item: { block, index } });
      return;
    }
    const last = segments[segments.length - 1];
    if (last && last.kind === 'card') {
      last.blocks.push({ block, index });
    } else {
      segments.push({ kind: 'card', blocks: [{ block, index }] });
    }
  });
  return segments;
};

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
  const segments = useMemo(
    () => splitSegments(message.blocks),
    [message.blocks]
  );
  const lastIndex = message.blocks.length - 1;

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
    <div className="group flex gap-2.5 pr-2">
      <AiMark size={22} spin={isStreaming} className="mt-3" />
      <div className="flex min-w-0 flex-1 flex-col gap-2.5">
        {waitingFirstToken && <Thinking />}
        {segments.map((segment, segmentIndex) =>
          segment.kind === 'standalone' ? (
            <Block
              key={`${message.id}-${segment.item.index}`}
              boardId={boardId}
              messageId={message.id}
              block={segment.item.block}
              isStreamingTail={false}
              isLast={isLast}
              onApply={onApply}
              onCancel={onCancel}
              onRetryProposal={onRetryProposal}
              onRetry={onRetry}
            />
          ) : (
            <div
              key={`${message.id}-seg-${segmentIndex}`}
              className="animate-pop min-w-0 rounded-card border border-line bg-card px-4 py-3.5 shadow-card"
            >
              <div className="flex flex-col gap-2.5">
                {segment.blocks.map(({ block, index }) => (
                  <Block
                    key={`${message.id}-${index}`}
                    boardId={boardId}
                    messageId={message.id}
                    block={block}
                    isStreamingTail={
                      isStreaming &&
                      index === lastIndex &&
                      block.kind === 'text'
                    }
                    isLast={isLast}
                    onApply={onApply}
                    onCancel={onCancel}
                    onRetryProposal={onRetryProposal}
                    onRetry={onRetry}
                  />
                ))}
              </div>
            </div>
          )
        )}
        {hasText && !isStreaming && (
          <div className="-mt-1 flex justify-end transition-opacity duration-200 ease-soft focus-within:opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
            <Button
              type="button"
              variant="ghost"
              size="xs"
              className="h-7 gap-1 px-2 text-muted"
              onClick={copy}
              aria-live="polite"
            >
              {copied ? (
                <Check aria-hidden="true" />
              ) : (
                <Copy aria-hidden="true" />
              )}
              {copied ? t('aiAssistant.copied') : t('aiAssistant.copy')}
            </Button>
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
        <div
          role="alert"
          className="animate-pop flex flex-wrap items-center justify-between gap-2 rounded-xl bg-danger-soft px-3.5 py-2.5 text-[13px] leading-relaxed text-danger"
        >
          <span className="min-w-0 flex-1 text-pretty">
            {t(`aiAssistant.error.${block.code}`, {
              defaultValue: block.message || t('aiAssistant.error.generic'),
            })}
          </span>
          {isLast && block.code !== 'AI_NOT_CONFIGURED' && (
            <Button type="button" variant="outline" size="sm" onClick={onRetry}>
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
        'flex min-w-0 items-center gap-1.5 text-[12.5px] text-muted',
        block.status === 'error' && 'text-danger'
      )}
    >
      {block.status === 'running' ? (
        <LoaderCircle
          className="size-3.5 flex-none animate-spin"
          aria-hidden="true"
        />
      ) : block.status === 'ok' ? (
        <Check className="size-3.5 flex-none" aria-hidden="true" />
      ) : (
        <CircleX className="size-3.5 flex-none" aria-hidden="true" />
      )}
      <span className="flex-none">{label}</span>
      {block.summary && block.status !== 'running' && (
        <span className="min-w-0 truncate text-faint">· {block.summary}</span>
      )}
    </div>
  );
}

/** Đang chờ token đầu tiên: khung xương hình đoạn văn + một dòng trạng thái. */
function Thinking() {
  const { t } = useTranslation();
  return (
    <div
      role="status"
      aria-live="polite"
      className="animate-pop flex flex-col gap-2.5 rounded-card border border-line bg-card px-4 py-4 shadow-card"
    >
      {[78, 94, 62].map((width, index) => (
        <div
          key={index}
          className="skel h-[11px] rounded-md"
          style={{ width: `${width}%`, animationDelay: `${index * 120}ms` }}
        />
      ))}
      <span className="mt-0.5 text-[12.5px] text-muted">
        {t('aiAssistant.thinking')}
      </span>
    </div>
  );
}
