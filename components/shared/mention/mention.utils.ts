import { findAndReplace } from 'mdast-util-find-and-replace';
import type { PhrasingContent, Root, Text } from 'mdast';

/** Chép nguyên văn BE notification-events.ts (README 4.2). Cờ g bắt buộc: matchAll + findAndReplace đều cần. */
export const MENTION_REGEX = /(?<![\w@.])@([A-Za-z0-9_-]{2,32})/g;
/** userCode chèn được thành mention hợp lệ (BE parse được). userCode thật: U-000001. */
export const MENTIONABLE_USER_CODE_REGEX = /^[A-Za-z0-9_-]{2,32}$/;
/** Query đang gõ ngay trước caret: "@ab" → ab; cho phép rỗng để mở popup ngay khi gõ @. */
const MENTION_TRIGGER_REGEX = /(?:^|[^\w@.])@([A-Za-z0-9_-]{0,32})$/;
/**
 * Nhãn mention trong ô soạn: `@[Tên hiển thị]`. Chỉ tồn tại phía FE để người dùng thấy tên
 * thay vì mã; đổi về `@userCode` (toMentionCodes) trước khi gửi vì BE chỉ parse MENTION_REGEX.
 */
export const MENTION_LABEL_REGEX = /@\[([^[\]\n]{1,64})\]/g;
const MENTION_LABEL_MAX_LENGTH = 64;

export interface MentionCandidate {
  userCode: string;
  displayName: string;
  email: string;
  avatar: string | null;
}

export const isMentionableUserCode = (
  code: string | null | undefined
): code is string => !!code && MENTIONABLE_USER_CODE_REGEX.test(code);

/** Dedupe, giữ thứ tự xuất hiện. matchAll clone regex nên không dính lastIndex. */
export const parseMentions = (content: string): string[] =>
  Array.from(new Set(Array.from(content.matchAll(MENTION_REGEX), m => m[1])));

/**
 * Caret có nằm trong code markdown không: (a) số dòng mở fence ``` / ~~~ trước caret là lẻ,
 * hoặc (b) số backtick trên dòng hiện tại trước caret là lẻ (inline code). Xấp xỉ đủ dùng,
 * không parse markdown thật.
 */
export const isInsideCode = (value: string, pos: number): boolean => {
  const before = value.slice(0, pos);
  const fences = before.match(/^ {0,3}(`{3,}|~{3,})/gm)?.length ?? 0;
  if (fences % 2 === 1) return true;
  const line = before.slice(before.lastIndexOf('\n') + 1);
  return (line.split('`').length - 1) % 2 === 1;
};

export interface MentionQuery {
  /** vị trí ký tự '@' */
  start: number;
  query: string;
}

export const detectMentionQuery = (
  value: string,
  caret: number
): MentionQuery | null => {
  const match = MENTION_TRIGGER_REGEX.exec(value.slice(0, caret));
  if (!match) return null;
  const start = caret - match[1].length - 1;
  if (isInsideCode(value, start)) return null;
  return { start, query: match[1] };
};

/**
 * Tên hiển thị dùng được làm nhãn `@[Tên]`: không rỗng, ≤ 64 ký tự, không chứa [ ] hay xuống
 * dòng, và chỉ một member trong danh sách mang tên đó (trùng tên → null, dùng mã cho khỏi nhầm).
 */
export const mentionLabelFor = (
  candidate: MentionCandidate,
  candidates: readonly MentionCandidate[]
): string | null => {
  const name = candidate.displayName.trim();
  if (!name || name.length > MENTION_LABEL_MAX_LENGTH || /[[\]\n]/.test(name)) {
    return null;
  }
  const sameName = candidates.filter(c => c.displayName.trim() === name);
  return sameName.length === 1 ? name : null;
};

/** Token chèn vào ô soạn khi chọn gợi ý: ưu tiên `@[Tên]`, không được thì `@userCode`. */
export const mentionInsertToken = (
  candidate: MentionCandidate,
  candidates: readonly MentionCandidate[]
): string => {
  const label = mentionLabelFor(candidate, candidates);
  return label ? `@[${label}]` : `@${candidate.userCode}`;
};

/** Thay "@query" (từ start tới caret) bằng `${token} ` và trả caret mới. */
export const insertMention = (
  value: string,
  start: number,
  caret: number,
  token: string
): { value: string; caret: number } => {
  const inserted = `${token} `;
  return {
    value: value.slice(0, start) + inserted + value.slice(caret),
    caret: start + inserted.length,
  };
};

/**
 * Trước khi gửi: `@[Tên]` → `@userCode` khi tên khớp đúng một member; không khớp (gõ tay,
 * trùng tên, đã rời board) giữ nguyên chữ.
 */
export const toMentionCodes = (
  content: string,
  candidates: readonly MentionCandidate[]
): string => {
  if (!candidates.length || !content.includes('@[')) return content;
  const codeByName = new Map<string, string | null>(); // null = trùng tên
  for (const c of candidates) {
    const name = c.displayName.trim();
    codeByName.set(name, codeByName.has(name) ? null : c.userCode);
  }
  return content.replace(MENTION_LABEL_REGEX, (match, name: string) => {
    const code = codeByName.get(name.trim());
    return code ? `@${code}` : match;
  });
};

/** Khi mở sửa comment: `@userCode` → `@[Tên]` để người dùng thấy tên; mã lạ giữ nguyên. */
export const toMentionLabels = (
  content: string,
  candidates: readonly MentionCandidate[]
): string => {
  if (!candidates.length) return content;
  const byCode = new Map(candidates.map(c => [c.userCode, c]));
  return content.replace(MENTION_REGEX, (match, code: string) => {
    const candidate = byCode.get(code);
    const label = candidate && mentionLabelFor(candidate, candidates);
    return label ? `@[${label}]` : match;
  });
};

const rank = (c: MentionCandidate, q: string): number => {
  if (!q) return 1;
  if (
    c.userCode.toLowerCase().startsWith(q) ||
    c.displayName.toLowerCase().startsWith(q)
  ) {
    return 0;
  }
  if (
    c.userCode.toLowerCase().includes(q) ||
    c.displayName.toLowerCase().includes(q)
  ) {
    return 1;
  }
  return 2; // khớp email
};

export const filterMentionCandidates = (
  candidates: readonly MentionCandidate[],
  query: string,
  limit = 8
): MentionCandidate[] => {
  const q = query.trim().toLowerCase();
  return candidates
    .filter(
      c =>
        !q ||
        c.userCode.toLowerCase().includes(q) ||
        c.displayName.toLowerCase().includes(q) ||
        c.email.toLowerCase().includes(q)
    )
    .sort(
      (a, b) =>
        rank(a, q) - rank(b, q) || a.displayName.localeCompare(b.displayName)
    )
    .slice(0, limit);
};

type MentionTextNode = Text & {
  data: { hName: string; hProperties: Record<string, unknown> };
};

const mentionNode = (
  value: string,
  hProperties: Record<string, unknown>
): MentionTextNode => ({
  type: 'text',
  value,
  data: {
    hName: 'span',
    hProperties: { className: ['mention'], ...hProperties },
  },
});

/**
 * Remark plugin: text node "@U-000001" → <span class="mention" data-mention="U-000001">@U-000001</span>;
 * nhãn trong ô soạn "@[Tên]" (preview trước khi gửi) → <span class="mention" data-mention-label="Tên">.
 * Chỉ duyệt node `text` (mdast-util-find-and-replace) nên inlineCode/code không bị đụng; bỏ qua link.
 * Không tạo HTML thô → react-markdown render bằng React element, không dangerouslySetInnerHTML.
 */
export const remarkMention = () => (tree: Root) => {
  findAndReplace(
    tree,
    [
      [
        MENTION_LABEL_REGEX,
        (match: string, label: string): PhrasingContent =>
          mentionNode(match, { dataMentionLabel: label }),
      ],
      [
        MENTION_REGEX,
        (match: string, userCode: string): PhrasingContent =>
          mentionNode(match, { dataMention: userCode }),
      ],
    ],
    { ignore: ['link', 'linkReference'] }
  );
};
