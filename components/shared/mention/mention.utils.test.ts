import { describe, expect, it } from 'vitest';
import {
  MENTION_REGEX,
  detectMentionQuery,
  filterMentionCandidates,
  insertMention,
  isInsideCode,
  isMentionableUserCode,
  parseMentions,
} from './mention.utils';

describe('MENTION_REGEX / parseMentions', () => {
  it('matches the BE regex: no email, no word prefix, dedupe in order', () => {
    expect(MENTION_REGEX.source).toBe('(?<![\\w@.])@([A-Za-z0-9_-]{2,32})');
    expect(
      parseMentions(
        'hi @U-000001 a@b.com abc@U-000002 (@U-000003) @U-000001 @a'
      )
    ).toEqual(['U-000001', 'U-000003']);
  });
});

describe('detectMentionQuery', () => {
  it('opens on @ at start, after space or punctuation, with the typed query', () => {
    expect(detectMentionQuery('xin chào @ad', 12)).toEqual({
      start: 9,
      query: 'ad',
    });
    expect(detectMentionQuery('(@', 2)).toEqual({ start: 1, query: '' });
    expect(detectMentionQuery('@', 1)).toEqual({ start: 0, query: '' });
  });

  it('does not open after a word char, @ or dot, nor inside code', () => {
    expect(detectMentionQuery('abc@', 4)).toBeNull();
    expect(detectMentionQuery('a@b.', 4)).toBeNull();
    expect(detectMentionQuery('x@@', 3)).toBeNull();
    expect(detectMentionQuery('@ab ', 4)).toBeNull();
    expect(detectMentionQuery('```\n@u', 6)).toBeNull();
    expect(detectMentionQuery('`@u', 3)).toBeNull();
    expect(detectMentionQuery('`code` @u', 9)).toEqual({
      start: 7,
      query: 'u',
    });
  });
});

describe('isInsideCode', () => {
  it('counts open fences and odd backticks on the current line', () => {
    expect(isInsideCode('```\n@', 4)).toBe(true);
    expect(isInsideCode('```\n@\n```\n@', 10)).toBe(false);
    expect(isInsideCode('~~~\n@', 4)).toBe(true);
    expect(isInsideCode('`@', 1)).toBe(true);
    expect(isInsideCode('`code` @', 7)).toBe(false);
  });
});

describe('insertMention / filter / isMentionableUserCode', () => {
  it('replaces @query with @userCode and a trailing space', () => {
    expect(insertMention('hi @me tail', 3, 6, 'U-000008')).toEqual({
      value: 'hi @U-000008  tail',
      caret: 13,
    });
  });

  it('filters case-insensitively, startsWith first, limited', () => {
    const items = [
      {
        userCode: 'U-000008',
        displayName: 'Member',
        email: 'member@example.com',
        avatar: null,
      },
      {
        userCode: 'U-000001',
        displayName: 'Admin',
        email: 'admin@example.com',
        avatar: null,
      },
      {
        userCode: 'U-000002',
        displayName: 'Zed',
        email: 'me@example.com',
        avatar: null,
      },
    ];
    expect(filterMentionCandidates(items, 'ME').map(c => c.userCode)).toEqual([
      'U-000008',
      'U-000002',
    ]);
    expect(filterMentionCandidates(items, '', 2)).toHaveLength(2);
    expect(filterMentionCandidates(items, 'zzz')).toEqual([]);
  });

  it('accepts only codes the BE regex can parse', () => {
    expect(isMentionableUserCode('U-000001')).toBe(true);
    expect(isMentionableUserCode('a')).toBe(false);
    expect(isMentionableUserCode('x'.repeat(33))).toBe(false);
    expect(isMentionableUserCode('bad code')).toBe(false);
    expect(isMentionableUserCode(null)).toBe(false);
  });
});
