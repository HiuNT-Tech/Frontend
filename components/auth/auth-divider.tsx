/** Vạch ngăn "hoặc …" giữa nút Google và form email trên màn hình xác thực. */
export function AuthDivider({ label }: { label: string }) {
  return (
    <div
      className="flex items-center gap-3"
      role="separator"
      aria-label={label}
    >
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
      <span className="text-[12.5px] leading-none font-medium text-muted">
        {label}
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-line" />
    </div>
  );
}
