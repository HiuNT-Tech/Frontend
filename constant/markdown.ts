import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { remarkMention } from '@/components/shared/mention/mention.utils';

export const MARKDOWN_PROSE_CLASSNAME =
  // Chữ markdown (mô tả, bình luận, preview): 14.5px/1.6, màu ink-2; mọi màu đi qua token để đổi theo sáng/tối.
  'prose prose-sm max-w-none text-[14.5px] leading-[1.6] text-ink-2 [&_h1]:text-lg [&_h1]:font-bold [&_h1]:text-ink [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-ink [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-ink [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-semibold [&_strong]:text-ink [&_em]:italic [&_a]:text-accent [&_a]:hover:underline [&_blockquote]:border-l-2 [&_blockquote]:border-line-strong [&_blockquote]:pl-4 [&_blockquote]:text-muted [&_code]:bg-fill [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded-[6px] [&_code]:text-[13px] [&_code]:font-mono [&_code]:text-ink [&_pre]:bg-fill [&_pre]:p-3 [&_pre]:rounded-[10px] [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_.mention]:rounded-[6px] [&_.mention]:bg-accent-soft [&_.mention]:px-1 [&_.mention]:font-medium [&_.mention]:text-accent-text [&_.mention-self]:bg-warn-soft [&_.mention-self]:text-warn';

/**
 * Plugin dùng chung cho mọi chỗ render markdown (description, comment, preview
 * của editor) để nội dung hiển thị giống hệt nhau.
 *
 * `remarkBreaks` biến xuống dòng đơn thành <br> giống Backlog/GitHub — mặc định
 * CommonMark gộp chúng thành một đoạn văn liền.
 */
// remarkMention đặt sau remarkGfm: autolink email/URL của GFM chạy trước, mention trong link bị ignore.
export const MARKDOWN_REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMention];
