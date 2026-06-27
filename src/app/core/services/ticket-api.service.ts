import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AsignarAgenteRequest,
  CambiarEstadoRequest,
  CierreRequest,
  EstadoTicket,
  PrioridadTicket,
  RankingAgente,
  Ticket,
  TicketConComentarioRequest,
} from '../models/ticket.model';

@Injectable({ providedIn: 'root' })
export class TicketApiService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/tickets`;

  listarTodos(agente?: boolean): Observable<Ticket[]> {
    let p = new HttpParams();
    if (agente !== undefined) p = p.set('agente', String(agente));
    return this.http.get<Ticket[]>(this.url, { params: p });
  }
  buscarPorId(id: number): Observable<Ticket> { return this.http.get<Ticket>(`${this.url}/${id}`); }
  buscarPorCodigo(codigo: string): Observable<Ticket> { return this.http.get<Ticket>(`${this.url}/codigo/${codigo}`); }
  listarPorEmpresa(empresaId: number, agente?: boolean): Observable<Ticket[]> {
    let p = new HttpParams();
    if (agente !== undefined) p = p.set('agente', String(agente));
    return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}`, { params: p });
  }
  listarPorCliente(clienteId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/cliente/${clienteId}`); }
  listarPorAgente(agenteId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/agente/${agenteId}`); }
  listarPorEstado(estado: EstadoTicket): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/estado/${estado}`); }
  listarPorPrioridad(prioridad: PrioridadTicket): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/prioridad/${prioridad}`); }
  listarPorCategoria(categoriaId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/categoria/${categoriaId}`); }
  detallePorEmpresa(empresaId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/detalle`); }
  filtrar(empresaId: number, estado?: EstadoTicket, prioridad?: PrioridadTicket): Observable<Ticket[]> {
    let p = new HttpParams();
    if (estado) p = p.set('estado', estado);
    if (prioridad) p = p.set('prioridad', prioridad);
    return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/filtrar`, { params: p });
  }
  contarPorEstado(empresaId: number): Observable<[string, number][]> { return this.http.get<[string, number][]>(`${this.url}/empresa/${empresaId}/conteo`); }
  listarPorAgenteYEstado(agenteId: number, estado: EstadoTicket): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/agente/${agenteId}/estado/${estado}`);
  }
  listarPorPeriodo(empresaId: number, inicio: string, fin: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/periodo`, {
      params: new HttpParams().set('inicio', inicio).set('fin', fin),
    });
  }
  prioridadAlta(empresaId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/prioridad-alta`); }
  prioridadAltaGlobal(): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/prioridad-alta`); }
  buscarPorTexto(empresaId: number, texto: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/buscar`, { params: new HttpParams().set('texto', texto) });
  }
  sinAsignar(empresaId: number): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/sin-asignar`); }
  sinAsignarGlobal(): Observable<Ticket[]> { return this.http.get<Ticket[]>(`${this.url}/sin-asignar`); }
  listarPorPeriodoGlobal(inicio: string, fin: string): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/periodo`, {
      params: new HttpParams().set('inicio', inicio).set('fin', fin),
    });
  }
  detallePorCliente(clienteId: number, empresaId: number): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/cliente/${clienteId}/empresa/${empresaId}/detalle`);
  }
  actualizados(empresaId: number, dias = 7): Observable<Ticket[]> {
    return this.http.get<Ticket[]>(`${this.url}/empresa/${empresaId}/actualizados`, { params: new HttpParams().set('dias', String(dias)) });
  }

  guardar(payload: Partial<Ticket>): Observable<Ticket> { return this.http.post<Ticket>(this.url, payload); }
  guardarConComentario(payload: TicketConComentarioRequest): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.url}/completo`, payload);
  }
  actualizar(id: number, payload: Partial<Ticket>): Observable<Ticket> { return this.http.put<Ticket>(`${this.url}/${id}`, payload); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  cambiarEstado(id: number, payload: CambiarEstadoRequest): Observable<Ticket> { return this.http.put<Ticket>(`${this.url}/${id}/estado`, payload); }
  asignarAgente(id: number, payload: AsignarAgenteRequest): Observable<Ticket> { return this.http.put<Ticket>(`${this.url}/${id}/asignar`, payload); }
  subirImagenCierre(id: number, file: File): Observable<{ imagenCierre: string }> {
    const fd = new FormData();
    fd.append('file', file);
    return this.http.post<{ imagenCierre: string }>(`${this.url}/${id}/imagen-cierre`, fd);
  }
  guardarCierre(id: number, payload: CierreRequest): Observable<Ticket> {
    return this.http.patch<Ticket>(`${this.url}/${id}/cierre`, payload);
  }

  /** El cliente dueño califica (1-5) la atención de un ticket resuelto. */
  calificar(id: number, calificacion: number): Observable<Ticket> {
    return this.http.post<Ticket>(`${this.url}/${id}/calificar`, { calificacion });
  }

  /** Ranking de mejores agentes por promedio de calificación. */
  rankingAgentes(empresaId?: number): Observable<RankingAgente[]> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresaId', String(empresaId));
    return this.http.get<RankingAgente[]>(`${this.url}/ranking-agentes`, { params });
  }
}
