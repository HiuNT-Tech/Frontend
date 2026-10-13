import remarkBreaks from 'remark-breaks';
import remarkGfm from 'remark-gfm';
import { remarkMention } from '@/components/shared/mention/mention.utils';

export const MARKDOWN_PROSE_CLASSNAME =
  'prose prose-sm max-w-none text-theme-neutral-11 text-sm leading-relaxed [&_h1]:text-lg [&_h1]:font-bold [&_h1]:mt-2 [&_h1]:mb-1 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:mt-2 [&_h2]:mb-1 [&_h3]:text-base [&_h3]:font-semibold [&_h3]:mt-2 [&_h3]:mb-1 [&_p]:mb-2 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:mb-2 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:mb-2 [&_li]:mb-1 [&_strong]:font-bold [&_em]:italic [&_a]:text-theme-main [&_a]:hover:underline [&_blockquote]:border-l-4 [&_blockquote]:border-theme-neutral-5 [&_blockquote]:pl-4 [&_blockquote]:italic [&_blockquote]:text-theme-neutral-8 [&_code]:bg-theme-neutral-3 [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-sm [&_code]:font-mono [&_pre]:bg-theme-neutral-3 [&_pre]:p-3 [&_pre]:rounded-lg [&_pre]:overflow-x-auto [&_pre]:mb-2 [&_.mention]:rounded [&_.mention]:bg-theme-main-1 [&_.mention]:px-1 [&_.mention]:font-medium [&_.mention]:text-theme-main-6 [&_.mention-self]:bg-red-100 [&_.mention-self]:text-red-600';

/**
 * Plugin dùng chung cho mọi chỗ render markdown (description, comment, preview
 * của editor) để nội dung hiển thị giống hệt nhau.
 *
 * `remarkBreaks` biến xuống dòng đơn thành <br> giống Backlog/GitHub — mặc định
 * CommonMark gộp chúng thành một đoạn văn liền.
 */
// remarkMention đặt sau remarkGfm: autolink email/URL của GFM chạy trước, mention trong link bị ignore.
export const MARKDOWN_REMARK_PLUGINS = [remarkGfm, remarkBreaks, remarkMention];
