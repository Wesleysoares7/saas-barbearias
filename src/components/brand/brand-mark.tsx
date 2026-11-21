type BrandMarkProps = Readonly<{
  size?: number;
}>;

export function BrandMark({ size = 44 }: BrandMarkProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 48 48" aria-hidden="true" focusable="false">
      <path d="M8 44V22C8 13.2 15.2 6 24 6s16 7.2 16 16v22Z" fill="currentColor" />
      <path
        d="M16.5 27.5l5.5 5.5 10-12"
        fill="none"
        stroke="var(--background)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
