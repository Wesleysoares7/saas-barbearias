"use client";

import { useState } from "react";

interface CompletedAppointmentItemProps {
  appointment: {
    id: string;
    cliente_nome: string;
    cliente_telefone: string | null;
    data_hora: string;
    data_hora_fim: string | null;
    observacoes: string | null;
  };
}

export function CompletedAppointmentItem({ appointment }: CompletedAppointmentItemProps) {
  const [showDetails, setShowDetails] = useState(false);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('pt-BR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  return (
    <div className="rounded-lg border border-emerald-500/20 bg-emerald-600/10 p-3">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-medium text-emerald-200">
            {appointment.cliente_nome}
          </h4>
          <p className="text-xs text-emerald-400/80">
            {formatDate(appointment.data_hora)}
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <span className="flex-shrink-0 rounded-full bg-emerald-600/20 px-2 py-1 text-xs font-medium text-emerald-300">
            Concluído
          </span>
          
          <button
            onClick={() => setShowDetails(!showDetails)}
            className="flex-shrink-0 rounded-md bg-zinc-700/50 p-1.5 text-xs text-zinc-300 hover:bg-zinc-600/50 hover:text-zinc-100"
            title="Ver detalhes do agendamento"
          >
            {showDetails ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {showDetails && (
        <div className="mt-3 pt-3 border-t border-emerald-500/20">
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <p className="text-zinc-400">Telefone:</p>
              <p className="text-emerald-200">
                {appointment.cliente_telefone || 'Não informado'}
              </p>
            </div>
            <div>
              <p className="text-zinc-400">Duração:</p>
              <p className="text-emerald-200">
                {appointment.data_hora_fim 
                  ? `${Math.round((new Date(appointment.data_hora_fim).getTime() - new Date(appointment.data_hora).getTime()) / 60000)} min` 
                  : 'Não definida'}
              </p>
            </div>
            
            {appointment.observacoes && (
              <div className="col-span-2">
                <p className="text-zinc-400">Observações:</p>
                <p className="text-emerald-200">
                  {appointment.observacoes}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}