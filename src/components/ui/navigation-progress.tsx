"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname, useSearchParams } from "next/navigation";

const MAX_WAIT_PROGRESS = 85;
const SAFETY_TIMEOUT_MS = 12000;
const TICK_MS = 200;

function isSameAsCurrent(url: URL) {
  return url.pathname + url.search === window.location.pathname + window.location.search;
}

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function NavigationProgress() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const routeKey = `${pathname}?${searchParams.toString()}`;

  const [progress, setProgress] = useState(0);
  const [visible, setVisible] = useState(false);

  const activeRef = useRef(false);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const safetyRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const fadeRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const resetRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearTimers = useCallback(() => {
    if (tickRef.current) clearInterval(tickRef.current);
    if (safetyRef.current) clearTimeout(safetyRef.current);
    if (fadeRef.current) clearTimeout(fadeRef.current);
    if (resetRef.current) clearTimeout(resetRef.current);
    tickRef.current = null;
    safetyRef.current = null;
    fadeRef.current = null;
    resetRef.current = null;
  }, []);

  const finish = useCallback(() => {
    if (!activeRef.current) return;
    activeRef.current = false;
    clearTimers();
    setProgress(100);
    fadeRef.current = setTimeout(() => setVisible(false), 200);
    resetRef.current = setTimeout(() => setProgress(0), 600);
  }, [clearTimers]);

  const start = useCallback(() => {
    if (activeRef.current) return;
    activeRef.current = true;
    clearTimers();

    if (prefersReducedMotion()) {
      setProgress(100);
      setVisible(true);
    } else {
      setProgress(8);
      setVisible(true);
      tickRef.current = setInterval(() => {
        setProgress((current) => current + (MAX_WAIT_PROGRESS - current) * 0.08);
      }, TICK_MS);
    }
    safetyRef.current = setTimeout(finish, SAFETY_TIMEOUT_MS);
  }, [clearTimers, finish]);

  useEffect(() => {
    finish();
  }, [routeKey, finish]);

  useEffect(() => {
    function startIfNotPrevented(event: Event) {
      // Aguarda os handlers de bolha para respeitar preventDefault.
      setTimeout(() => {
        if (!event.defaultPrevented) start();
      }, 0);
    }

    function onClick(event: MouseEvent) {
      if (
        event.defaultPrevented ||
        event.button !== 0 ||
        event.metaKey ||
        event.ctrlKey ||
        event.shiftKey ||
        event.altKey
      ) {
        return;
      }
      if (!(event.target instanceof Element)) return;
      const anchor = event.target.closest("a");
      if (!anchor || !anchor.href) return;
      if (anchor.hasAttribute("download")) return;
      if (anchor.target && anchor.target !== "_self") return;

      const url = new URL(anchor.href, window.location.href);
      if (url.origin !== window.location.origin) return;
      if (isSameAsCurrent(url)) return;

      startIfNotPrevented(event);
    }

    function onSubmit(event: SubmitEvent) {
      const form = event.target;
      if (!(form instanceof HTMLFormElement)) return;
      if (form.getAttribute("method")?.toLowerCase() !== "get") return;
      if (form.target && form.target !== "_self") return;

      const submitter = event.submitter;
      const actionAttr =
        (submitter instanceof HTMLButtonElement || submitter instanceof HTMLInputElement
          ? submitter.getAttribute("formaction")
          : null) ?? form.getAttribute("action");
      if (typeof actionAttr !== "string" && actionAttr !== null) return;

      const url = new URL(actionAttr ?? window.location.href, window.location.href);
      if (url.origin !== window.location.origin) return;

      const params = new URLSearchParams();
      new FormData(form).forEach((value, key) => {
        if (typeof value === "string") params.append(key, value);
      });
      url.search = params.toString();
      if (isSameAsCurrent(url)) return;

      startIfNotPrevented(event);
    }

    document.addEventListener("click", onClick, true);
    document.addEventListener("submit", onSubmit, true);
    return () => {
      document.removeEventListener("click", onClick, true);
      document.removeEventListener("submit", onSubmit, true);
    };
  }, [start]);

  useEffect(() => clearTimers, [clearTimers]);

  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none fixed top-0 left-0 z-[9999] h-0.5 bg-amber-400 transition-[width,opacity] duration-200 ease-out motion-reduce:transition-none ${
        visible ? "opacity-100" : "opacity-0"
      }`}
      style={{ width: `${progress}%` }}
    />
  );
}
