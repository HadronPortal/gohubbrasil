export function translateAppointmentStatus(status?: string | null): string {
  const raw = (status ?? "").toString().trim();
  if (!raw) return "Agendado";
  const s = raw.toLowerCase();
  switch (s) {
    case "confirmed":
    case "confirmado":
      return "Confirmado";
    case "pending":
    case "pendente":
      return "Pendente";
    case "cancelled":
    case "canceled":
    case "cancelado":
      return "Cancelado";
    case "completed":
    case "finalizado":
    case "finished":
      return "Finalizado";
    case "no_show":
    case "noshow":
    case "nao_compareceu":
      return "Não compareceu";
    case "scheduled":
    case "agendado":
      return "Agendado";
    default:
      return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
  }
}

export function statusBadgeClasses(status?: string | null): string {
  const label = translateAppointmentStatus(status);
  switch (label) {
    case "Confirmado":
      return "text-[#15803D] border-[#86EFAC] bg-[#DCFCE7]";
    case "Pendente":
      return "text-[#B45309] border-[#FCD34D] bg-[#FEF3C7]";
    case "Cancelado":
      return "text-[#B91C1C] border-[#FCA5A5] bg-[#FEE2E2]";
    case "Finalizado":
      return "text-[#1D4ED8] border-[#93C5FD] bg-[#DBEAFE]";
    case "Não compareceu":
      return "text-[#B45309] border-[#FCD34D] bg-[#FEF3C7]";
    case "Agendado":
    default:
      return "text-[#475569] border-[#CBD5E1] bg-[#F1F5F9]";
  }
}