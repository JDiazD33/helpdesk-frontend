import { Component, ChangeDetectionStrategy, ChangeDetectorRef, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatTableModule } from '@angular/material/table';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { forkJoin, of, catchError } from 'rxjs';
import { ReporteApiService } from '../../core/services/reporte-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { EmpresaApiService } from '../../core/services/empresa-api.service';
import { UsuarioApiService } from '../../core/services/usuario-api.service';
import { ComentarioApiService } from '../../core/services/comentario-api.service';
import { TicketApiService } from '../../core/services/ticket-api.service';
import { Ticket } from '../../core/models/ticket.model';
import { RankingAgente } from '../../core/models/ticket.model';
import { PrioridadTicketLabel } from '../../core/models/enums';

interface KpiAdmin {
  totalTickets: number;
  abiertos: number;
  resueltos: number;
  usuariosActivos: number;
  totalUsuarios: number;
}

interface KpiAgente {
  total: number;
  enProgreso: number;
  resueltos: number;
}

interface KpiCliente {
  creados: number;
  bajoRevision: number;
  resueltos: number;
}

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];

const ESTADO_LABELS: Record<string, string> = {
  ABIERTO: 'Abierto',
  EN_PROGRESO: 'En Progreso',
  RESUELTO: 'Resuelto',
  CERRADO: 'Cerrado',
};

@Component({
  selector: 'app-dashboard',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, RouterLink,
    MatCardModule, MatIconModule, MatProgressSpinnerModule,
    MatFormFieldModule, MatSelectModule, MatOptionModule,
    MatButtonModule, MatTableModule, MatChipsModule, MatTooltipModule,
  ],
  template: `
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-3xl font-bold text-gray-800">Dashboard</h1>
      <div class="flex items-center gap-3">
        <mat-form-field appearance="outline" class="!w-28" subscriptSizing="dynamic">
          <mat-label>Año</mat-label>
          <mat-select [ngModel]="anio()" (ngModelChange)="anio.set($event); load()">
            @for (y of years; track y) {
              <mat-option [value]="y">{{ y }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
        <button mat-stroked-button (click)="load()" [disabled]="loading()">
          <mat-icon>refresh</mat-icon> Actualizar
        </button>
      </div>
    </div>

    @if (loading() && !anyDataLoaded()) {
      <div class="flex justify-center py-16"><mat-spinner></mat-spinner></div>
    } @else {
      <!-- ============================== FILA 1: KPI Cards ============================== -->
      @if (rol() === 'CLIENTE') {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-blue-600">confirmation_number</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Tickets creados</div>
                <div class="text-2xl font-bold">{{ kpiCliente()?.creados ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-orange-600">autorenew</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Tickets bajo revisión</div>
                <div class="text-2xl font-bold">{{ kpiCliente()?.bajoRevision ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-green-600">check_circle</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Tickets resueltos</div>
                <div class="text-2xl font-bold">{{ kpiCliente()?.resueltos ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      } @else if (rol() === 'AGENTE') {
        <div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-blue-600">confirmation_number</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Mis tickets</div>
                <div class="text-2xl font-bold">{{ kpiAgente()?.total ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-orange-600">autorenew</mat-icon>
              <div>
                <div class="text-sm text-gray-500">En progreso</div>
                <div class="text-2xl font-bold">{{ kpiAgente()?.enProgreso ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-green-600">check_circle</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Resueltos</div>
                <div class="text-2xl font-bold">{{ kpiAgente()?.resueltos ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      } @else {
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-blue-600">confirmation_number</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Total tickets</div>
                <div class="text-2xl font-bold">{{ kpiAdmin()?.totalTickets ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-red-600">inbox</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Tickets abiertos</div>
                <div class="text-2xl font-bold">{{ kpiAdmin()?.abiertos ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-purple-600">people</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Usuarios activos</div>
                <div class="text-2xl font-bold">{{ kpiAdmin()?.usuariosActivos ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-content class="!flex !items-center !gap-3">
              <mat-icon class="!text-4xl !w-12 !h-12 text-gray-600">group</mat-icon>
              <div>
                <div class="text-sm text-gray-500">Total usuarios</div>
                <div class="text-2xl font-bold">{{ kpiAdmin()?.totalUsuarios ?? 0 }}</div>
              </div>
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- ============================== FILA 2: Estado chart ============================== -->
      @if (rol() === 'CLIENTE') {
        <div class="grid grid-cols-1 gap-4 mb-6">
          <mat-card>
            <mat-card-header><mat-card-title>Tickets por estado</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (sectionError('estado')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudieron cargar los datos de tickets por estado.</p>
                </div>
              } @else if (ticketsPorEstado().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">inbox</mat-icon>
                  <p>No hay tickets en el período seleccionado.</p>
                </div>
              } @else {
                <div class="flex flex-col gap-3 py-2">
                  @for (e of ticketsPorEstado(); track e.name) {
                    <div class="p-3 rounded-lg border"
                         [style.borderColor]="estadoColors[e.name] || '#d1d5db'"
                         [style.background]="estadoBgColors[e.name] || '#f9fafb'">
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold" [style.color]="estadoColors[e.name] || '#374151'">{{ e.name }}</span>
                        <span class="text-2xl font-bold">{{ e.value }}</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div class="h-2.5 rounded-full transition-all"
                             [style.width.%]="totalPorEstado() ? (e.value / totalPorEstado()) * 100 : 0"
                             [style.background]="estadoColors[e.name] || '#6b7280'">
                        </div>
                      </div>
                      <span class="text-xs text-gray-500 mt-1 block">
                        {{ totalPorEstado() ? ((e.value / totalPorEstado()) * 100).toFixed(1) : '0' }}% del total
                      </span>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      } @else {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <mat-card>
            <mat-card-header><mat-card-title>Tickets por estado</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (sectionError('estado')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudieron cargar los datos de tickets por estado.</p>
                </div>
              } @else if (ticketsPorEstado().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">inbox</mat-icon>
                  <p>No hay tickets en el período seleccionado.</p>
                </div>
              } @else {
                <div class="flex flex-col gap-3 py-2">
                  @for (e of ticketsPorEstado(); track e.name) {
                    <div class="p-3 rounded-lg border"
                         [style.borderColor]="estadoColors[e.name] || '#d1d5db'"
                         [style.background]="estadoBgColors[e.name] || '#f9fafb'">
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-semibold" [style.color]="estadoColors[e.name] || '#374151'">{{ e.name }}</span>
                        <span class="text-2xl font-bold">{{ e.value }}</span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-2.5 mt-2">
                        <div class="h-2.5 rounded-full transition-all"
                             [style.width.%]="totalPorEstado() ? (e.value / totalPorEstado()) * 100 : 0"
                             [style.background]="estadoColors[e.name] || '#6b7280'">
                        </div>
                      </div>
                      <span class="text-xs text-gray-500 mt-1 block">
                        {{ totalPorEstado() ? ((e.value / totalPorEstado()) * 100).toFixed(1) : '0' }}% del total
                      </span>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
          <mat-card>
            <mat-card-header>
              <mat-card-title>Tickets por mes ({{ anio() }})</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (sectionError('mes')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudieron cargar los datos mensuales.</p>
                </div>
              } @else if (ticketsPorMes().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">bar_chart</mat-icon>
                  <p>Sin tickets registrados en {{ anio() }}.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="ticketsPorMes()" class="w-full">
                  <ng-container matColumnDef="mes">
                    <th mat-header-cell *matHeaderCellDef>Mes</th>
                    <td mat-cell *matCellDef="let m">{{ m.name }}</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef class="!text-right">Total tickets</th>
                    <td mat-cell *matCellDef="let m" class="!text-right font-semibold">{{ m.value }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsMes"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsMes;"></tr>
                </table>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- ============================== FILA 3: Ranking empresas (solo ADMIN_OWNER) ============================== -->
      @if (rol() === 'ADMIN_OWNER') {
        <div class="mb-6">
          <mat-card>
            <mat-card-header><mat-card-title>Ranking de empresas</mat-card-title></mat-card-header>
            <mat-card-content>
              @if (sectionError('rankingEmpresas')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudo cargar el ranking de empresas.</p>
                </div>
              } @else if (rankingEmpresas().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">business</mat-icon>
                  <p>Sin datos de empresas.</p>
                </div>
              } @else {
                <div class="flex flex-col gap-4 py-2">
                  @for (empresa of rankingEmpresas(); track empresa.name) {
                    <div>
                      <div class="flex justify-between items-center mb-1">
                        <span class="font-medium">{{ empresa.name }}</span>
                        <span class="font-semibold text-gray-700">
                          {{ empresa.value }} ticket{{ empresa.value !== 1 ? 's' : '' }}
                        </span>
                      </div>
                      <div class="w-full bg-gray-200 rounded-full h-4">
                        <div class="h-4 rounded-full bg-blue-500 transition-all"
                             [style.width.%]="maxRanking() ? (empresa.value / maxRanking()) * 100 : 0">
                        </div>
                      </div>
                    </div>
                  }
                </div>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- ============================== FILA 4: Tablas (solo ADMIN) ============================== -->
      @if (rol() !== 'AGENTE' && rol() !== 'CLIENTE') {
        <div class="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-6">
          <mat-card>
            <mat-card-header>
              <mat-card-title>Mejores agentes</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (sectionError('mejoresAgentes')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudo cargar el ranking de agentes.</p>
                </div>
              } @else if (mejoresAgentes().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">star_border</mat-icon>
                  <p>Aún no hay agentes calificados.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="mejoresAgentes()" class="w-full">
                  <ng-container matColumnDef="agente">
                    <th mat-header-cell *matHeaderCellDef>Agente</th>
                    <td mat-cell *matCellDef="let r">{{ r.nombres }} {{ r.apellidos }}</td>
                  </ng-container>
                  <ng-container matColumnDef="promedio">
                    <th mat-header-cell *matHeaderCellDef class="!text-right">Promedio</th>
                    <td mat-cell *matCellDef="let r" class="!text-right font-semibold">
                  <div class="flex items-center justify-end gap-0.5">
                     {{ r.promedio.toFixed(1) }}
              <mat-icon class="text-yellow-500 !w-4 !h-4 !text-[16px] flex items-center justify-center">star</mat-icon>
               </div>
                </td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef class="!text-right">Tickets</th>
                    <td mat-cell *matCellDef="let r" class="!text-right">{{ r.totalTickets }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsMejores"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsMejores;"></tr>
                </table>
              }
            </mat-card-content>
          </mat-card>

          <mat-card>
            <mat-card-header>
              <mat-card-title>Tickets prioritarios (ALTA / CRÍTICA)</mat-card-title>
            </mat-card-header>
            <mat-card-content>
              @if (sectionError('prioridadAlta')) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
                  <p>No se pudieron cargar los tickets prioritarios.</p>
                </div>
              } @else if (ticketsPrioridadAlta().length === 0) {
                <div class="empty-state">
                  <mat-icon class="empty-icon text-gray-400">priority_high</mat-icon>
                  <p>No hay tickets con prioridad alta o crítica.</p>
                </div>
              } @else {
                <table mat-table [dataSource]="ticketsPrioridadAlta()" class="w-full">
                  <ng-container matColumnDef="codigo">
                    <th mat-header-cell *matHeaderCellDef>Cód.</th>
                    <td mat-cell *matCellDef="let t" class="font-mono text-xs">{{ t.codigo }}</td>
                  </ng-container>
                  <ng-container matColumnDef="titulo">
                    <th mat-header-cell *matHeaderCellDef>Título</th>
                    <td mat-cell *matCellDef="let t" class="truncate max-w-xs">
                      <a [routerLink]="['/tickets', t.id]" [queryParams]="{ from: 'dashboard' }" class="text-blue-600 hover:underline">{{ t.titulo }}</a>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="prioridad">
                    <th mat-header-cell *matHeaderCellDef>Prioridad</th>
                    <td mat-cell *matCellDef="let t">
                      <span class="badge" [ngClass]="'badge-' + t.prioridad.toLowerCase()">
                        {{ getPrioridadLabel(t.prioridad) }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha</th>
                    <td mat-cell *matCellDef="let t" class="text-xs">{{ t.fechaCreacion | date:'short' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="acciones">
                    <th mat-header-cell *matHeaderCellDef class="!text-right"></th>
                    <td mat-cell *matCellDef="let t" class="!text-right">
                      <a [routerLink]="['/tickets', t.id]" [queryParams]="{ from: 'dashboard' }" mat-icon-button color="primary" matTooltip="Ver ticket">
                        <mat-icon>visibility</mat-icon>
                      </a>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsPrioridad"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsPrioridad;"></tr>
                </table>
              }
            </mat-card-content>
          </mat-card>
        </div>
      }

      <!-- ============================== FILA AGENTE/CLIENTE: Mis tickets ============================== -->
      @if (rol() === 'AGENTE' || rol() === 'CLIENTE') {
        <mat-card>
          <mat-card-header>
            <mat-card-title>{{ rol() === 'CLIENTE' ? 'Mis tickets' : 'Mis tickets asignados' }}</mat-card-title>
            <mat-card-subtitle>{{ misTickets().length }} ticket(s)</mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            @if (misTickets().length === 0) {
              <div class="empty-state">
                <mat-icon class="empty-icon text-gray-400">assignment_ind</mat-icon>
                <p>No tienes tickets asignados.</p>
              </div>
            } @else {
              <table mat-table [dataSource]="misTickets()" class="w-full">
                <ng-container matColumnDef="codigo">
                  <th mat-header-cell *matHeaderCellDef>Cód.</th>
                  <td mat-cell *matCellDef="let t" class="font-mono text-xs">{{ t.codigo }}</td>
                </ng-container>
                <ng-container matColumnDef="titulo">
                  <th mat-header-cell *matHeaderCellDef>Título</th>
                  <td mat-cell *matCellDef="let t">
                    <a [routerLink]="['/tickets', t.id]" [queryParams]="{ from: 'dashboard' }" class="text-blue-600 hover:underline">{{ t.titulo }}</a>
                  </td>
                </ng-container>
                <ng-container matColumnDef="estado">
                  <th mat-header-cell *matHeaderCellDef>Estado</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="badge" [ngClass]="'badge-' + t.estado.toLowerCase().replace('_','')">
                      {{ getEstadoLabel(t.estado) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="prioridad">
                  <th mat-header-cell *matHeaderCellDef>Prioridad</th>
                  <td mat-cell *matCellDef="let t">
                    <span class="badge" [ngClass]="'badge-' + t.prioridad.toLowerCase()">
                      {{ getPrioridadLabel(t.prioridad) }}
                    </span>
                  </td>
                </ng-container>
                <ng-container matColumnDef="fecha">
                  <th mat-header-cell *matHeaderCellDef>Fecha</th>
                  <td mat-cell *matCellDef="let t" class="text-xs">{{ t.fechaCreacion | date:'short' }}</td>
                </ng-container>
                <tr mat-header-row *matHeaderRowDef="colsAgente"></tr>
                <tr mat-row *matRowDef="let row; columns: colsAgente;"></tr>
              </table>
            }
          </mat-card-content>
        </mat-card>
      }
    }
  `,
  styles: [`
    .empty-state {
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1rem;
      color: #6b7280;
    }
    .empty-icon {
      font-size: 3rem;
      width: 3rem;
      height: 3rem;
      margin-bottom: 0.5rem;
    }
  `],
})
export class DashboardComponent implements OnInit {
  private auth = inject(AuthService);
  private reportes = inject(ReporteApiService);
  private empresas = inject(EmpresaApiService);
  private usuarios = inject(UsuarioApiService);
  private comentarios = inject(ComentarioApiService);
  private tickets = inject(TicketApiService);
  private cdr = inject(ChangeDetectorRef);

  protected loading = signal(true);
  protected chartsReady = signal(false);
  protected anio = signal(new Date().getFullYear());
  protected years = [2024, 2025, 2026, 2027, 2028];

  protected rol = computed(() => this.auth.user()?.rol ?? null);

  // Admin state
  protected kpiAdmin = signal<KpiAdmin | null>(null);
  protected ticketsPorEstado = signal<{ name: string; value: number }[]>([]);
  protected ticketsPorMes = signal<{ name: string; value: number }[]>([]);
  protected rankingEmpresas = signal<{ name: string; value: number }[]>([]);
  protected usuariosPorRol = signal<{ name: string; value: number }[]>([]);
  protected mejoresAgentes = signal<RankingAgente[]>([]);
  protected ticketsPrioridadAlta = signal<Ticket[]>([]);

  // Agente state
  protected kpiAgente = signal<KpiAgente | null>(null);
  // Cliente state
  protected kpiCliente = signal<KpiCliente | null>(null);
  protected misTickets = signal<Ticket[]>([]);

  // Per-section error markers
  protected errors = signal<Record<string, boolean>>({});
  protected sectionError(key: string): boolean { return !!this.errors()[key]; }

  // Track if any data has loaded (for empty-state vs spinner on first render)
  protected anyDataLoaded = computed(() => {
    return this.kpiAdmin() !== null || this.kpiAgente() !== null || this.kpiCliente() !== null;
  });

  // Table columns
  protected colsMejores = ['agente', 'promedio', 'total'];
  protected colsMes = ['mes', 'total'];
  protected colsPrioridad = ['codigo', 'titulo', 'prioridad', 'fecha', 'acciones'];
  protected colsAgente = ['codigo', 'titulo', 'estado', 'prioridad', 'fecha'];

  // Helpers for template
  protected totalPorEstado = computed(() => this.ticketsPorEstado().reduce((s, e) => s + e.value, 0));
  protected maxRanking = computed(() => {
    const values = this.rankingEmpresas().map(r => r.value);
    return values.length ? Math.max(...values) : 1;
  });

  protected estadoColors: Record<string, string> = {
    'Abierto': '#ef4444',
    'En Progreso': '#f59e0b',
    'Resuelto': '#10b981',
    'Cerrado': '#6b7280',
  };

  protected estadoBgColors: Record<string, string> = {
    'Abierto': '#fef2f2',
    'En Progreso': '#fffbeb',
    'Resuelto': '#f0fdf4',
    'Cerrado': '#f9fafb',
  };

  ngOnInit(): void { this.load(); }

  load(): void {
    const rol = this.rol();
    const eid = this.auth.getEmpresaId();
    const uid = this.auth.getUserId();

    if (!eid && rol !== 'ADMIN_OWNER') { this.loading.set(false); return; }

    this.chartsReady.set(false);
    this.loading.set(true);
    this.errors.set({});

    if (rol === 'AGENTE' && uid) {
      this.loadAgente(uid);
    } else if (rol === 'ADMIN_OWNER') {
      this.loadAdminGlobal();
    } else if (rol === 'ADMIN_EMPRESA') {
      this.loadAdmin(eid ?? 0);
    } else if (rol === 'CLIENTE' && uid) {
      this.loadCliente(uid);
    } else {
      this.loading.set(false);
    }
  }

  private loadAdmin(eid: number): void {
    forkJoin({
      dashboard: this.reportes.dashboard(eid, this.anio()).pipe(catchError(() => of(null))),
      ranking: this.empresas.ranking().pipe(catchError(() => of(null))),
      conteoRol: this.usuarios.contarPorRol(eid).pipe(catchError(() => of(null))),
      mejoresAgentes: this.tickets.rankingAgentes(eid).pipe(catchError(() => of(null))),
      prioridadAlta: this.tickets.prioridadAlta(eid).pipe(catchError(() => of(null))),
    }).subscribe(({ dashboard, ranking, conteoRol, mejoresAgentes, prioridadAlta }) => {
      const errs: Record<string, boolean> = {};

      if (dashboard) {
        const porEstado = dashboard.ticketsPorEstado || {};
        this.kpiAdmin.set({
          totalTickets: Object.values(porEstado).reduce<number>((a, b) => a + (Number(b) || 0), 0),
          abiertos: Number(porEstado['ABIERTO'] || 0),
          resueltos: Number(porEstado['RESUELTO'] || 0),
          usuariosActivos: Number(dashboard.usuariosActivos || 0),
          totalUsuarios: Number(dashboard.totalUsuarios || 0),
        });
        this.ticketsPorEstado.set(
          Object.entries(porEstado).map(([name, value]) => ({ name: ESTADO_LABELS[name] || name, value: Number(value) || 0 }))
        );
        this.ticketsPorMes.set(
          (dashboard.ticketsPorMes || []).map((m) => ({
            name: MESES[(m.mes || 1) - 1] || `M${m.mes}`,
            value: Number(m.total) || 0,
          }))
        );
        errs['estado'] = false;
        errs['mes'] = false;
      } else {
        errs['estado'] = true;
        errs['mes'] = true;
      }

      if (ranking) {
        this.rankingEmpresas.set(
          ranking.map((r) => ({ name: r.empresa, value: Number(r.cantidadTickets) || 0 }))
        );
        errs['rankingEmpresas'] = false;
      } else {
        errs['rankingEmpresas'] = true;
      }

      if (conteoRol) {
        this.usuariosPorRol.set(
          conteoRol.map((r) => ({ name: r.rol, value: Number(r.cantidad) || 0 }))
        );
        errs['usuariosPorRol'] = false;
      } else {
        errs['usuariosPorRol'] = true;
      }

      if (mejoresAgentes) {
        this.mejoresAgentes.set(mejoresAgentes.slice(0, 5));
        errs['mejoresAgentes'] = false;
      } else {
        errs['mejoresAgentes'] = true;
      }

      if (prioridadAlta) {
        this.ticketsPrioridadAlta.set(
          // Solo mostramos tickets activos: los RESUELTO/CERRADO ya fueron
          // atendados y no aporta nada listarlos como prioritarios.
          [...prioridadAlta]
            .filter((t) => t.estado !== 'RESUELTO' && t.estado !== 'CERRADO')
            .sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''))
        );
        errs['prioridadAlta'] = false;
      } else {
        errs['prioridadAlta'] = true;
      }

      this.errors.set(errs);
      this.loading.set(false);
      setTimeout(() => { this.chartsReady.set(true); this.cdr.markForCheck(); }, 50);
    });
  }

  private loadAdminGlobal(): void {
    forkJoin({
      dashboard: this.reportes.dashboardGlobal(this.anio()).pipe(catchError(() => of(null))),
      ranking: this.empresas.ranking().pipe(catchError(() => of(null))),
      prioridadAlta: this.tickets.prioridadAltaGlobal().pipe(catchError(() => of(null))),
      mejoresAgentes: this.tickets.rankingAgentes().pipe(catchError(() => of(null))),
      conteoRol: this.usuarios.contarPorRol().pipe(catchError(() => of(null))),
    }).subscribe(({ dashboard, ranking, prioridadAlta, mejoresAgentes, conteoRol }) => {
      const errs: Record<string, boolean> = {};

      if (dashboard) {
        const porEstado = dashboard.ticketsPorEstado || {};
        this.kpiAdmin.set({
          totalTickets: Object.values(porEstado).reduce<number>((a, b) => a + (Number(b) || 0), 0),
          abiertos: Number(porEstado['ABIERTO'] || 0),
          resueltos: Number(porEstado['RESUELTO'] || 0),
          usuariosActivos: Number(dashboard.usuariosActivos || 0),
          totalUsuarios: Number(dashboard.totalUsuarios || 0),
        });
        this.ticketsPorEstado.set(
          Object.entries(porEstado).map(([name, value]) => ({ name: ESTADO_LABELS[name] || name, value: Number(value) || 0 }))
        );
        this.ticketsPorMes.set(
          (dashboard.ticketsPorMes || []).map((m) => ({
            name: MESES[(m.mes || 1) - 1] || `M${m.mes}`,
            value: Number(m.total) || 0,
          }))
        );
        errs['estado'] = false;
        errs['mes'] = false;
      } else {
        errs['estado'] = true;
        errs['mes'] = true;
      }

      if (ranking) {
        this.rankingEmpresas.set(
          ranking.map((r) => ({ name: r.empresa, value: Number(r.cantidadTickets) || 0 }))
        );
        errs['rankingEmpresas'] = false;
      } else {
        errs['rankingEmpresas'] = true;
      }

      if (prioridadAlta) {
        this.ticketsPrioridadAlta.set(
          // Solo tickets activos: los RESUELTO/CERRADO ya no son prioritarios.
          [...prioridadAlta]
            .filter((t) => t.estado !== 'RESUELTO' && t.estado !== 'CERRADO')
            .sort((a, b) => (b.fechaCreacion || '').localeCompare(a.fechaCreacion || ''))
        );
        errs['prioridadAlta'] = false;
      } else {
        errs['prioridadAlta'] = true;
      }

      if (mejoresAgentes) {
        this.mejoresAgentes.set(mejoresAgentes.slice(0, 5));
        errs['mejoresAgentes'] = false;
      } else {
        errs['mejoresAgentes'] = true;
      }

      if (conteoRol) {
        this.usuariosPorRol.set(
          conteoRol.map((r) => ({ name: r.rol, value: Number(r.cantidad) || 0 }))
        );
        errs['usuariosPorRol'] = false;
      } else {
        errs['usuariosPorRol'] = true;
      }

      this.errors.set(errs);
      this.loading.set(false);
      setTimeout(() => { this.chartsReady.set(true); this.cdr.markForCheck(); }, 50);
    });
  }

  private loadAgente(uid: number): void {
    this.tickets.listarPorAgente(uid).pipe(catchError(() => of(null))).subscribe((ts) => {
      if (!ts) {
        this.errors.set({ estado: true, mis: true });
        this.loading.set(false);
        return;
      }
      this.misTickets.set(ts);
      this.kpiAgente.set({
        total: ts.length,
        enProgreso: ts.filter((t) => t.estado === 'EN_PROGRESO').length,
        resueltos: ts.filter((t) => t.estado === 'RESUELTO').length,
      });
      const counts: Record<string, number> = {};
      const porMes: Record<number, number> = {};
      for (const t of ts) {
        if (!t.estado) continue;
        counts[t.estado] = (counts[t.estado] || 0) + 1;
        if (!t.fechaCreacion) continue;
        const d = new Date(t.fechaCreacion);
        const mes = d.getMonth() + 1;
        const anio = d.getFullYear();
        if (anio === this.anio()) {
          porMes[mes] = (porMes[mes] || 0) + 1;
        }
      }
      this.ticketsPorEstado.set(
        Object.entries(counts).map(([name, value]) => ({ name, value }))
      );
      this.ticketsPorMes.set(
        Object.entries(porMes)
          .map(([m, total]) => ({ name: MESES[Number(m) - 1] || `M${m}`, value: total }))
          .sort((a, b) => MESES.indexOf(a.name) - MESES.indexOf(b.name))
      );
      this.errors.set({});
      this.loading.set(false);
      setTimeout(() => { this.chartsReady.set(true); this.cdr.markForCheck(); }, 50);
    });
  }

  private loadCliente(uid: number): void {
    this.tickets.listarPorCliente(uid).pipe(catchError(() => of(null))).subscribe((ts) => {
      if (!ts) {
        this.errors.set({ estado: true });
        this.loading.set(false);
        return;
      }
      const tsAnio = ts.filter(t => {
        if (!t.fechaCreacion) return false;
        return new Date(t.fechaCreacion).getFullYear() === this.anio();
      });
      this.misTickets.set(tsAnio);
      this.kpiCliente.set({
        creados: tsAnio.length,
        bajoRevision: tsAnio.filter(t => t.estado === 'EN_PROGRESO').length,
        resueltos: tsAnio.filter(t => t.estado === 'RESUELTO' || t.estado === 'CERRADO').length,
      });
      this.kpiAgente.set(null);
      const counts: Record<string, number> = {};
      for (const t of tsAnio) {
        if (!t.estado) continue;
        counts[t.estado] = (counts[t.estado] || 0) + 1;
      }
      this.ticketsPorEstado.set(
        Object.entries(counts).map(([name, value]) => ({ name, value }))
      );
      this.ticketsPorMes.set([]);
      this.errors.set({});
      this.loading.set(false);
      setTimeout(() => { this.chartsReady.set(true); this.cdr.markForCheck(); }, 50);
    });
  }

  getEstadoLabel(e: string): string { return e; }
  getPrioridadLabel(p: string): string { return (PrioridadTicketLabel as Record<string, string>)[p] || p; }
}
