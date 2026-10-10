"use client";

import type { ReactNode } from "react";

import { StatusPill } from "@/components/painel/ui/status-pill";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { formatDateTimeBR, isoToLocalInputValue } from "@/lib/datetime";

type AppointmentDetailsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  statusLabel: string;
  statusTone: "success" | "danger" | "warning";
  clienteNome: string;
  clienteTelefone: string | null;
  dataHora: string;
  dataHoraFim: string | null;
  servicoNome: string;
  servicoDuracao?: number;
  servicoValor?: number;
  funcionarioNome: string;
  observacoes: string | null;
  footer: ReactNode;
};

const currencyFormatter = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

const CONTACT_LINK_CLASS =
  "inline-flex min-h-11 items-center rounded-lg border border-border px-3 text-sm font-medium text-foreground hover:border-brand hover:text-brand";

function DetailItem({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="space-y-0.5">
      <p className="text-xs text-muted-foreground">{label}</p>
      <div className="text-sm break-words text-foreground">{children}</div>
    </div>
  );
}

export function AppointmentDetailsDialog({
  open,
  onOpenChange,
  statusLabel,
  statusTone,
  clienteNome,
  clienteTelefone,
  dataHora,
  dataHoraFim,
  servicoNome,
  servicoDuracao,
  servicoValor,
  funcionarioNome,
  observacoes,
  footer,
}: AppointmentDetailsDialogProps) {
  const phone = clienteTelefone?.trim() ?? "";
  const digits = phone.replace(/\D/g, "");
  const canContact = digits.length === 10 || digits.length === 11;
  const endTime = dataHoraFim ? isoToLocalInputValue(dataHoraFim).slice(11, 16) : "";
  const serviceExtras = [
    servicoDuracao && servicoDuracao > 0 ? `${servicoDuracao} min` : "",
    typeof servicoValor === "number" ? currencyFormatter.format(servicoValor) : "",
  ].filter(Boolean);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90dvh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Detalhes do agendamento</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          <StatusPill tone={statusTone}>{statusLabel}</StatusPill>

          <div className="grid gap-4 sm:grid-cols-2">
            <DetailItem label="Cliente">{clienteNome}</DetailItem>

            <DetailItem label="Telefone">
              <p>{phone || "-"}</p>
              {canContact ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  <a href={`tel:+55${digits}`} className={CONTACT_LINK_CLASS}>
                    Ligar
                  </a>
                  <a href={`https://wa.me/55${digits}`} target="_blank" rel="noopener noreferrer" className={CONTACT_LINK_CLASS}>
                    WhatsApp
                  </a>
                </div>
              ) : null}
            </DetailItem>

            <DetailItem label="Horario">
              {formatDateTimeBR(dataHora)}
              {endTime ? ` ate ${endTime}` : ""}
            </DetailItem>

            <DetailItem label="Funcionario">{funcionarioNome}</DetailItem>

            <div className="sm:col-span-2">
              <DetailItem label="Servico">
                {servicoNome}
                {serviceExtras.length > 0 ? ` - ${serviceExtras.join(" - ")}` : ""}
              </DetailItem>
            </div>

            <div className="sm:col-span-2">
              <DetailItem label="Observacoes">{observacoes?.trim() || "-"}</DetailItem>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2 border-t border-border pt-4">{footer}</div>
        </div>
      </DialogContent>
    </Dialog>
  );
}