"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const STORAGE_KEY = "cookie-notice-v1";

export function CookieNotice() {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setTimeout(() => {
      try {
        const hasAcknowledged = window.localStorage.getItem(STORAGE_KEY) === "1";
        setIsVisible(!hasAcknowledged);
      } catch {
        // localStorage indisponível: mantém oculto
        setIsVisible(false);
      }
    }, 0);
  }, []);

  const handleAccept = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // localStorage indisponível: apenas esconde
    }
    setIsVisible(false);
  };

  if (!isVisible) {
    return null;
  }

  return (
    <div
      role="region"
      aria-label="Aviso de cookies"
      className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950 border-t border-zinc-800 px-4 py-4 sm:px-6"
    >
      <div className="mx-auto max-w-7xl flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <p className="text-sm text-zinc-300">
          Usamos apenas cookies essenciais para manter você conectado.{" "}
          <Link
            href="/privacidade"
            className="text-zinc-100 underline hover:text-white transition-colors"
          >
            Saiba mais na Política de Privacidade.
          </Link>
        </p>
        <Button
          onClick={handleAccept}
          variant="default"
          size="sm"
          className="shrink-0"
        >
          Entendi
        </Button>
      </div>
    </div>
  );
}
