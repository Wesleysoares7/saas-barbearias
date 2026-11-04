"use client";

import * as React from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { Spinner } from "@/components/ui/spinner";

type PendingButtonProps = Omit<React.ComponentProps<typeof Button>, "asChild"> & {
  pendingLabel?: React.ReactNode;
};

export function PendingButton({ pendingLabel, children, disabled, ...props }: PendingButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button {...props} disabled={disabled || pending} aria-busy={pending || undefined}>
      {pending ? (
        <>
          <Spinner />
          {pendingLabel ?? children}
        </>
      ) : (
        children
      )}
    </Button>
  );
}
