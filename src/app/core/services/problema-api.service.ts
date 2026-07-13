import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { PageResponse, Problema, ProblemaRequest } from '../models/problema.model';

@Injectable({ providedIn: 'root' })
export class ProblemaApiService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/problemas`;

  listarPorCategoria(categoriaId: number, empresaId: number): Observable<Problema[]> {
    return this.http.get<Problema[]>(`${this.url}/categoria/${categoriaId}`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  listarPorCategoriaAll(categoriaId: number): Observable<Problema[]> {
    return this.http.get<Problema[]>(this.url, { params: new HttpParams().set('categoriaId', String(categoriaId)) });
  }
  listarPorEmpresa(empresaId: number): Observable<Problema[]> {
    return this.http.get<Problema[]>(`${this.url}/empresa/${empresaId}`);
  }
  listarTodosPaginado(page: number, limit: number, categoriaId?: number): Observable<PageResponse<Problema>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (categoriaId) params = params.set('categoriaId', String(categoriaId));
    return this.http.get<PageResponse<Problema>>(`${this.url}/todos`, { params });
  }

  listarPaginado(empresaId: number, page: number, limit: number, categoriaId?: number): Observable<PageResponse<Problema>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (categoriaId) params = params.set('categoriaId', String(categoriaId));
    return this.http.get<PageResponse<Problema>>(`${this.url}/empresa/${empresaId}`, { params });
  }
  obtenerPorId(id: number, empresaId: number): Observable<Problema> {
    return this.http.get<Problema>(`${this.url}/${id}`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  contarPorCategoria(empresaId?: number): Observable<{ categoria: string; total: number }[]> {
    let params = new HttpParams();
    if (empresaId) params = params.set('empresaId', String(empresaId));
    return this.http.get<{ categoria: string; total: number }[]>(`${this.url}/conteo-categoria`, { params });
  }
  buscarPorTexto(texto: string): Observable<Problema[]> {
    return this.http.get<Problema[]>(`${this.url}/buscar`, { params: new HttpParams().set('texto', texto) });
  }
  guardar(payload: ProblemaRequest, empresaId: number): Observable<Problema> {
    return this.http.post<Problema>(this.url, payload, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  actualizar(id: number, payload: ProblemaRequest, empresaId: number): Observable<Problema> {
    return this.http.put<Problema>(`${this.url}/${id}`, payload, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  eliminar(id: number, empresaId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  activar(id: number, empresaId: number): Observable<Problema> {
    return this.http.put<Problema>(`${this.url}/${id}/activar`, null, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
}
