"use client";

import { useRouter } from "next/navigation";
import { useEffect } from "react";

export function AutoRefresh({
  everyMs = 30000,
}: Readonly<{ everyMs?: number }>) {
  const router = useRouter();

  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") {
        router.refresh();
      }
    }, everyMs);

    return () => clearInterval(id);
  }, [router, everyMs]);

  return null;
}
