import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import type { Element } from 'hast';

import { MentionMembersContext, MentionText } from './MentionText';

const node = (userCode?: string): Element => ({
  type: 'element',
  tagName: 'span',
  properties: userCode ? { dataMention: userCode } : {},
  children: [],
});

const render = (
  userCode: string | undefined,
  selfUserCode: string | null,
  members: [string, string][] = [['U-000001', 'Admin']]
) =>
  renderToStaticMarkup(
    <MentionMembersContext.Provider
      value={{ members: new Map(members), selfUserCode }}
    >
      <MentionText node={node(userCode)} className="mention">
        {userCode ? `@${userCode}` : 'plain'}
      </MentionText>
    </MentionMembersContext.Provider>
  );

describe('MentionText', () => {
  it('shows @displayName for a known member without exposing the code on screen', () => {
    const html = render('U-000001', null);
    expect(html).toContain('>@Admin<');
    expect(html).not.toContain('title=');
    expect(html).toContain('data-mention="U-000001"');
    expect(html).not.toContain('mention-self');
  });

  it('adds mention-self (red) when the mention is the current user', () => {
    const html = render('U-000001', 'U-000001');
    expect(html).toContain('class="mention mention-self"');
    expect(html).toContain('>@Admin<');
  });

  it('keeps @userCode when the member is unknown (left the board)', () => {
    const html = render('U-000009', 'U-000001');
    expect(html).toContain('>@U-000009<');
    expect(html).not.toContain('title=');
    expect(html).not.toContain('mention-self');
  });

  it('renders ordinary spans untouched', () => {
    expect(render(undefined, 'U-000001')).toBe(
      '<span class="mention">plain</span>'
    );
  });
});
