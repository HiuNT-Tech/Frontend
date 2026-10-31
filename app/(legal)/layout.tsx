import { DocumentTitle } from '@/components/document-title';

export default function LegalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <DocumentTitle />
      {children}
    </>
  );
}
