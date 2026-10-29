import { describe, expect, it } from 'vitest';
import { getSafeRedirectPath } from './url';

const FALLBACK = '/dashboard';

describe('getSafeRedirectPath', () => {
  it('giữ nguyên đường dẫn nội bộ hợp lệ (kể cả query và hash)', () => {
    expect(getSafeRedirectPath('/dashboard')).toBe('/dashboard');
    expect(getSafeRedirectPath('/project/12/issues/3?tab=comments#c1')).toBe(
      '/project/12/issues/3?tab=comments#c1'
    );
    // Dấu chấm trong path chỉ là path, không phải host.
    expect(getSafeRedirectPath('/project/evil.com')).toBe('/project/evil.com');
  });

  it.each([
    ['/\\evil.com', 'một backslash'],
    ['/\\\\evil.com', 'hai backslash'],
    ['//evil.com', 'protocol-relative'],
    ['/\t/evil.com', 'ký tự tab'],
    ['/\\t/evil.com', 'chuỗi backslash-t'],
    ['/\n/evil.com', 'xuống dòng'],
    ['/ evil.com', 'khoảng trắng'],
    ['/evil.com\u0000', 'ký tự điều khiển NUL'],
    ['https://evil.com', 'URL tuyệt đối'],
    ['javascript:alert(1)', 'scheme javascript'],
    ['evil.com', 'không bắt đầu bằng /'],
  ])('trả về fallback cho %j (%s)', value => {
    expect(getSafeRedirectPath(value)).toBe(FALLBACK);
  });

  it('trả về fallback khi giá trị rỗng', () => {
    expect(getSafeRedirectPath('')).toBe(FALLBACK);
    expect(getSafeRedirectPath(null)).toBe(FALLBACK);
    expect(getSafeRedirectPath(undefined)).toBe(FALLBACK);
  });

  it('tôn trọng fallback tuỳ chỉnh', () => {
    expect(getSafeRedirectPath(null, '/home')).toBe('/home');
    expect(getSafeRedirectPath('//evil.com', '/home')).toBe('/home');
  });

  it('không redirect ngược về /login để tránh vòng lặp', () => {
    expect(getSafeRedirectPath('/login')).toBe(FALLBACK);
    expect(getSafeRedirectPath('/login?registeredEmail=a%40b.c')).toBe(
      FALLBACK
    );
    expect(getSafeRedirectPath('/login/')).toBe(FALLBACK);
    expect(getSafeRedirectPath('/loginx')).toBe('/loginx');
  });
});
