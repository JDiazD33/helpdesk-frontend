import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria } from '../models/categoria.model';
import { PrioridadTicket } from '../models/enums';
import { Problema } from '../models/problema.model';

/** Payload para crear un ticket reportado sin iniciar sesión. */
export interface TicketAnonimoRequest {
  correo: string;
  telefono: string;
  titulo: string;
  prioridad: PrioridadTicket;
  categoriaId: number;
  problemaId?: number | null;
  descripcion: string;
}

/** Respuesta de identificar la empresa a partir del correo. */
export interface EmpresaPorCorreo {
  empresaId: number;
  nombreEmpresa: string;
}

/** Respuesta al crear un ticket anónimo. */
export interface TicketAnonimoResponse {
  codigo: string;
  mensaje: string;
}

/**
 * Servicio para el reporte de tickets sin iniciar sesión.
 *
 * Todos los endpoints viven bajo /api/public y NO requieren JWT.
 * La empresa se identifica a partir del correo del reportante.
 */
@Injectable({ providedIn: 'root' })
export class PublicApiService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/public`;

  /** Identifica la empresa a la que pertenece el correo del reportante. */
  identificarEmpresa(correo: string): Observable<EmpresaPorCorreo> {
    return this.http.get<EmpresaPorCorreo>(`${this.url}/empresa`, {
      params: new HttpParams().set('correo', correo.trim()),
    });
  }

  /** Categorías activas de la empresa identificada. */
  listarCategorias(empresaId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.url}/categorias`, {
      params: new HttpParams().set('empresaId', String(empresaId)),
    });
  }

  /** Problemas activos de una categoría dentro de la empresa identificada. */
  listarProblemas(categoriaId: number, empresaId: number): Observable<Problema[]> {
    return this.http.get<Problema[]>(`${this.url}/problemas`, {
      params: new HttpParams().set('categoriaId', String(categoriaId)).set('empresaId', String(empresaId)),
    });
  }

  /** Crea un ticket reportado sin iniciar sesión. */
  crearTicketAnonimo(payload: TicketAnonimoRequest): Observable<TicketAnonimoResponse> {
    return this.http.post<TicketAnonimoResponse>(`${this.url}/tickets`, payload);
  }
}
