import { beforeEach, describe, expect, it } from 'vitest';

import {
  authorizationHeader,
  clearAccessToken,
  getAccessToken,
  hasAccessToken,
  setAccessToken,
  stripAuthTokens,
} from './auth-token';

describe('auth-token', () => {
  beforeEach(() => clearAccessToken());

  it('keeps the token in memory and exposes it as a Bearer header', () => {
    expect(hasAccessToken()).toBe(false);
    expect(authorizationHeader()).toEqual({});

    setAccessToken('abc');

    expect(getAccessToken()).toBe('abc');
    expect(hasAccessToken()).toBe(true);
    expect(authorizationHeader()).toEqual({ Authorization: 'Bearer abc' });
  });

  it('treats empty, null and undefined as "no token"', () => {
    setAccessToken('abc');
    setAccessToken('');
    expect(hasAccessToken()).toBe(false);

    setAccessToken('abc');
    setAccessToken(undefined);
    expect(hasAccessToken()).toBe(false);
  });

  it('strips both tokens from a user payload without touching other fields', () => {
    const stripped = stripAuthTokens({
      id: 1,
      email: 'a@b.c',
      accessToken: 'x',
      refreshToken: 'y',
    });

    expect(stripped).toEqual({ id: 1, email: 'a@b.c' });
    expect('accessToken' in stripped).toBe(false);
    expect('refreshToken' in stripped).toBe(false);
  });
});
