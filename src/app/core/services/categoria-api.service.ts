import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Categoria, CategoriaRequest, PageResponse } from '../models/categoria.model';

@Injectable({ providedIn: 'root' })
export class CategoriaApiService {
  private http = inject(HttpClient);
  private url = `${environment.apiBaseUrl}/categorias`;

  listarTodas(empresaId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(this.url, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  listarTodasGlobal(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.url}/todas`);
  }
  buscarPaginado(empresaId: number, page: number, limit: number, search?: string): Observable<PageResponse<Categoria>> {
    let params = new HttpParams().set('empresaId', String(empresaId)).set('page', String(page)).set('limit', String(limit));
    if (search) params = params.set('search', search);
    return this.http.get<PageResponse<Categoria>>(`${this.url}/paginado`, { params });
  }
  buscarPaginadoGlobal(page: number, limit: number, search?: string): Observable<PageResponse<Categoria>> {
    let params = new HttpParams().set('page', String(page)).set('limit', String(limit));
    if (search) params = params.set('search', search);
    return this.http.get<PageResponse<Categoria>>(`${this.url}/paginado/todas`, { params });
  }
  listarPorEmpresa(empresaId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.url}/empresa/${empresaId}`);
  }
  listarActivas(empresaId: number): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.url}/activas`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  listarActivasGlobal(): Observable<Categoria[]> {
    return this.http.get<Categoria[]>(`${this.url}/activas/todas`);
  }
  obtenerPorId(id: number, empresaId: number): Observable<Categoria> {
    return this.http.get<Categoria>(`${this.url}/${id}`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  guardar(payload: CategoriaRequest, empresaId: number): Observable<Categoria> {
    return this.http.post<Categoria>(this.url, payload, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  actualizar(id: number, payload: CategoriaRequest, empresaId: number): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.url}/${id}`, payload, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  eliminar(id: number, empresaId: number): Observable<void> {
    return this.http.delete<void>(`${this.url}/${id}`, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
  activar(id: number, empresaId: number): Observable<Categoria> {
    return this.http.put<Categoria>(`${this.url}/${id}/activar`, null, { params: new HttpParams().set('empresaId', String(empresaId)) });
  }
}
