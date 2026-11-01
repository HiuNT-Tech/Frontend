'use client';

import React, { createContext, useContext } from 'react';
import type { Components, ExtraProps } from 'react-markdown';

import { cn } from '@/lib/utils';

export interface MentionMembersValue {
  /** userCode → displayName của member hiện tại trên board */
  members: ReadonlyMap<string, string>;
  /** userCode của người đang đăng nhập; mention trùng → tô đỏ */
  selfUserCode: string | null;
}

export const MentionMembersContext = createContext<MentionMembersValue>({
  members: new Map(),
  selfUserCode: null,
});

/**
 * Renderer cho <span> do remarkMention sinh (node.properties.dataMention). Span thường (không có
 * data-mention) trả về nguyên. Hiển thị `@displayName` khi biết member (userCode chỉ còn trong
 * data-mention để tra cứu, không hiện ra màn hình); không biết (đã rời board) → giữ text gốc.
 * Mention chính mình → thêm class `mention-self` (tô đỏ). Không dùng dangerouslySetInnerHTML.
 */
type MentionSpanProps = React.ComponentPropsWithoutRef<'span'> & ExtraProps;

export const MentionText: React.FC<MentionSpanProps> = ({
  node,
  children,
  className,
  ...rest
}) => {
  const { members, selfUserCode } = useContext(MentionMembersContext);
  const userCode = node?.properties?.dataMention;
  const label = node?.properties?.dataMentionLabel;
  // Nhãn `@[Tên]` chỉ có trong preview trước khi gửi: hiện `@Tên`, tô đỏ nếu là chính mình.
  if (typeof label === 'string') {
    const isSelf = selfUserCode !== null && members.get(selfUserCode) === label;
    return (
      <span
        {...rest}
        className={cn(className, isSelf && 'mention-self')}
        data-mention-label={label}
      >
        @{label}
      </span>
    );
  }
  if (typeof userCode !== 'string') {
    return (
      <span className={className} {...rest}>
        {children}
      </span>
    );
  }
  const displayName = members.get(userCode);
  const isSelf = selfUserCode !== null && userCode === selfUserCode;
  return (
    <span
      {...rest}
      className={cn(className, isSelf && 'mention-self')}
      data-mention={userCode}
    >
      {displayName ? `@${displayName}` : children}
    </span>
  );
};

export const MENTION_MARKDOWN_COMPONENTS: Components = { span: MentionText };
