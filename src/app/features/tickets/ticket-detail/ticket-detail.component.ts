import { Component, ChangeDetectionStrategy, inject, OnInit, signal, computed } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatDividerModule } from '@angular/material/divider';
import { MatChipsModule } from '@angular/material/chips';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { FormsModule, ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { TicketApiService } from '../../../core/services/ticket-api.service';
import { ComentarioApiService } from '../../../core/services/comentario-api.service';
import { UsuarioApiService } from '../../../core/services/usuario-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Comentario } from '../../../core/models/comentario.model';
import { EstadoTicket, EstadoTicketLabel, PrioridadTicket, PrioridadTicketLabel } from '../../../core/models/enums';
import { CambiarEstadoRequest, CierreRequest } from '../../../core/models/ticket.model';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-ticket-detail',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, MatCardModule, MatButtonModule, MatIconModule,
    MatDividerModule, MatChipsModule, MatFormFieldModule, MatInputModule,
    MatSelectModule, MatOptionModule, MatProgressSpinnerModule, MatDialogModule, FormsModule, ReactiveFormsModule,
  ],
  template: `
    <div class="flex items-center gap-2 mb-4">
      <a mat-icon-button [routerLink]="[backUrl()]"><mat-icon>arrow_back</mat-icon></a>
      <h1 class="text-2xl font-bold">Ticket {{ ticket()?.codigo }}</h1>
    </div>

    @if (loading()) {
      <div class="flex justify-center py-12"><mat-spinner></mat-spinner></div>
    } @else if (ticket()) {
      <div class="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <mat-card [class.lg:col-span-3]="rol() === 'CLIENTE'" [class.lg:col-span-2]="rol() !== 'CLIENTE'">
          <mat-card-header>
            <mat-card-title>{{ ticket()!.titulo }}</mat-card-title>
            <mat-card-subtitle>
              <span class="badge" [ngClass]="'badge-' + ticket()!.estado.toLowerCase().replace('_','')">
                {{ getEstadoLabel(ticket()!.estado) }}
              </span>
              <span class="badge ml-1" [ngClass]="'badge-' + ticket()!.prioridad.toLowerCase()">
                {{ getPrioridadLabel(ticket()!.prioridad) }}
              </span>
            </mat-card-subtitle>
          </mat-card-header>
          <mat-card-content>
            <div class="text-sm text-gray-600">
              <div><strong>Cliente:</strong> {{ ticket()!.cliente?.nombres }} {{ ticket()!.cliente?.apellidos }}</div>
              <div><strong>Agente:</strong> {{ ticket()!.agenteAsignado ? (ticket()!.agenteAsignado!.nombres + ' ' + ticket()!.agenteAsignado!.apellidos) : 'Sin asignar' }}</div>
              <div><strong>Categoría:</strong> {{ ticket()!.categoria?.nombre || '-' }}</div>
              <div><strong>Problema:</strong> {{ ticket()!.problema?.nombre || '-' }}</div>
              <div><strong>Creado:</strong> {{ ticket()!.fechaCreacion | date:'dd/MM/yyyy HH:mm' }}</div>
              @if (ticket()!.justificacionCierre) {
                <div class="mt-2 p-2 bg-blue-50 rounded"><strong>Resolución:</strong> {{ ticket()!.justificacionCierre }}</div>
              }
              @if (ticket()!.imagenCierre) {
                <div class="mt-3">
                  <button mat-stroked-button color="primary" (click)="verImagenCierre()">
                    <mat-icon>zoom_in</mat-icon> Ver imagen de cierre
                  </button>
                </div>
              }

              <!-- Calificación del agente por parte del cliente dueño -->
              @if (rol() === 'CLIENTE' && ticket()!.estado === 'RESUELTO' && ticket()!.agenteAsignado) {
                <div class="mt-3 p-3 border rounded bg-yellow-50">
                  @if (!ticket()!.calificacionAgente) {
                    <div class="text-sm font-medium text-gray-700 mb-1">Califica la atención recibida:</div>
                    <div class="flex items-center gap-1">
                      @for (s of [1,2,3,4,5]; track s) {
                        <button mat-icon-button type="button"
                                (click)="calificar(s)"
                                (mouseenter)="hoverCalificacion.set(s)"
                                (mouseleave)="hoverCalificacion.set(0)"
                                [disabled]="calificando()"
                                class="!w-10 !h-10">
                          <mat-icon class="text-yellow-500" style="font-size:32px">
                            {{ (hoverCalificacion() >= s) ? 'star' : 'star_border' }}
                          </mat-icon>
                        </button>
                      }
                      <span class="text-sm text-gray-500 ml-2">
                        {{ (hoverCalificacion() || 0) }} / 5
                      </span>
                    </div>
                    <button mat-stroked-button color="warn" class="mt-2" (click)="reabrir()" [disabled]="reabriendo()">
                      <mat-icon>replay</mat-icon> Reabrir ticket
                    </button>
                    <p class="text-xs text-gray-500 mt-1">Si la solución no fue satisfactoria, reabre el ticket y el agente lo retomará.</p>
                  } @else {
                    <div class="text-sm font-medium text-gray-700 mb-1">Tu calificación:</div>
                    <div class="flex items-center gap-1">
                      @for (s of [1,2,3,4,5]; track s) {
                        <mat-icon class="text-yellow-500" style="font-size:28px">
                          {{ s <= (ticket()!.calificacionAgente || 0) ? 'star' : 'star_border' }}
                        </mat-icon>
                      }
                      <span class="text-sm text-gray-600 ml-2 italic">Gracias por tu calificación</span>
                    </div>
                  }
                </div>
              }
            </div>
          </mat-card-content>
        </mat-card>

        @if (rol() !== 'CLIENTE') {
        <mat-card>
          <mat-card-header><mat-card-title>Acciones</mat-card-title></mat-card-header>
          <mat-card-content class="flex flex-col gap-2">
            @if (rol() === 'AGENTE') {
              @if (ticket()!.estado === 'ABIERTO') {
                <button mat-flat-button color="primary" (click)="tomarTicket()" [disabled]="tomandoTicket()">
                  <mat-icon>assignment_ind</mat-icon> Tomar ticket
                </button>
              }
              @if (ticket()!.estado === 'EN_PROGRESO' && ticket()!.agenteAsignado?.id === userId()) {
                @if (!showResolutionForm()) {
                  <button mat-flat-button color="accent" (click)="showResolutionForm.set(true)">
                    <mat-icon>check_circle</mat-icon> Resolver ticket
                  </button>
                } @else {
                  <div class="flex flex-col gap-2 p-2 border rounded">
                    <mat-form-field appearance="outline" class="w-full">
                      <mat-label>Justificación</mat-label>
                      <textarea matInput rows="3" [(ngModel)]="resolucionJustificacion" placeholder="Describa cómo resolvió el ticket"></textarea>
                    </mat-form-field>
                    <div class="flex items-center gap-2">
                      <button mat-stroked-button (click)="fileInput.click()">
                        <mat-icon>image</mat-icon> {{ selectedFile() ? selectedFile()!.name : 'Subir imagen' }}
                      </button>
                      <input #fileInput type="file" accept="image/jpeg,image/png,image/webp" hidden (change)="onFileSelected($event)">
                      @if (previewUrl()) {
                        <img [src]="previewUrl()" class="h-12 w-12 object-cover rounded border">
                      }
                    </div>
                    <div class="flex gap-2">
                      <button mat-flat-button color="primary" (click)="resolverTicket()" [disabled]="!resolucionJustificacion || resolucionJustificacion.length < 10 || resolviendo()">
                        <mat-icon>check</mat-icon> Marcar como Resuelto
                      </button>
                      <button mat-button (click)="cancelarResolucion()">Cancelar</button>
                    </div>
                  </div>
                }
              }
              @if (ticket()!.estado === 'RESUELTO' || ticket()!.estado === 'CERRADO') {
                <p class="text-sm text-gray-500 italic">Ticket {{ getEstadoLabel(ticket()!.estado).toLowerCase() }}</p>
              }
            }
            @if (rol() === 'ADMIN_EMPRESA' || rol() === 'ADMIN_OWNER') {
              @if (ticket()!.estado !== 'RESUELTO' && ticket()!.estado !== 'CERRADO') {
                @if (!ticket()!.agenteAsignado) {
                  <button mat-stroked-button color="primary" (click)="abrirAsignar()">
                    <mat-icon>person_add</mat-icon> Asignar Agente
                  </button>
                }
                <button mat-stroked-button color="accent" class="mt-2" (click)="abrirCambiarEstado()">
                  <mat-icon>sync</mat-icon> Cambiar Estado
                </button>
              } @else {
                <p class="text-sm text-gray-500 italic flex items-center gap-1">
                  <mat-icon style="font-size:16px">lock</mat-icon>
                  Ticket {{ getEstadoLabel(ticket()!.estado).toLowerCase() }}: acciones bloqueadas.
                </p>
              }
            }
          </mat-card-content>
        </mat-card>
        }

        <!-- Descripción del problema (en su propia card) -->
        <mat-card class="lg:col-span-3">
          <mat-card-header><mat-card-title>Descripción del problema</mat-card-title></mat-card-header>
          <mat-card-content>
            <p class="whitespace-pre-wrap text-gray-700">{{ ticket()!.descripcion }}</p>
          </mat-card-content>
        </mat-card>

        <mat-card class="lg:col-span-3">
          <mat-card-header><mat-card-title>Conversación</mat-card-title></mat-card-header>
          <mat-card-content>
            <div class="flex flex-col gap-3 max-h-96 overflow-y-auto mb-4">
              @for (c of comentarios(); track c.id) {
                <div class="border-l-4 rounded p-3" [ngClass]="c.esSistema ? 'border-gray-400 bg-gray-100' : 'border-primary-500 bg-gray-50'">
                  <div class="text-xs mb-1" [ngClass]="c.esSistema ? 'text-gray-400' : 'text-gray-500'">
                    @if (c.esSistema) {
                      <mat-icon class="text-xs align-text-bottom" style="font-size:14px;height:14px;width:14px;">info</mat-icon>
                    }
                    <strong>{{ c.usuarioNombre }}</strong> · {{ c.fechaEnvio | date:'short' }}
                    @if (c.esSistema) { <span class="italic">(automático)</span> }
                  </div>
                  <div class="whitespace-pre-wrap" [ngClass]="c.esSistema ? 'text-sm text-gray-500 italic' : ''">{{ c.mensaje }}</div>
                </div>
              } @empty {
                <p class="text-gray-500 italic">Sin comentarios aún.</p>
              }
            </div>
            @if (ticket()!.estado !== 'CERRADO' && ticket()!.estado !== 'RESUELTO' && rol() !== 'CLIENTE' && rol() !== 'ADMIN_EMPRESA') {
              <form [formGroup]="comentarioForm" (ngSubmit)="enviarComentario()" class="flex gap-2">
                <mat-form-field appearance="outline" class="flex-1">
                  <mat-label>Nuevo comentario</mat-label>
                  <textarea matInput rows="2" formControlName="mensaje"></textarea>
                </mat-form-field>
                <button mat-flat-button color="primary" type="submit" [disabled]="comentarioForm.invalid">
                  <mat-icon>send</mat-icon>
                </button>
              </form>
            } @else if (ticket()!.estado === 'RESUELTO' || ticket()!.estado === 'CERRADO') {
              <p class="text-sm text-gray-500 italic flex items-center gap-1">
                <mat-icon style="font-size:16px">lock</mat-icon>
                Los comentarios están bloqueados porque el ticket está {{ getEstadoLabel(ticket()!.estado).toLowerCase() }}.
              </p>
            }
          </mat-card-content>
        </mat-card>
      </div>
    }
  `,
})
export class TicketDetailComponent implements OnInit {
  private route = inject(ActivatedRoute);
  private router = inject(Router);
  private ticketApi = inject(TicketApiService);
  private comentarioApi = inject(ComentarioApiService);
  private usuarioApi = inject(UsuarioApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  private fb = inject(FormBuilder);

  protected loading = signal(true);
  protected tomandoTicket = signal(false);
  protected resolviendo = signal(false);
  protected ticket = signal<any>(null);
  protected comentarios = signal<Comentario[]>([]);
  protected estadoLabel = EstadoTicketLabel;
  protected prioridadLabel = PrioridadTicketLabel;
  protected comentarioForm = this.fb.nonNullable.group({ mensaje: ['', Validators.required] });
  protected showResolutionForm = signal(false);
  protected selectedFile = signal<File | null>(null);
  protected previewUrl = signal<string | null>(null);
  protected resolucionJustificacion = '';
  // Calificación del agente por parte del cliente.
  protected hoverCalificacion = signal(0);
  protected calificando = signal(false);
  protected reabriendo = signal(false);

  protected rol = computed(() => this.auth.getRol());
  protected userId = computed(() => this.auth.getUserId());
  protected imageBaseUrl = environment.apiBaseUrl.replace('/api', '');

  // Destino del botón "volver": si se llegó desde el dashboard, regresa ahí;
  // en caso contrario vuelve al listado de tickets.
  protected backUrl = computed(() =>
    this.route.snapshot.queryParamMap.get('from') === 'dashboard' ? '/dashboard' : '/tickets'
  );

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.ticketApi.buscarPorId(id).subscribe({
      next: (t) => { this.ticket.set(t); this.loading.set(false); this.cargarComentarios(id); },
      error: () => { this.loading.set(false); this.router.navigate(['/tickets']); },
    });
  }

  cargarComentarios(id: number): void {
    this.comentarioApi.listarPorTicket(id).subscribe({
      next: (cs) => {
        // Filtramos cualquier comentario cuyo mensaje sea igual a la descripción
        // del ticket: evita que la descripción se vea duplicada en la conversación.
        // (La conversación debe quedar reservada para el agente.)
        const desc = (this.ticket()?.descripcion ?? '').trim();
        const limpios = (cs || []).filter((c) => (c.mensaje ?? '').trim() !== desc);
        this.comentarios.set(limpios);
      },
      error: () => this.comentarios.set([]),
    });
  }

  enviarComentario(): void {
    if (this.comentarioForm.invalid) return;
    const id = this.ticket()?.id;
    this.comentarioApi.agregar({ mensaje: this.comentarioForm.value.mensaje!, ticketId: id }).subscribe({
      next: (c) => {
        this.comentarios.update((arr) => [...arr, c]);
        this.comentarioForm.reset({ mensaje: '' });
        this.snack.open('Comentario enviado', 'OK', { duration: 2000, panelClass: ['snack-success'] });
      },
    });
  }

  tomarTicket(): void {
    const ticket = this.ticket();
    const uid = this.userId();
    if (!ticket || !uid) return;
    this.tomandoTicket.set(true);
    this.ticketApi.asignarAgente(ticket.id, { agenteId: uid }).subscribe({
      next: (t1) => {
        this.ticketApi.cambiarEstado(t1.id, { estado: EstadoTicket.EN_PROGRESO, usuarioId: uid }).subscribe({
          next: (t2) => {
            this.ticket.set(t2);
            this.tomandoTicket.set(false);
            this.cargarComentarios(ticket.id);
            this.snack.open('Ticket asignado y en progreso', 'OK', { duration: 2000, panelClass: ['snack-success'] });
          },
          error: () => { this.tomandoTicket.set(false); this.snack.open('Error al cambiar estado', 'OK', { duration: 3000, panelClass: ['snack-error'] }); },
        });
      },
      error: () => { this.tomandoTicket.set(false); this.snack.open('Error al asignar ticket', 'OK', { duration: 3000, panelClass: ['snack-error'] }); },
    });
  }

  resolverTicket(): void {
    const ticket = this.ticket();
    const uid = this.userId();
    if (!ticket || !uid) return;
    this.resolviendo.set(true);
    const file = this.selectedFile();
    if (file) {
      this.ticketApi.subirImagenCierre(ticket.id, file).subscribe({
        next: (res) => this.ejecutarCierre(ticket.id, uid, res.imagenCierre),
        error: (err) => {
          this.resolviendo.set(false);
          const msg = err.error?.error || 'Error al subir imagen';
          this.snack.open(msg, 'OK', { duration: 3000, panelClass: ['snack-error'] });
        },
      });
    } else {
      this.ejecutarCierre(ticket.id, uid, undefined);
    }
  }

  private ejecutarCierre(ticketId: number, usuarioId: number, imagenCierre?: string): void {
    const payload: CierreRequest = { justificacionCierre: this.resolucionJustificacion, usuarioId };
    if (imagenCierre) payload.imagenCierre = imagenCierre;
    this.ticketApi.guardarCierre(ticketId, payload).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.resolviendo.set(false);
        this.showResolutionForm.set(false);
        this.selectedFile.set(null);
        this.previewUrl.set(null);
        this.resolucionJustificacion = '';
        this.cargarComentarios(ticketId);
        this.snack.open('Ticket resuelto', 'OK', { duration: 2000, panelClass: ['snack-success'] });
      },
      error: () => {
        this.resolviendo.set(false);
        this.snack.open('Error al guardar resolución', 'OK', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      const file = input.files[0];
      const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
      if (!validTypes.includes(file.type)) {
        this.snack.open('Solo JPG, PNG o WEBP', 'OK', { duration: 3000, panelClass: ['snack-error'] });
        return;
      }
      if (file.size > 5 * 1024 * 1024) {
        this.snack.open('Máximo 5MB', 'OK', { duration: 3000, panelClass: ['snack-error'] });
        return;
      }
      this.selectedFile.set(file);
      const reader = new FileReader();
      reader.onload = () => this.previewUrl.set(reader.result as string);
      reader.readAsDataURL(file);
    }
  }

  cancelarResolucion(): void {
    this.showResolutionForm.set(false);
    this.selectedFile.set(null);
    this.previewUrl.set(null);
    this.resolucionJustificacion = '';
  }

  calificar(estrellas: number): void {
    const ticket = this.ticket();
    if (!ticket || ticket.calificacionAgente) return;
    this.calificando.set(true);
    this.ticketApi.calificar(ticket.id, estrellas).subscribe({
      next: (t) => {
        this.ticket.set(t);
        this.calificando.set(false);
        this.hoverCalificacion.set(0);
        this.cargarComentarios(t.id);
        this.snack.open('¡Gracias por tu calificación!', 'OK', { duration: 2500, panelClass: ['snack-success'] });
      },
      error: (err) => {
        this.calificando.set(false);
        const msg = err?.error?.message || 'No se pudo guardar la calificación.';
        this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }

  /** El cliente dueño reabre un ticket RESUELTO que no fue satisfactorio. */
  reabrir(): void {
    const ticket = this.ticket();
    if (!ticket) return;
    const ref = this.dialog.open(ReabrirConfirmDialog, { width: '420px' });
    ref.afterClosed().subscribe((confirmado: boolean | undefined) => {
      if (!confirmado) return;
      this.reabriendo.set(true);
      this.ticketApi.reabrirTicket(ticket.id).subscribe({
        next: (t) => {
          this.ticket.set(t);
          this.reabriendo.set(false);
          this.cargarComentarios(t.id);
          this.snack.open('Ticket reabierto. El agente lo retomará.', 'OK', { duration: 2500, panelClass: ['snack-success'] });
        },
        error: (err) => {
          this.reabriendo.set(false);
          const msg = err?.error?.message || 'No se pudo reabrir el ticket.';
          this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
        },
      });
    });
  }

  verImagenCierre(): void {
    const t = this.ticket();
    if (!t?.imagenCierre) return;
    this.dialog.open(ImagenCierreDialog, {
      data: { url: this.imageBaseUrl + t.imagenCierre, codigo: t.codigo },
      panelClass: 'imagen-cierre-dialog-panel',
      maxWidth: '95vw',
    });
  }

  abrirAsignar(): void {
    const eid = this.ticket()?.empresa?.id ?? this.auth.getEmpresaId();
    if (!eid) return;
    this.usuarioApi.listarAgentes(eid).subscribe((agentes) => {
      const ref = this.dialog.open(AsignarDialog, { data: { agentes }, width: '400px' });
      ref.afterClosed().subscribe((agenteId) => {
        if (agenteId) {
          this.ticketApi.asignarAgente(this.ticket().id, { agenteId }).subscribe({
            next: (t) => {
              this.ticket.set(t);
              this.cargarComentarios(this.ticket().id);
              this.snack.open('Agente asignado', 'OK', { duration: 2000, panelClass: ['snack-success'] });
            },
          });
        }
      });
    });
  }

  abrirCambiarEstado(): void {
    const uid = this.userId();
    const ref = this.dialog.open(EstadoDialog, { data: { estadoActual: this.ticket().estado }, width: '400px' });
    ref.afterClosed().subscribe((payload: CambiarEstadoRequest | undefined) => {
      if (payload) {
        payload.usuarioId = uid ?? undefined;
        this.ticketApi.cambiarEstado(this.ticket().id, payload).subscribe({
          next: (t) => {
            this.ticket.set(t);
            this.cargarComentarios(this.ticket().id);
            this.snack.open('Estado actualizado', 'OK', { duration: 2000, panelClass: ['snack-success'] });
          },
        });
      }
    });
  }

  getEstadoLabel(e: string): string { return (EstadoTicketLabel as Record<string, string>)[e] || e; }
  getPrioridadLabel(p: string): string { return (PrioridadTicketLabel as Record<string, string>)[p] || p; }
}

@Component({
  selector: 'app-asignar-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, FormsModule],
  template: `
    <h2 mat-dialog-title>Asignar Agente</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Agente</mat-label>
        <mat-select [(ngModel)]="agenteId">
          @for (a of data.agentes; track a.id) {
            <mat-option [value]="a.id">{{ a.nombres }} {{ a.apellidos }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!agenteId" [mat-dialog-close]="agenteId">Asignar</button>
    </mat-dialog-actions>
  `,
})
export class AsignarDialog {
  protected data = inject<{ agentes: any[] }>(MAT_DIALOG_DATA);
  protected ref = inject(MatDialogRef<AsignarDialog>);
  protected agenteId: number | null = null;
}

@Component({
  selector: 'app-estado-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatSelectModule, MatOptionModule, MatInputModule, FormsModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Cambiar Estado</h2>
    <mat-dialog-content>
      <mat-form-field appearance="outline" class="w-full">
        <mat-label>Nuevo estado</mat-label>
        <mat-select [(ngModel)]="estado">
          @for (e of estados; track e) {
            <mat-option [value]="e">{{ label[e] }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
      @if (estado === 'CERRADO') {
        <mat-form-field appearance="outline" class="w-full">
          <mat-label>Justificación (obligatoria)</mat-label>
          <textarea matInput rows="3" [(ngModel)]="justificacion"></textarea>
        </mat-form-field>
      }
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="!estado || (estado === 'CERRADO' && !justificacion)" [mat-dialog-close]="{ estado: estado, justificacionCierre: justificacion }">Guardar</button>
    </mat-dialog-actions>
  `,
})
export class EstadoDialog {
  protected data = inject<{ estadoActual: EstadoTicket }>(MAT_DIALOG_DATA);
  protected ref = inject(MatDialogRef<EstadoDialog>);
  protected estados = Object.values(EstadoTicket);
  protected label = EstadoTicketLabel;
  protected estado: EstadoTicket = this.data.estadoActual;
  protected justificacion = '';
}

@Component({
  selector: 'app-reabrir-confirm-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon class="text-orange-500">replay</mat-icon>
      Reabrir ticket
    </h2>
    <mat-dialog-content>
      <p>¿Seguro que querés reabrir este ticket?</p>
      <p class="text-sm text-gray-600">Si la solución no fue satisfactoria, el ticket volverá a <strong>En progreso</strong> y el agente tendrá que retomarlo. No podrás calificar hasta que lo vuelva a resolver.</p>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="warn" [mat-dialog-close]="true">Sí, reabrir</button>
    </mat-dialog-actions>
  `,
})
export class ReabrirConfirmDialog {}

@Component({
  selector: 'app-imagen-cierre-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="flex items-center gap-2">
      <mat-icon>image</mat-icon>
      Imagen de cierre — Ticket {{ data.codigo }}
    </h2>
    <mat-dialog-content class="imagen-cierre-dialog-content">
      <img [src]="data.url" [alt]="'Imagen de cierre del ticket ' + data.codigo" class="imagen-cierre-full" />
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-stroked-button type="button" (click)="abrirEnPestana()">
        <mat-icon>open_in_new</mat-icon> Abrir en pestaña nueva
      </button>
      <button mat-flat-button color="primary" mat-dialog-close>Cerrar</button>
    </mat-dialog-actions>
  `,
})
export class ImagenCierreDialog {
  protected data = inject<{ url: string; codigo: string }>(MAT_DIALOG_DATA);

  abrirEnPestana(): void {
    // Usamos window.open con un HTML wrapper para que la pestaña nueva
    // muestre la imagen centrada sobre fondo oscuro, en vez de que el
    // navegador la descargue o la muestre en tamaño natural.
    const html = `<!doctype html><html lang="es"><head><meta charset="utf-8">
<title>Imagen de cierre — ${this.data.codigo}</title>
<style>
  html,body{margin:0;height:100%;background:#111;color:#eee;font-family:system-ui,sans-serif}
  body{display:flex;align-items:center;justify-content:center;flex-direction:column;gap:12px}
  img{max-width:96vw;max-height:90vh;object-fit:contain;border-radius:6px;box-shadow:0 8px 32px rgba(0,0,0,.6)}
  small{opacity:.7}
  a{color:#7ab8ff}
</style></head>
<body>
  <img src="${this.data.url}" alt="Imagen de cierre del ticket ${this.data.codigo}">
  <small>Ticket ${this.data.codigo} · <a href="${this.data.url}" target="_blank" rel="noopener">abrir archivo original</a></small>
</body></html>`;
    const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
    const blobUrl = URL.createObjectURL(blob);
    const win = window.open(blobUrl, '_blank', 'noopener');
    // Liberamos el blob después de que la pestaña termine de cargar
    setTimeout(() => URL.revokeObjectURL(blobUrl), 30000);
    if (!win) {
      // Pop-up bloqueado: caemos a descarga como fallback
      const a = document.createElement('a');
      a.href = this.data.url;
      a.target = '_blank';
      a.rel = 'noopener';
      a.click();
    }
  }
}
