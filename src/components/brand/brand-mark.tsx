export function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      aria-hidden="true"
      fill="none"
    >
      <path
        d="M8 44V22C8 13.2 15.2 6 24 6s16 7.2 16 16v22Z"
        className="text-brand"
        fill="currentColor"
      />
      <path
        d="M16.5 27.5l5.5 5.5 10-12"
        stroke="var(--background)"
        strokeWidth="3.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}
