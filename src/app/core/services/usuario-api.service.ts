import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { Usuario, UsuarioRequest, UsuarioRolCount } from '../models/usuario.model';
import { AuthService } from '../auth/auth.service';

@Injectable({ providedIn: 'root' })
export class UsuarioApiService {
  private http = inject(HttpClient);
  private auth = inject(AuthService);
  private url = `${environment.apiBaseUrl}/usuarios`;

  listarTodos(): Observable<Usuario[]> { return this.http.get<Usuario[]>(this.url); }
  buscarPorId(id: number): Observable<Usuario> { return this.http.get<Usuario>(`${this.url}/${id}`); }
  buscarPorEmail(email: string): Observable<Usuario> { return this.http.get<Usuario>(`${this.url}/email/${email}`); }
  listarPorEmpresa(empresaId: number): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}`); }
  listarPorRol(rolId: number): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.url}/rol/${rolId}`); }
  listarPorEstado(activo: boolean): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.url}/estado`, { params: new HttpParams().set('activo', String(activo)) });
  }
  listarActivosPorEmpresa(empresaId: number, activo = true): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}/activos`, { params: new HttpParams().set('activo', String(activo)) });
  }
  listarPorEmpresaYRol(empresaId: number, rolId: number): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}/rol/${rolId}`);
  }
  listarDetalle(empresaId: number): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}/detalle`); }
  buscarPorNombre(empresaId: number, termino: string): Observable<Usuario[]> {
    return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}/buscar`, { params: new HttpParams().set('termino', termino) });
  }
  contarPorRol(empresaId?: number): Observable<UsuarioRolCount[]> {
    let params = new HttpParams();
    if (empresaId) {
      params = params.set('empresaId', String(empresaId));
    }
    return this.http.get<UsuarioRolCount[]>(`${this.url}/conteo-rol`, { params });
  }
  listarAgentes(empresaId: number): Observable<Usuario[]> { return this.http.get<Usuario[]>(`${this.url}/empresa/${empresaId}/agentes`); }

  listarConFiltros(search?: string, roles?: number[], empresaId?: number): Observable<Usuario[]> {
    let params = new HttpParams();
    if (search) params = params.set('search', search);
    if (roles?.length) roles.forEach(r => params = params.append('roles', String(r)));
    if (empresaId) params = params.set('empresaId', String(empresaId));
    return this.http.get<Usuario[]>(this.url, { params });
  }

  guardar(payload: UsuarioRequest, empresaId?: number): Observable<Usuario> {
    const eid = empresaId ?? this.auth.getEmpresaId();
    const { rolId, ...datos } = payload;
    return this.http.post<Usuario>(this.url, {
      ...datos,
      activo: true,
      rol: { id: rolId },
      empresa: { id: eid },
    });
  }
  actualizar(id: number, payload: UsuarioRequest): Observable<Usuario> { return this.http.put<Usuario>(`${this.url}/${id}`, payload); }
  eliminar(id: number): Observable<void> { return this.http.delete<void>(`${this.url}/${id}`); }
  activar(id: number): Observable<Usuario> { return this.http.put<Usuario>(`${this.url}/${id}/activar`, {}); }
}
