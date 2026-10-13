'use client';

import * as React from 'react';

import { cn } from '@/lib/utils';

function Title({ className, children, ...props }: React.ComponentProps<'div'>) {
  return (
    <div className={cn('text-normal text-neutral-100', className)} {...props}>
      {children}
    </div>
  );
}

export { Title };
