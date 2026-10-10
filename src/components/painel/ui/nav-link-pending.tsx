"use client";

import { useLinkStatus } from "next/link";

export function NavLinkPending() {
  const { pending } = useLinkStatus();

  if (!pending) {
    return null;
  }

  return (
    <>
      <span aria-hidden className="pointer-events-none absolute inset-0 rounded-[inherit] bg-background/40" />
      <span aria-hidden className="absolute top-1.5 right-1.5 size-1.5 animate-pulse rounded-full bg-brand" />
    </>
  );
}
