import { describe, expect, it, vi } from 'vitest';

vi.mock('@/utils/constants', () => ({ API_ROOT: 'http://localhost:8017/api' }));

describe('getNotificationSocketUrl', () => {
  it('uses the origin of API_ROOT (never the /api path) plus the namespace', async () => {
    vi.doMock('@/config', () => ({
      default: { socketUrl: undefined, socketPath: undefined },
    }));
    const { getNotificationSocketUrl } = await import('./socket');
    expect(getNotificationSocketUrl()).toBe(
      'http://localhost:8017/notifications'
    );
  });

  it('prefers NEXT_PUBLIC_SOCKET_URL when set', async () => {
    vi.resetModules();
    vi.doMock('@/config', () => ({
      default: { socketUrl: 'https://ws.example.com', socketPath: '/ws' },
    }));
    const { getNotificationSocketUrl } = await import('./socket');
    expect(getNotificationSocketUrl()).toBe(
      'https://ws.example.com/notifications'
    );
  });
});
