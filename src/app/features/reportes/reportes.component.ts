import { Component, ChangeDetectionStrategy, inject, signal, computed } from '@angular/core';
import { CommonModule, DatePipe } from '@angular/common';
import { MatTabsModule } from '@angular/material/tabs';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTableModule } from '@angular/material/table';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatNativeDateModule } from '@angular/material/core';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule } from '@angular/forms';
import { TicketApiService } from '../../core/services/ticket-api.service';
import { ReporteApiService } from '../../core/services/reporte-api.service';
import { ProblemaApiService } from '../../core/services/problema-api.service';
import { ComentarioApiService } from '../../core/services/comentario-api.service';
import { UsuarioApiService } from '../../core/services/usuario-api.service';
import { AuthService } from '../../core/auth/auth.service';
import { CsvExportService } from '../../core/services/csv-export.service';
import { Ticket } from '../../core/models/ticket.model';
import { RankingAgente } from '../../core/models/ticket.model';
import { EstadoTicketLabel, PrioridadTicketLabel } from '../../core/models/enums';
import { AsignarDialog } from '../tickets/ticket-detail/ticket-detail.component';
import { Usuario } from '../../core/models/usuario.model';

const MESES = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
const MESES_NOMBRE = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

@Component({
  selector: 'app-reportes',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, DatePipe,
    MatTabsModule, MatCardModule, MatIconModule, MatButtonModule,
    MatProgressSpinnerModule, MatTableModule, MatSelectModule, MatOptionModule,
    MatChipsModule, MatFormFieldModule, MatInputModule, MatDatepickerModule,
    MatNativeDateModule, MatProgressBarModule,
    MatDialogModule,
  ],
  template: `
    <h1 class="text-3xl font-bold text-gray-800 mb-4">Reportes</h1>

    <mat-tab-group (selectedTabChange)="onTabChange($event.index)">
      <!-- ============================================================== -->
      <!-- TAB 1 — Tickets por Mes                                         -->
      <!-- ============================================================== -->
      <mat-tab label="Tickets por mes">
        <div class="p-4">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <mat-form-field appearance="outline" class="!w-28" subscriptSizing="dynamic">
              <mat-label>Año</mat-label>
              <mat-select [(ngModel)]="tab1.anio" (selectionChange)="loadTab1()">
                @for (y of years; track y) {
                  <mat-option [value]="y">{{ y }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline" class="!w-36" subscriptSizing="dynamic">
              <mat-label>Mes</mat-label>
              <mat-select [(ngModel)]="tab1.mesFiltro" (selectionChange)="loadTab1()">
                <mat-option [value]="0">Todos</mat-option>
                @for (m of meses; track m.value) {
                  <mat-option [value]="m.value">{{ m.label }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <button mat-stroked-button (click)="loadTab1()" [disabled]="tab1.loading()">
              <mat-icon>refresh</mat-icon> Actualizar
            </button>
            <button mat-flat-button color="primary" (click)="exportTab1()" [disabled]="tab1.filtered().length === 0">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>

          @if (tab1.loading() && !tab1.loaded()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (tab1.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudieron cargar los datos.</p>
            </div>
          } @else {
            <mat-card class="mb-4">
              <mat-card-header><mat-card-title>Tickets por mes ({{ tab1.anio }})</mat-card-title></mat-card-header>
              <mat-card-content>
                @if (chartPoints(); as cp) {
                  <div style="display: block; width: 100%">
                    <svg [attr.viewBox]="'0 0 ' + svgW + ' ' + svgH" style="width:100%; height:auto; display:block">
                      <defs>
                        <linearGradient id="areaGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="0%" stop-color="#3b82f6" stop-opacity="0.35"/>
                          <stop offset="100%" stop-color="#3b82f6" stop-opacity="0.02"/>
                        </linearGradient>
                      </defs>
                      <path [attr.d]="cp.areaPath" fill="url(#areaGrad)"/>
                      <path [attr.d]="cp.linePath" fill="none" stroke="#3b82f6" stroke-width="2.5" stroke-linejoin="round"/>
                      <line [attr.x1]="padL" [attr.y1]="padT + cp.innerH" [attr.x2]="svgW - padR" [attr.y2]="padT + cp.innerH" stroke="#d1d5db" stroke-width="1"/>
                      @for (tick of cp.yTicks; track tick.val) {
                        <line [attr.x1]="padL" [attr.y1]="tick.y" [attr.x2]="svgW - padR" [attr.y2]="tick.y" stroke="#e5e7eb" stroke-width="1" stroke-dasharray="4,4"/>
                        <text [attr.x]="padL - 6" [attr.y]="tick.y + 4" text-anchor="end" fill="#6b7280" font-size="11">{{ tick.val }}</text>
                      }
                      @for (p of cp.points; track $index) {
                        <circle [attr.cx]="p.x" [attr.cy]="p.y" r="4" fill="#3b82f6" stroke="white" stroke-width="2"/>
                        <text [attr.x]="p.x" [attr.y]="p.y - 10" text-anchor="middle" fill="#1f2937" font-size="12" font-weight="600">{{ p.total }}</text>
                        <text [attr.x]="p.x" [attr.y]="svgH - 8" text-anchor="middle" fill="#6b7280" font-size="11">{{ p.label }}</text>
                      }
                    </svg>
                  </div>
                } @else {
                  <div class="empty-state">
                    <mat-icon class="empty-icon text-gray-400">bar_chart</mat-icon>
                    <p>Sin datos para el año {{ tab1.anio }}.</p>
                  </div>
                }
              </mat-card-content>
            </mat-card>

            <mat-card>
              <mat-card-content>
                <table mat-table [dataSource]="tab1.filtered()" class="w-full">
                  <ng-container matColumnDef="mes">
                    <th mat-header-cell *matHeaderCellDef>Mes</th>
                    <td mat-cell *matCellDef="let r">{{ MESES_NOMBRE[r.mes - 1] }}</td>
                  </ng-container>
                  <ng-container matColumnDef="total">
                    <th mat-header-cell *matHeaderCellDef class="!text-right">Cantidad de tickets</th>
                    <td mat-cell *matCellDef="let r" class="!text-right font-semibold">{{ r.total }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsTab1"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsTab1;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </mat-tab>

      <!-- ============================================================== -->
      <!-- TAB 2 — Tickets por Período                                     -->
      <!-- ============================================================== -->
      <mat-tab label="Tickets por período">
        <div class="p-4">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <mat-form-field appearance="outline" class="!w-44" subscriptSizing="dynamic">
              <mat-label>Fecha inicio</mat-label>
              <input matInput [matDatepicker]="pickerInicio" [ngModel]="fechaInicio()" (ngModelChange)="fechaInicio.set($event!)" />
              <mat-datepicker-toggle matSuffix [for]="pickerInicio"></mat-datepicker-toggle>
              <mat-datepicker #pickerInicio></mat-datepicker>
            </mat-form-field>
            <mat-form-field appearance="outline" class="!w-44" subscriptSizing="dynamic">
              <mat-label>Fecha fin</mat-label>
              <input matInput [matDatepicker]="pickerFin" [ngModel]="fechaFin()" (ngModelChange)="fechaFin.set($event!)" [min]="fechaInicio()" />
              <mat-datepicker-toggle matSuffix [for]="pickerFin"></mat-datepicker-toggle>
              <mat-datepicker #pickerFin></mat-datepicker>
            </mat-form-field>
            <button mat-stroked-button (click)="loadTab2()" [disabled]="!fechaInicio() || !fechaFin() || tab2.loading()">
              <mat-icon>search</mat-icon> Buscar
            </button>
            <button mat-flat-button color="primary" (click)="exportTab2()" [disabled]="tab2.tickets().length === 0">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>

          @if (tab2.loading()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (!fechaInicio() || !fechaFin()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">date_range</mat-icon>
              <p>Selecciona un rango de fechas para ver los tickets.</p>
            </div>
          } @else if (tab2.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudieron cargar los tickets del período.</p>
            </div>
          } @else if (tab2.tickets().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">event_busy</mat-icon>
              <p>No hay tickets en el período seleccionado.</p>
            </div>
          } @else {
            <mat-card>
              <mat-card-content>
                <table mat-table [dataSource]="tab2.tickets()" class="w-full">
                  <ng-container matColumnDef="codigo">
                    <th mat-header-cell *matHeaderCellDef>Código</th>
                    <td mat-cell *matCellDef="let t" class="font-mono text-xs">{{ t.codigo }}</td>
                  </ng-container>
                  <ng-container matColumnDef="titulo">
                    <th mat-header-cell *matHeaderCellDef>Título</th>
                    <td mat-cell *matCellDef="let t">{{ t.titulo }}</td>
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
                  <ng-container matColumnDef="agente">
                    <th mat-header-cell *matHeaderCellDef>Agente</th>
                    <td mat-cell *matCellDef="let t">
                      {{ t.agenteAsignado ? (t.agenteAsignado.nombres + ' ' + t.agenteAsignado.apellidos) : 'Sin asignar' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha creación</th>
                    <td mat-cell *matCellDef="let t" class="text-xs">{{ t.fechaCreacion | date:'short' }}</td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsTab2"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsTab2;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </mat-tab>

      <!-- ============================================================== -->
      <!-- TAB 3 — Tickets sin Asignar                                     -->
      <!-- ============================================================== -->
      <mat-tab label="Tickets sin asignar">
        <div class="p-4">
          @if (tab3.loading() && !tab3.loaded()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (tab3.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudieron cargar los tickets sin asignar.</p>
            </div>
          } @else if (tab3.tickets().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">task_alt</mat-icon>
              <p>No hay tickets sin asignar.</p>
            </div>
          } @else {
            <mat-card>
              <mat-card-content>
                <table mat-table [dataSource]="tab3.tickets()" class="w-full">
                  <ng-container matColumnDef="codigo">
                    <th mat-header-cell *matHeaderCellDef>Código</th>
                    <td mat-cell *matCellDef="let t" class="font-mono text-xs">{{ t.codigo }}</td>
                  </ng-container>
                  <ng-container matColumnDef="titulo">
                    <th mat-header-cell *matHeaderCellDef>Título</th>
                    <td mat-cell *matCellDef="let t">{{ t.titulo }}</td>
                  </ng-container>
                  <ng-container matColumnDef="prioridad">
                    <th mat-header-cell *matHeaderCellDef>Prioridad</th>
                    <td mat-cell *matCellDef="let t">
                      <span class="badge" [ngClass]="'badge-' + t.prioridad.toLowerCase()">
                        {{ getPrioridadLabel(t.prioridad) }}
                      </span>
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="cliente">
                    <th mat-header-cell *matHeaderCellDef>Cliente</th>
                    <td mat-cell *matCellDef="let t">
                      {{ t.cliente ? (t.cliente.nombres + ' ' + t.cliente.apellidos) : '-' }}
                    </td>
                  </ng-container>
                  <ng-container matColumnDef="fecha">
                    <th mat-header-cell *matHeaderCellDef>Fecha creación</th>
                    <td mat-cell *matCellDef="let t" class="text-xs">{{ t.fechaCreacion | date:'short' }}</td>
                  </ng-container>
                  <ng-container matColumnDef="acciones">
                    <th mat-header-cell *matHeaderCellDef>Acciones</th>
                    <td mat-cell *matCellDef="let t">
                      <button mat-flat-button color="primary" (click)="asignarTab3(t)">
                        <mat-icon>person_add</mat-icon> Asignar
                      </button>
                    </td>
                  </ng-container>
                  <tr mat-header-row *matHeaderRowDef="colsTab3"></tr>
                  <tr mat-row *matRowDef="let row; columns: colsTab3;"></tr>
                </table>
              </mat-card-content>
            </mat-card>
          }
        </div>
      </mat-tab>

      <!-- ============================================================== -->
      <!-- TAB 4 — Problemas por Categoría                                 -->
      <!-- ============================================================== -->
      <mat-tab label="Problemas por categoría">
        <div class="p-4">
          <div class="flex justify-end mb-4">
            <button mat-flat-button color="primary" (click)="exportTab4()" [disabled]="tab4.data().length === 0">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>
          @if (tab4.loading() && !tab4.loaded()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (tab4.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudo cargar el conteo por categoría.</p>
            </div>
          } @else if (tab4.data().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">category</mat-icon>
              <p>Sin datos de problemas por categoría.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <mat-card>
                <mat-card-header><mat-card-title>Distribución</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="space-y-4">
                    @for (r of tab4.data(); track r.categoria) {
                      <div>
                        <div class="flex justify-between text-sm mb-1">
                          <span>{{ r.categoria }}</span>
                          <span class="font-semibold">{{ r.total }}</span>
                        </div>
                        <mat-progress-bar
                          mode="determinate"
                          [value]="(r.total / tab4MaxProblemas()) * 100"
                          color="primary">
                        </mat-progress-bar>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card>
                <mat-card-header><mat-card-title>Detalle</mat-card-title></mat-card-header>
                <mat-card-content>
                  <table mat-table [dataSource]="tab4.data()" class="w-full">
                    <ng-container matColumnDef="categoria">
                      <th mat-header-cell *matHeaderCellDef>Categoría</th>
                      <td mat-cell *matCellDef="let r">{{ r.categoria }}</td>
                    </ng-container>
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef class="!text-right">Total problemas</th>
                      <td mat-cell *matCellDef="let r" class="!text-right font-semibold">{{ r.total }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="colsTab4"></tr>
                    <tr mat-row *matRowDef="let row; columns: colsTab4;"></tr>
                  </table>
                </mat-card-content>
              </mat-card>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ============================================================== -->
      <!-- TAB 5 — Mejores Agentes (por calificación)                     -->
      <!-- ============================================================== -->
      <mat-tab label="Mejores agentes">
        <div class="p-4">
          <div class="flex justify-end mb-4">
            <button mat-flat-button color="primary" (click)="exportTab5()" [disabled]="tab5.data().length === 0">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>
          @if (tab5.loading() && !tab5.loaded()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (tab5.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudo cargar el ranking de agentes.</p>
            </div>
          } @else if (tab5.data().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">star_border</mat-icon>
              <p>Aún no hay agentes calificados.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <mat-card>
                <mat-card-header><mat-card-title>Top 10</mat-card-title></mat-card-header>
                <mat-card-content>
                  <div class="space-y-4">
                    @for (r of tab5.data(); track r.agenteId; let i = $index) {
                      <div>
                        <div class="flex justify-between items-center text-sm mb-1">
                       <span>{{ i + 1 }}. {{ r.nombres }} {{ r.apellidos }}</span>
                       <span class="font-semibold flex items-center gap-0.5">
                        {{ r.promedio.toFixed(1) }}
                       <mat-icon class="text-yellow-500 !w-4 !h-4 !text-[16px] flex items-center justify-center">star</mat-icon>
                       </span>
                     </div>
                        <mat-progress-bar
                          mode="determinate"
                          [value]="(r.promedio / 5) * 100"
                          color="accent">
                        </mat-progress-bar>
                        <div class="text-xs text-gray-500 mt-1">{{ r.totalTickets }} ticket(s) calificado(s)</div>
                      </div>
                    }
                  </div>
                </mat-card-content>
              </mat-card>
              <mat-card>
                <mat-card-header><mat-card-title>Detalle</mat-card-title></mat-card-header>
                <mat-card-content>
                  <table mat-table [dataSource]="tab5.data()" class="w-full">
                    <ng-container matColumnDef="agente">
                      <th mat-header-cell *matHeaderCellDef>Agente</th>
                      <td mat-cell *matCellDef="let r">{{ r.nombres }} {{ r.apellidos }}</td>
                    </ng-container>
                    <ng-container matColumnDef="promedio">
                      <th mat-header-cell *matHeaderCellDef class="!text-right">Promedio</th>
                      <td mat-cell *matCellDef="let r" class="!text-right font-semibold">
                         {{ r.promedio.toFixed(1) }} <span class="text-amber-500 ml-1">★</span>
                        </td>
                    </ng-container>
                    <ng-container matColumnDef="total">
                      <th mat-header-cell *matHeaderCellDef class="!text-right">Tickets calificados</th>
                      <td mat-cell *matCellDef="let r" class="!text-right">{{ r.totalTickets }}</td>
                    </ng-container>
                    <tr mat-header-row *matHeaderRowDef="colsTab5"></tr>
                    <tr mat-row *matRowDef="let row; columns: colsTab5;"></tr>
                  </table>
                </mat-card-content>
              </mat-card>
            </div>
          }
        </div>
      </mat-tab>

      <!-- ============================================================== -->
      <!-- TAB 6 — Usuarios Activos                                        -->
      <!-- ============================================================== -->
      <mat-tab label="Usuarios activos">
        <div class="p-4">
          <div class="flex flex-wrap items-center gap-3 mb-4">
            <div class="text-sm text-gray-600">
              Total: <strong>{{ tab6.conteoTotal() }}</strong> usuario(s) activo(s)
            </div>
            <button mat-flat-button color="primary" (click)="exportTab6()" [disabled]="tab6.usuarios().length === 0" class="ml-auto">
              <mat-icon>download</mat-icon> Exportar CSV
            </button>
          </div>
          @if (tab6.loading() && !tab6.loaded()) {
            <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
          } @else if (tab6.error()) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-red-400">error_outline</mat-icon>
              <p>No se pudieron cargar los usuarios activos.</p>
            </div>
          } @else if (tab6.usuarios().length === 0) {
            <div class="empty-state">
              <mat-icon class="empty-icon text-gray-400">person_off</mat-icon>
              <p>No hay usuarios activos.</p>
            </div>
          } @else {
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              @for (u of tab6.usuarios(); track u.id) {
                <mat-card>
                  <mat-card-content class="!flex !items-center !gap-3">
                    <div class="user-avatar">{{ getInitials(u) }}</div>
                    <div class="flex-1 min-w-0">
                      <div class="font-semibold truncate">{{ u.nombres }} {{ u.apellidos }}</div>
                      <div class="text-sm text-gray-500 truncate">{{ u.email }}</div>
                      <div class="mt-1 flex items-center gap-2 flex-wrap">
                        @if (u.rol?.nombre) {
                          <span class="badge" [ngClass]="rolBadgeClass(u.rol!.nombre)">{{ u.rol!.nombre }}</span>
                        }
                        @if (u.empresa?.nombre) {
                          <span class="text-xs text-gray-500 truncate">{{ u.empresa!.nombre }}</span>
                        }
                      </div>
                    </div>
                  </mat-card-content>
                </mat-card>
              }
            </div>
          }
        </div>
      </mat-tab>
    </mat-tab-group>
  `,
  styles: [`
    .empty-state {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      padding: 2.5rem 1rem; color: #6b7280;
    }
    .empty-icon { font-size: 3rem; width: 3rem; height: 3rem; margin-bottom: 0.5rem; }
    .user-avatar {
      width: 3rem; height: 3rem; border-radius: 50%;
      background: #1B3A6B; color: white;
      display: flex; align-items: center; justify-content: center;
      font-weight: 600; font-size: 0.95rem; flex-shrink: 0;
    }
  `],
})
export class ReportesComponent {
  private auth = inject(AuthService);
  private tickets = inject(TicketApiService);
  private reportes = inject(ReporteApiService);
  private problemas = inject(ProblemaApiService);
  private comentarios = inject(ComentarioApiService);
  private usuarios = inject(UsuarioApiService);
  private csv = inject(CsvExportService);
  private dialog = inject(MatDialog);
  private snack = inject(MatSnackBar);

  protected rol = computed(() => this.auth.getRol());
  private empresaIdFiltro = computed(() =>
    this.rol() === 'ADMIN_EMPRESA' ? this.auth.getEmpresaId() : null
  );

  protected years = [2024, 2025, 2026, 2027, 2028];
  protected meses = MESES.map((m, i) => ({ value: i + 1, label: m }));
  protected MESES_NOMBRE = MESES_NOMBRE;

  // Lazy-load flags per tab
  protected tab1Loaded = signal(false);
  protected tab2Loaded = signal(false);
  protected tab3Loaded = signal(false);
  protected tab4Loaded = signal(false);
  protected tab5Loaded = signal(false);
  protected tab6Loaded = signal(false);

  // Color schemes
  // Columns
  protected colsTab1 = ['mes', 'total'];
  protected colsTab2 = ['codigo', 'titulo', 'estado', 'prioridad', 'agente', 'fecha'];
  protected colsTab3 = ['codigo', 'titulo', 'prioridad', 'cliente', 'fecha', 'acciones'];
  protected colsTab4 = ['categoria', 'total'];
  protected colsTab5 = ['agente', 'promedio', 'total'];

  // ============================== TAB 1 state ==============================
  protected readonly tab1 = (() => {
    const mesFiltroSig = signal(0);
    const rawSig = signal<{ mes: number; total: number }[]>([]);
    return {
      anio: new Date().getFullYear(),
      loading: signal(false),
      loaded: signal(false),
      error: signal(false),
      raw: rawSig,
      get mesFiltro(): number { return mesFiltroSig(); },
      set mesFiltro(v: number) { mesFiltroSig.set(v); },
      filtered: computed(() => {
        const all = rawSig();
        const m = mesFiltroSig();
        return m === 0 ? all : all.filter((r) => r.mes === m);
      }),
    };
  })();

  // SVG dimensions for the area chart
  protected readonly svgW = 600;
  protected readonly svgH = 280;
  protected readonly padL = 48;
  protected readonly padB = 36;
  protected readonly padT = 16;
  protected readonly padR = 16;

  protected chartPoints = computed(() => {
    const data = this.tab1.filtered();
    if (!data || data.length === 0) return null;

    const maxVal = Math.max(...data.map(d => d.total));
    const yMax   = Math.ceil((maxVal + 2) / 5) * 5 || 5;

    const innerW = this.svgW - this.padL - this.padR;
    const innerH = this.svgH - this.padB - this.padT;

    const points = data.map((d, i) => ({
      label: MESES[d.mes - 1],
      total: d.total,
      x: this.padL + (data.length === 1 ? innerW / 2 : (i / (data.length - 1)) * innerW),
      y: this.padT + innerH - (d.total / yMax) * innerH,
    }));

    const linePath = points.map((p, i) => `${i === 0 ? 'M' : 'L'}${p.x},${p.y}`).join(' ');
    const areaPath = `${linePath} L${points[points.length - 1].x},${this.padT + innerH} L${points[0].x},${this.padT + innerH} Z`;

    const yTicks = Array.from({ length: yMax / 5 + 1 }, (_, i) => {
      const val = i * 5;
      const y   = this.padT + innerH - (val / yMax) * innerH;
      return { val, y };
    });

    return { points, linePath, areaPath, yTicks, innerH };
  });

  // ============================== TAB 2 state ==============================
  protected fechaInicio = signal<Date | null>(null);
  protected fechaFin = signal<Date | null>(null);
  protected tab2 = {
    loading: signal(false),
    error: signal(false),
    tickets: signal<Ticket[]>([]),
  };

  // ============================== TAB 3 state ==============================
  protected tab3 = {
    loading: signal(false),
    loaded: signal(false),
    error: signal(false),
    tickets: signal<Ticket[]>([]),
  };

  // ============================== TAB 4 state ==============================
  private readonly tab4Raw = signal<{ categoria: string; total: number }[]>([]);
  protected tab4 = {
    loading: signal(false),
    loaded: signal(false),
    error: signal(false),
    raw: this.tab4Raw,
    data: computed(() => this.tab4Raw()),
  };
  protected tab4MaxProblemas = computed(() => {
    const values = this.tab4.data().map((r) => r.total);
    return values.length ? Math.max(...values) : 1;
  });

  // ============================== TAB 5 state ==============================
  // Ranking de mejores agentes por promedio de calificación.
  private readonly tab5Raw = signal<RankingAgente[]>([]);
  protected tab5 = {
    loading: signal(false),
    loaded: signal(false),
    error: signal(false),
    raw: this.tab5Raw,
    data: computed(() => this.tab5Raw().slice(0, 10)),
  };

  // ============================== TAB 6 state ==============================
  protected tab6 = {
    loading: signal(false),
    loaded: signal(false),
    error: signal(false),
    conteoTotal: signal(0),
    usuarios: signal<Usuario[]>([]),
  };

  onTabChange(index: number): void {
    if (index === 0 && !this.tab1Loaded()) { this.tab1Loaded.set(true); this.loadTab1(); }
    if (index === 1 && !this.tab2Loaded()) { this.tab2Loaded.set(true); /* user must pick dates */ }
    if (index === 2 && !this.tab3Loaded()) { this.tab3Loaded.set(true); this.loadTab3(); }
    if (index === 3 && !this.tab4Loaded()) { this.tab4Loaded.set(true); this.loadTab4(); }
    if (index === 4 && !this.tab5Loaded()) { this.tab5Loaded.set(true); this.loadTab5(); }
    if (index === 5 && !this.tab6Loaded()) { this.tab6Loaded.set(true); this.loadTab6(); }
  }

  // ============================== TAB 1 ==============================
  loadTab1(): void {
    const rol = this.auth.user()?.rol;
    const eid = this.auth.getEmpresaId();
    const mes = this.tab1.mesFiltro !== 0 ? this.tab1.mesFiltro : undefined;
    this.tab1.loading.set(true);
    this.tab1.error.set(false);
    const obs = rol === 'ADMIN_OWNER'
      ? this.reportes.ticketsPorMesGlobal(this.tab1.anio, mes)
      : this.reportes.ticketsPorMes(eid!, this.tab1.anio, mes);
    obs.subscribe({
      next: (rows) => {
        this.tab1.raw.set(rows || []);
        this.tab1.loading.set(false);
        this.tab1.loaded.set(true);
      },
      error: () => {
        this.tab1.error.set(true);
        this.tab1.loading.set(false);
        this.tab1.loaded.set(true);
      },
    });
  }
  exportTab1(): void {
    const data = this.tab1.filtered().map((r: { mes: number; total: number }) => ({
      Mes: MESES_NOMBRE[r.mes - 1] || `M${r.mes}`,
      'Cantidad de tickets': r.total,
    }));
    this.csv.export(data, `tickets-por-mes-${this.tab1.anio}.csv`);
  }

  // ============================== TAB 2 ==============================
  loadTab2(): void {
    const ini = this.fechaInicio();
    const fin = this.fechaFin();
    if (!ini || !fin) return;
    this.tab2.loading.set(true);
    this.tab2.error.set(false);
    const desde = this.formatDate(ini);
    const hasta = this.formatDate(fin);
    const rol = this.auth.user()?.rol;
    const eid = this.auth.getEmpresaId();
    const obs = rol === 'ADMIN_OWNER'
      ? this.tickets.listarPorPeriodoGlobal(desde, hasta)
      : this.tickets.listarPorPeriodo(eid!, desde, hasta);
    obs.subscribe({
      next: (ts) => { this.tab2.tickets.set(ts || []); this.tab2.loading.set(false); },
      error: () => { this.tab2.error.set(true); this.tab2.loading.set(false); },
    });
  }
  exportTab2(): void {
    const data = this.tab2.tickets().map((t) => ({
      Codigo: t.codigo,
      Titulo: t.titulo,
      Estado: this.getEstadoLabel(t.estado),
      Prioridad: this.getPrioridadLabel(t.prioridad),
      Agente: t.agenteAsignado ? `${t.agenteAsignado.nombres} ${t.agenteAsignado.apellidos}` : 'Sin asignar',
      'Fecha creación': t.fechaCreacion || '',
    }));
    const inicio = this.fechaInicio();
    const fin = this.fechaFin();
    const desde = inicio ? this.formatDate(inicio) : '';
    const hasta = fin ? this.formatDate(fin) : '';
    this.csv.export(data, `tickets-periodo-${desde}-${hasta}.csv`);
  }

  // ============================== TAB 3 ==============================
  loadTab3(): void {
    const rol = this.auth.user()?.rol;
    const eid = this.auth.getEmpresaId();
    this.tab3.loading.set(true);
    this.tab3.error.set(false);
    const obs = rol === 'ADMIN_OWNER'
      ? this.tickets.sinAsignarGlobal()
      : this.tickets.sinAsignar(eid!);
    obs.subscribe({
      next: (ts) => { this.tab3.tickets.set(ts || []); this.tab3.loading.set(false); this.tab3.loaded.set(true); },
      error: () => { this.tab3.error.set(true); this.tab3.loading.set(false); this.tab3.loaded.set(true); },
    });
  }
  asignarTab3(t: Ticket): void {
    const eid = this.auth.getEmpresaId();
    if (!eid) return;
    this.usuarios.listarAgentes(eid).subscribe((agentes) => {
      const ref = this.dialog.open(AsignarDialog, { data: { agentes }, width: '400px' });
      ref.afterClosed().subscribe((agenteId: number | null) => {
        if (agenteId && agenteId > 0) {
          this.tickets.asignarAgente(t.id, { agenteId }).subscribe({
            next: () => {
              this.tab3.tickets.set(this.tab3.tickets().filter((x) => x.id !== t.id));
              this.snack.open('Agente asignado', 'OK', { duration: 2000, panelClass: ['snack-success'] });
            },
          });
        }
      });
    });
  }

  // ============================== TAB 4 ==============================
  loadTab4(): void {
    this.tab4.loading.set(true);
    this.tab4.error.set(false);
    this.problemas.contarPorCategoria(this.empresaIdFiltro() ?? undefined).subscribe({
      next: (rows) => { this.tab4.raw.set(rows || []); this.tab4.loading.set(false); this.tab4.loaded.set(true); },
      error: () => { this.tab4.error.set(true); this.tab4.loading.set(false); this.tab4.loaded.set(true); },
    });
  }
  exportTab4(): void {
    const data = this.tab4.raw().map((r: { categoria: string; total: number }) => ({ Categoria: r.categoria, 'Total problemas': r.total }));
    this.csv.export(data, 'problemas-por-categoria.csv');
  }

  // ============================== TAB 5 ==============================
  loadTab5(): void {
    this.tab5.loading.set(true);
    this.tab5.error.set(false);
    this.tickets.rankingAgentes(this.empresaIdFiltro() ?? undefined).subscribe({
      next: (rows) => {
        // El servicio ya mapea las filas a RankingAgente.
        this.tab5.raw.set(rows || []);
        this.tab5.loading.set(false);
        this.tab5.loaded.set(true);
      },
      error: () => { this.tab5.error.set(true); this.tab5.loading.set(false); this.tab5.loaded.set(true); },
    });
  }
  exportTab5(): void {
    const data = this.tab5.raw().map((r) => ({
      Agente: `${r.nombres} ${r.apellidos}`,
      'Promedio': r.promedio.toFixed(1),
      'Tickets calificados': r.totalTickets,
    }));
    this.csv.export(data, 'mejores-agentes.csv');
  }

  // ============================== TAB 6 ==============================
  loadTab6(): void {
    const rol = this.auth.user()?.rol;
    const eid = this.auth.getEmpresaId();
    this.tab6.loading.set(true);
    this.tab6.error.set(false);
    const conteoObs = rol === 'ADMIN_OWNER'
      ? this.reportes.usuariosActivosGlobal()
      : this.reportes.usuariosActivos(eid!);
    conteoObs.subscribe({
      next: (r) => this.tab6.conteoTotal.set(Number(r?.usuariosActivos || 0)),
      error: () => this.tab6.error.set(true),
    });
    const listaObs = rol === 'ADMIN_OWNER'
      ? this.usuarios.listarPorEstado(true)
      : this.usuarios.listarActivosPorEmpresa(eid!, true);
    listaObs.subscribe({
      next: (us) => {
        this.tab6.usuarios.set(us || []);
        this.tab6.loading.set(false);
        this.tab6.loaded.set(true);
        if (!this.tab6.conteoTotal()) this.tab6.conteoTotal.set((us || []).length);
      },
      error: () => { this.tab6.error.set(true); this.tab6.loading.set(false); this.tab6.loaded.set(true); },
    });
  }
  exportTab6(): void {
    const data = this.tab6.usuarios().map((u) => ({
      Nombre: `${u.nombres} ${u.apellidos}`,
      Email: u.email,
      Rol: u.rol?.nombre || '',
      Empresa: u.empresa?.nombre || '',
      Estado: u.activo ? 'Activo' : 'Inactivo',
    }));
    this.csv.export(data, 'usuarios-activos.csv');
  }

  // ============================== Helpers ==============================
  private formatDate(d: Date): string {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  getEstadoLabel(e: string): string { return (EstadoTicketLabel as Record<string, string>)[e] || e; }
  getPrioridadLabel(p: string): string { return (PrioridadTicketLabel as Record<string, string>)[p] || p; }
  getInitials(u: { nombres: string; apellidos: string }): string {
    return `${(u.nombres || '').charAt(0)}${(u.apellidos || '').charAt(0)}`.toUpperCase();
  }
  rolBadgeClass(rol: string): string {
    const r = rol.toUpperCase();
    if (r.includes('OWNER')) return 'badge-cerrado';
    if (r.includes('ADMIN')) return 'badge-resuelto';
    if (r.includes('AGENTE')) return 'badge-progreso';
    return 'badge-abierto';
  }
}
