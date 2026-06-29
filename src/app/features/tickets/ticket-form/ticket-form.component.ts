import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, DestroyRef } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { CommonModule } from '@angular/common';
import { Router, RouterLink } from '@angular/router';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { TextFieldModule } from '@angular/cdk/text-field';
import { TicketApiService } from '../../../core/services/ticket-api.service';
import { ProblemaApiService } from '../../../core/services/problema-api.service';
import { CategoriaApiService } from '../../../core/services/categoria-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { PrioridadTicket } from '../../../core/models/enums';

@Component({
  selector: 'app-ticket-form',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatOptionModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, TextFieldModule,
  ],
  template: `
    <div class="flex items-center gap-2 mb-4">
      <a mat-icon-button routerLink="/tickets"><mat-icon>arrow_back</mat-icon></a>
      <h1 class="text-2xl font-bold">Reportar un problema</h1>
    </div>
    <mat-card>
      <mat-card-content>
        <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3 max-w-2xl">
          <mat-form-field appearance="outline">
            <mat-label>Título / Asunto</mat-label>
            <input matInput formControlName="titulo" maxlength="150" placeholder="Ej: No puedo acceder al sistema" />
            @if (form.controls.titulo.hasError('required') && form.controls.titulo.touched) {
              <mat-error>Obligatorio</mat-error>
            } @else if (form.controls.titulo.hasError('minlength')) {
              <mat-error>Mínimo 5 caracteres</mat-error>
            }
            <div class="text-xs text-right mt-1"
                 [class.text-orange-500]="(form.controls.titulo.value.length || 0) > 135"
                 [class.text-red-500]="(form.controls.titulo.value.length || 0) >= 150">
              {{ (form.controls.titulo.value.length || 0) }} / 150
            </div>
          </mat-form-field>

          <mat-form-field appearance="outline">
            <mat-label>Descripción / Detalle</mat-label>
            <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="5" cdkAutosizeMaxRows="12"
                      formControlName="descripcion" maxlength="2000" placeholder="Describa el problema detalladamente..."></textarea>
            @if (form.controls.descripcion.hasError('required') && form.controls.descripcion.touched) {
              <mat-error>Obligatorio</mat-error>
            } @else if (form.controls.descripcion.hasError('minlength')) {
              <mat-error>Mínimo 10 caracteres</mat-error>
            } @else if (form.controls.descripcion.hasError('maxlength')) {
              <mat-error>Máximo 2000 caracteres</mat-error>
            }
            <div class="text-xs text-right mt-1"
                 [class.text-orange-500]="(form.controls.descripcion.value.length || 0) > 1800"
                 [class.text-red-500]="(form.controls.descripcion.value.length || 0) >= 2000">
              {{ (form.controls.descripcion.value.length || 0) }} / 2000
            </div>
          </mat-form-field>

          <div class="grid grid-cols-2 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Prioridad</mat-label>
              <mat-select formControlName="prioridad">
                @for (p of prioridades; track p) {
                  <mat-option [value]="p">{{ p }}</mat-option>
                }
              </mat-select>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Categoría</mat-label>
              <mat-select formControlName="categoriaId">
                @for (c of categorias(); track c.id) {
                  <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                }
              </mat-select>
              @if (form.controls.categoriaId.hasError('required') && form.controls.categoriaId.touched) {
                <mat-error>Obligatorio</mat-error>
              }
            </mat-form-field>
          </div>

          <mat-form-field appearance="outline">
            <mat-label>Problema</mat-label>
            <mat-select formControlName="problemaId" [disabled]="!form.controls.categoriaId.value">
              @for (p of problemas(); track p.id) {
                <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
              }
            </mat-select>
            @if (!form.controls.categoriaId.value) {
              <mat-hint>Selecciona primero una categoría</mat-hint>
            } @else if (form.controls.problemaId.hasError('required') && form.controls.problemaId.touched) {
              <mat-error>Obligatorio</mat-error>
            }
          </mat-form-field>

          <div class="grid grid-cols-2 gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Teléfono reportante</mat-label>
              <input matInput formControlName="telefonoReportante" type="tel"
                     maxlength="9" placeholder="999888777"
                     (keydown)="soloNumeros($event)" />
              @if (form.controls.telefonoReportante.hasError('pattern') && form.controls.telefonoReportante.touched) {
                <mat-error>Debe tener exactamente 9 dígitos</mat-error>
              }
              <div class="text-xs text-right mt-1"
               [class.text-orange-500]="(form.controls.telefonoReportante.value.length || 0) > 8"
               [class.text-red-500]="(form.controls.telefonoReportante.value.length || 0) >= 9">
              {{ (form.controls.telefonoReportante.value.length || 0) }} / 9
              </div>
            </mat-form-field>
            <mat-form-field appearance="outline">
              <mat-label>Correo reportante</mat-label>
              <input matInput type="email" formControlName="correoReportante" maxlength="120"
                     placeholder="correo@ejemplo.com" />
              @if (form.controls.correoReportante.hasError('required') && form.controls.correoReportante.touched) {
                <mat-error>Obligatorio</mat-error>
              } @else if (form.controls.correoReportante.hasError('email')) {
                <mat-error>Ingresa un correo electrónico válido</mat-error>
              }
            </mat-form-field>
          </div>

          <div class="flex gap-2 justify-end mt-2">
            <a mat-button routerLink="/tickets">Cancelar</a>
            <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid">
              @if (loading()) { <mat-spinner diameter="20" class="mr-2 inline-block"></mat-spinner> }
              Crear Ticket
            </button>
          </div>
        </form>
      </mat-card-content>
    </mat-card>
  `,
})
export class TicketFormComponent implements OnInit {
  private fb = inject(FormBuilder);
  private ticketApi = inject(TicketApiService);
  private problemaApi = inject(ProblemaApiService);
  private categoriaApi = inject(CategoriaApiService);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected loading = signal(false);
  protected categorias = signal<{ id: number; nombre: string }[]>([]);
  protected problemas = signal<{ id: number; nombre: string }[]>([]);
  protected prioridades = Object.values(PrioridadTicket);

  form = this.fb.nonNullable.group({
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
    prioridad: [PrioridadTicket.MEDIA, Validators.required],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    problemaId: [0, [Validators.required, Validators.min(1)]],
    telefonoReportante: ['', [Validators.pattern('[0-9]{9}')]],
    correoReportante: ['', [Validators.required, Validators.email, Validators.maxLength(120)]],
  });

  private rol = computed(() => this.auth.getRol());

  ngOnInit(): void {
    const eid = this.auth.getEmpresaId();

    // El único rol con vista global es ADMIN_OWNER.
    // ADMIN_EMPRESA, AGENTE y CLIENTE son tenant-scoped: siempre filtran
    // por la empresa del usuario autenticado. La condición anterior
    // (rol === 'ADMIN_EMPRESA') dejaba al CLIENTE y al AGENTE cayendo
    // en el branch global y veían las categorías de TODAS las empresas.
    if (this.rol() === 'ADMIN_OWNER') {
      this.categoriaApi.listarTodasGlobal().subscribe({
        next: (cs) => this.categorias.set(cs.map((c) => ({ id: c.id, nombre: c.nombre }))),
      });
    } else if (eid) {
      this.categoriaApi.listarPorEmpresa(eid).subscribe({
        next: (cs) => this.categorias.set(cs.map((c) => ({ id: c.id, nombre: c.nombre }))),
      });
    }

    this.form.controls.categoriaId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categoriaId) => {
        this.problemas.set([]);
        this.form.controls.problemaId.setValue(0, { emitEvent: false });
        if (!categoriaId || categoriaId <= 0) return;

        // Misma regla: solo ADMIN_OWNER usa el endpoint "all";
        // cualquier rol tenant (incluido CLIENTE) usa el endpoint
        // validado por empresa para que la categoría seleccionada
        // pertenezca a la empresa del cliente.
        if (this.rol() === 'ADMIN_OWNER') {
          this.problemaApi.listarPorCategoriaAll(categoriaId).subscribe({
            next: (ps) => this.problemas.set(ps.map((p) => ({ id: p.id, nombre: p.nombre }))),
          });
        } else if (eid) {
          this.problemaApi.listarPorCategoria(categoriaId, eid).subscribe({
            next: (ps) => this.problemas.set(ps.map((p) => ({ id: p.id, nombre: p.nombre }))),
          });
        }
      });
  }

  protected soloNumeros(event: KeyboardEvent): void {
    const allowed = [
      '0','1','2','3','4','5','6','7','8','9',
      'Backspace','Delete','ArrowLeft','ArrowRight','Tab',
    ];
    if (!allowed.includes(event.key)) {
      event.preventDefault();
    }
  }

  submit(): void {
    if (this.form.invalid) { this.form.markAllAsTouched(); return; }
    const eid = this.auth.getEmpresaId();
    const uid = this.auth.getUserId();
    if (!eid || !uid) return;
    this.loading.set(true);
    const v = this.form.getRawValue();
    // Se guarda solo el ticket (sin comentario inicial): la descripción ya queda
    // en el detalle del ticket, y la conversación queda reservada para el agente.
    this.ticketApi.guardar({
      titulo: v.titulo,
      descripcion: v.descripcion,
      prioridad: v.prioridad,
      telefonoReportante: v.telefonoReportante,
      correoReportante: v.correoReportante,
      categoria: { id: v.categoriaId, nombre: '' },
      problema: { id: v.problemaId, nombre: '' },
      cliente: { id: uid, nombres: '', apellidos: '' },
      empresa: { id: eid, nombre: '' },
    }).subscribe({
      next: () => {
        this.loading.set(false);
        this.snack.open('Ticket creado correctamente', 'OK', { duration: 2000, panelClass: ['snack-success'] });
        this.router.navigate(['/tickets']);
      },
      error: () => {
        this.loading.set(false);
        this.snack.open('Error al crear el ticket', 'OK', { duration: 3000, panelClass: ['snack-error'] });
      },
    });
  }
}
