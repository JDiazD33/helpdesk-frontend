import { EstadoTicket, PrioridadTicket } from './enums';

export { EstadoTicket, PrioridadTicket };

export interface Ticket {
  id: number;
  codigo: string;
  titulo: string;
  descripcion: string;
  estado: EstadoTicket;
  prioridad: PrioridadTicket;
  justificacionCierre?: string;
  imagenCierre?: string;
  // Calificación (1-5 estrellas) que el cliente da al agente al resolver.
  calificacionAgente?: number | null;
  fechaCreacion: string;
  fechaActualizacion: string;
  telefonoReportante?: string;
  correoReportante?: string;
  cliente?: { id: number; nombres: string; apellidos: string };
  agenteAsignado?: { id: number; nombres: string; apellidos: string } | null;
  categoria?: { id: number; nombre: string } | null;
  problema?: { id: number; nombre: string } | null;
  empresa?: { id: number; nombre: string };
}

export interface TicketConComentarioRequest {
  ticket: Partial<Ticket>;
  mensajeInicial: string;
  usuarioComentarioId: number;
}

export interface CambiarEstadoRequest {
  estado: EstadoTicket;
  justificacionCierre?: string;
  usuarioId?: number;
}

export interface CierreRequest {
  justificacionCierre: string;
  imagenCierre?: string;
  usuarioId: number;
}

export interface AsignarAgenteRequest {
  agenteId: number;
}

/** Fila del ranking de mejores agentes. El backend devuelve un arreglo en este orden. */
export interface RankingAgente {
  agenteId: number;
  nombres: string;
  apellidos: string;
  promedio: number;
  totalTickets: number;
}
