import { Injectable, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { Observable, tap } from 'rxjs';
import { AuthResponse, LoginRequest, RegisterRequest } from '../models/auth.model';
import { AuthApiService } from '../services/auth-api.service';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'helpdesk_auth';
  private readonly TS_KEY = 'helpdesk_auth_ts';

  private api = inject(AuthApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  private state = signal<AuthResponse | null>(this.loadFromSession());

  user = computed(() => this.state());
  isAuthenticated = computed(() => {
    const r = this.state();
    if (!r) return false;
    return !this.isExpired();
  });

  private expiryTimerId: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    if (this.isExpired()) this.logout();
  }

  login(email: string, password: string): Observable<AuthResponse> {
    const req: LoginRequest = { email, password };
    return this.api.login(req).pipe(
      tap((res) => {
        this.persist(res);
        this.scheduleExpiry(res.expiresIn * 1000);
      })
    );
  }

  register(payload: RegisterRequest): Observable<AuthResponse> {
    return this.api.register(payload).pipe(
      tap((res) => {
        this.persist(res);
        this.scheduleExpiry(res.expiresIn * 1000);
      })
    );
  }

  logout(): void {
    if (this.expiryTimerId) {
      clearTimeout(this.expiryTimerId);
      this.expiryTimerId = null;
    }
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.TS_KEY);
    this.state.set(null);
    this.router.navigate(['/login']);
  }

  forceLogoutExpired(): void {
    this.snack.open('Tu sesión expiró. Ingresa nuevamente.', 'OK', {
      duration: 4000,
      panelClass: ['snack-error'],
    });
    sessionStorage.removeItem(this.STORAGE_KEY);
    sessionStorage.removeItem(this.TS_KEY);
    this.state.set(null);
    this.router.navigate(['/login']);
  }

  hasRole(roles: string[]): boolean {
    const r = this.state()?.rol;
    return r ? roles.includes(r) : false;
  }

  getToken(): string | null { return this.state()?.token ?? null; }
  getRol(): string | null { return this.state()?.rol ?? null; }
  getEmpresaId(): number | null { return this.state()?.empresaId ?? null; }
  getUserId(): number | null { return this.state()?.usuarioId ?? null; }
  getEmail(): string | null { return this.state()?.email ?? null; }
  getFullName(): string {
    const r = this.state();
    return r ? `${r.nombres} ${r.apellidos}`.trim() : '';
  }

  private persist(res: AuthResponse): void {
    // El backend envía expiresIn en segundos (convención JWT/OAuth).
    const normalized: AuthResponse = { ...res, expiresIn: res.expiresIn * 1000 };
    sessionStorage.setItem(this.STORAGE_KEY, JSON.stringify(normalized));
    sessionStorage.setItem(this.TS_KEY, String(Date.now()));
    this.state.set(normalized);
  }

  private loadFromSession(): AuthResponse | null {
    try {
      const s = sessionStorage.getItem(this.STORAGE_KEY);
      if (!s) return null;
      const parsed = JSON.parse(s) as AuthResponse;
      // Sesiones guardadas antes del fix usaban segundos como milisegundos.
      if (parsed.expiresIn > 0 && parsed.expiresIn < 1_000_000) {
        parsed.expiresIn *= 1000;
      }
      return parsed;
    } catch {
      return null;
    }
  }

  private isExpired(): boolean {
    const ts = sessionStorage.getItem(this.TS_KEY);
    const r = this.state();
    if (!r || !ts) return false;
    return Date.now() >= Number(ts) + r.expiresIn;
  }

  private scheduleExpiry(ms: number): void {
    if (this.expiryTimerId) clearTimeout(this.expiryTimerId);
    this.expiryTimerId = setTimeout(() => this.forceLogoutExpired(), ms);
  }
}
