import { describe, expect, it } from 'vitest';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';

import { ConfirmContent } from './confirm-content';

describe('ConfirmContent', () => {
  it('renders user-provided text without interpreting it as HTML', () => {
    const html = renderToStaticMarkup(
      <ConfirmContent content={'Remove <img src=x onerror=alert(1)>?'} />
    );

    expect(html).not.toContain('<img');
    expect(html).toContain('&lt;img src=x onerror=alert(1)&gt;');
  });

  it('keeps the pre-wrap class so line breaks in i18n strings still show', () => {
    const html = renderToStaticMarkup(<ConfirmContent content={'a\nb'} />);

    expect(html).toContain('whitespace-break-spaces');
    expect(html).toContain('a\nb');
  });
});
