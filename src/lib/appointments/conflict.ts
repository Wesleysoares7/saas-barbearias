export type AppointmentSlot = {
  id: string;
  employeeId: string;
  startIso: string;
  endIso: string;
  status: "agendado" | "concluido" | "cancelado";
};

export function calculateEndDateIso(startIso: string, durationMinutes: number): string {
  const startDate = new Date(startIso);

  if (Number.isNaN(startDate.getTime())) {
    throw new Error("Horario inicial invalido para calculo de termino.");
  }

  if (!Number.isFinite(durationMinutes) || durationMinutes <= 0) {
    throw new Error("Duracao do servico invalida para calculo de termino.");
  }

  const endDate = new Date(startDate.getTime() + durationMinutes * 60_000);
  return endDate.toISOString();
}

export function hasEmployeeConflict(
  slots: AppointmentSlot[],
  params: {
    employeeId: string;
    newStartIso: string;
    newEndIso: string;
    ignoreAppointmentId?: string;
  },
): boolean {
  const newStart = new Date(params.newStartIso).getTime();
  const newEnd = new Date(params.newEndIso).getTime();

  if (Number.isNaN(newStart) || Number.isNaN(newEnd)) {
    return false;
  }

  if (newEnd <= newStart) {
    return true;
  }

  return slots.some((slot) => {
    if (slot.status !== "agendado") {
      return false;
    }

    if (slot.employeeId !== params.employeeId) {
      return false;
    }

    if (params.ignoreAppointmentId && slot.id === params.ignoreAppointmentId) {
      return false;
    }

    const slotStart = new Date(slot.startIso).getTime();
    const slotEnd = new Date(slot.endIso).getTime();

    if (Number.isNaN(slotStart) || Number.isNaN(slotEnd)) {
      return false;
    }

    return newStart < slotEnd && newEnd > slotStart;
  });
}
