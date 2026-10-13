'use client';

import React, { createContext, useContext } from 'react';
import type { Components } from 'react-markdown';

/** userCode → displayName của member hiện tại trên board; rỗng = không tooltip. */
export const MentionMembersContext = createContext<ReadonlyMap<string, string>>(
  new Map()
);

/**
 * Renderer cho <span> do remarkMention sinh (node.properties.dataMention). Span thường (không có
 * data-mention) trả về nguyên. Text con là text node của markdown → React escape, không XSS.
 */
export const MentionText: Components['span'] = ({
  node,
  children,
  ...rest
}) => {
  const members = useContext(MentionMembersContext);
  const userCode = node?.properties?.dataMention;
  if (typeof userCode !== 'string') return <span {...rest}>{children}</span>;
  const displayName = members.get(userCode);
  return (
    <span {...rest} data-mention={userCode} title={displayName}>
      {children}
    </span>
  );
};

export const MENTION_MARKDOWN_COMPONENTS: Components = { span: MentionText };
