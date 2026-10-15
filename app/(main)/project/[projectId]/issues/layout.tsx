'use client';

import { IssuesWorkspace } from '@/components/issues/issues-workspace';

export default function IssuesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <IssuesWorkspace>{children}</IssuesWorkspace>;
}
