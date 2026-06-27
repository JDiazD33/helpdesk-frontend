import { Component, ChangeDetectionStrategy, inject, signal, computed, DestroyRef } from '@angular/core';
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
import { PublicApiService } from '../../../core/services/public-api.service';
import { PrioridadTicket } from '../../../core/models/enums';

@Component({
  selector: 'app-reporte-publico',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, RouterLink, ReactiveFormsModule, MatCardModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatOptionModule, MatButtonModule, MatIconModule,
    MatProgressSpinnerModule, TextFieldModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 px-4 py-8">
      <mat-card class="w-full max-w-lg">
        <mat-card-header class="flex flex-col items-center pb-4">
          <mat-icon class="text-5xl text-primary-600 !w-14 !h-14">report_problem</mat-icon>
          <mat-card-title class="!text-2xl !font-bold !mt-2">Reportar un problema</mat-card-title>
          <mat-card-subtitle>No necesitas iniciar sesión para reportar</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          @if (!ticketCreado()) {
            <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3">

              <!-- 1. Correo: identifica la empresa automáticamente -->
              <mat-form-field appearance="outline">
                <mat-label>Correo electrónico</mat-label>
                <input matInput type="email" formControlName="correo" (blur)="onCorreoBlur()"
                       placeholder="tu@correo.com" autocomplete="email" />
                <mat-icon matSuffix>email</mat-icon>
                @if (form.controls.correo.hasError('required') && form.controls.correo.touched) {
                  <mat-error>El correo es obligatorio</mat-error>
                } @else if (form.controls.correo.hasError('email')) {
                  <mat-error>Correo inválido</mat-error>
                }
              </mat-form-field>

              <!-- Indica a qué empresa se asociará el reporte -->
              @if (verificandoCorreo()) {
                <div class="flex items-center gap-2 text-sm text-gray-500">
                  <mat-spinner diameter="16"></mat-spinner> Identificando tu empresa...
                </div>
              } @else if (empresa()) {
                <div class="flex items-center gap-2 text-sm p-2 rounded bg-primary-50 text-primary-800">
                  <mat-icon style="font-size:18px">business</mat-icon>
                  Empresa: <strong>{{ empresa()?.nombreEmpresa }}</strong>
                </div>
              }

              <!-- Título / Asunto -->
              <mat-form-field appearance="outline">
                <mat-label>Título / Asunto</mat-label>
                <input matInput formControlName="titulo" maxlength="150"
                       placeholder="Ej: No puedo acceder al sistema" />
                @if (form.controls.titulo.hasError('required') && form.controls.titulo.touched) {
                  <mat-error>El título es obligatorio</mat-error>
                } @else if (form.controls.titulo.hasError('minlength')) {
                  <mat-error>Mínimo 5 caracteres</mat-error>
                }
                <div class="text-xs text-right"
                     [class.text-orange-500]="(form.controls.titulo.value.length || 0) > 135"
                     [class.text-red-500]="(form.controls.titulo.value.length || 0) >= 150">
                  {{ (form.controls.titulo.value.length || 0) }} / 150
                </div>
              </mat-form-field>

              <!-- Prioridad + Categoría -->
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
                  <mat-select formControlName="categoriaId" [disabled]="!empresa()">
                    @for (c of categorias(); track c.id) {
                      <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
                    }
                  </mat-select>
                  @if (form.controls.categoriaId.hasError('required') && form.controls.categoriaId.touched) {
                    <mat-error>Obligatorio</mat-error>
                  }
                </mat-form-field>
              </div>

              <!-- Problema (opcional, según la categoría) -->
              <mat-form-field appearance="outline">
                <mat-label>Problema (opcional)</mat-label>
                <mat-select formControlName="problemaId" [disabled]="!form.controls.categoriaId.value">
                  @for (p of problemas(); track p.id) {
                    <mat-option [value]="p.id">{{ p.nombre }}</mat-option>
                  }
                </mat-select>
                @if (!form.controls.categoriaId.value) {
                  <mat-hint>Selecciona primero una categoría</mat-hint>
                }
              </mat-form-field>

              <!-- 4. Teléfono: solo números, 9 dígitos -->
              <mat-form-field appearance="outline">
                <mat-label>Teléfono</mat-label>
                <input matInput formControlName="telefono" type="tel" maxlength="9"
                       placeholder="999888777" (keydown)="soloNumeros($event)" />
                <mat-icon matSuffix>phone</mat-icon>
                @if (form.controls.telefono.hasError('required') && form.controls.telefono.touched) {
                  <mat-error>Obligatorio</mat-error>
                } @else if (form.controls.telefono.hasError('pattern') && form.controls.telefono.touched) {
                  <mat-error>Debe tener exactamente 9 dígitos</mat-error>
                }
                <div class="text-xs text-right"
                     [class.text-orange-500]="(form.controls.telefono.value.length || 0) > 8"
                     [class.text-red-500]="(form.controls.telefono.value.length || 0) >= 9">
                  {{ (form.controls.telefono.value.length || 0) }} / 9
                </div>
              </mat-form-field>

              <!-- 5. Descripción del problema -->
              <mat-form-field appearance="outline">
                <mat-label>Describe tu problema</mat-label>
                <textarea matInput cdkTextareaAutosize cdkAutosizeMinRows="4" cdkAutosizeMaxRows="10"
                          formControlName="descripcion" maxlength="2000"
                          placeholder="Cuéntanos qué problema tienes..."></textarea>
                @if (form.controls.descripcion.hasError('required') && form.controls.descripcion.touched) {
                  <mat-error>La descripción es obligatoria</mat-error>
                } @else if (form.controls.descripcion.hasError('minlength')) {
                  <mat-error>Mínimo 10 caracteres</mat-error>
                }
                <div class="text-xs text-right"
                     [class.text-orange-500]="(form.controls.descripcion.value.length || 0) > 1800"
                     [class.text-red-500]="(form.controls.descripcion.value.length || 0) >= 2000">
                  {{ (form.controls.descripcion.value.length || 0) }} / 2000
                </div>
              </mat-form-field>

              <button mat-flat-button color="primary" type="submit"
                      [disabled]="loading() || form.invalid || !empresa()">
                @if (loading()) { <mat-spinner diameter="20" class="mr-2 inline-block"></mat-spinner> }
                Enviar
              </button>

              <div class="text-center text-sm text-gray-600 mt-2">
                ¿Ya tienes cuenta? <a routerLink="/login" class="text-primary-600 hover:underline">Inicia sesión</a>
              </div>
            </form>
          } @else {
            <!-- Pantalla de éxito -->
            <div class="flex flex-col items-center text-center py-4 gap-3">
              <mat-icon class="text-6xl text-green-500 !w-16 !h-16">check_circle</mat-icon>
              <h2 class="text-xl font-bold text-gray-800">Ticket creado con éxito</h2>
              <p class="text-gray-600">Tu reporte fue registrado con el código:</p>
              <div class="text-2xl font-mono font-bold text-primary-700 bg-primary-50 px-4 py-2 rounded">
                {{ codigoCreado() }}
              </div>
              <p class="text-sm text-gray-500">
                Guarda este código para hacer seguimiento. Nuestro equipo lo atenderá pronto.
              </p>
              <div class="flex gap-2 mt-2">
                <button mat-stroked-button (click)="crearOtro()">
                  <mat-icon>add</mat-icon> Reportar otro
                </button>
                <button mat-flat-button color="primary" routerLink="/login">
                  Ir al inicio de sesión
                </button>
              </div>
            </div>
          }
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class ReportePublicoComponent {
  private fb = inject(FormBuilder);
  private publicApi = inject(PublicApiService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);
  private destroyRef = inject(DestroyRef);

  protected loading = signal(false);
  protected verificandoCorreo = signal(false);
  protected empresa = signal<{ empresaId: number; nombreEmpresa: string } | null>(null);
  protected categorias = signal<{ id: number; nombre: string }[]>([]);
  protected problemas = signal<{ id: number; nombre: string }[]>([]);
  protected ticketCreado = signal(false);
  protected codigoCreado = signal('');

  form = this.fb.nonNullable.group({
    correo: ['', [Validators.required, Validators.email]],
    titulo: ['', [Validators.required, Validators.minLength(5), Validators.maxLength(150)]],
    prioridad: [PrioridadTicket.MEDIA, Validators.required],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
    problemaId: [0],
    telefono: ['', [Validators.required, Validators.pattern('[0-9]{9}')]],
    descripcion: ['', [Validators.required, Validators.minLength(10), Validators.maxLength(2000)]],
  });

  protected prioridades = Object.values(PrioridadTicket);

  constructor() {
    // Al cambiar de categoría, cargar sus problemas.
    this.form.controls.categoriaId.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((categoriaId) => {
        this.problemas.set([]);
        this.form.controls.problemaId.setValue(0, { emitEvent: false });
        const emp = this.empresa();
        if (!categoriaId || categoriaId <= 0 || !emp) return;
        this.publicApi.listarProblemas(categoriaId, emp.empresaId).subscribe({
          next: (ps) => this.problemas.set(ps.map((p) => ({ id: p.id, nombre: p.nombre }))),
          error: () => this.problemas.set([]),
        });
      });
  }

  /** Al salir del campo correo (y si es válido), identifica la empresa. */
  onCorreoBlur(): void {
    const correo = this.form.controls.correo.value.trim();
    if (!correo || this.form.controls.correo.invalid) return;
    // Si ya identificamos esta empresa, no repetir.
    if (this.empresa() && this.form.controls.correo.pristine === false && this.verificandoCorreo()) return;

    this.verificandoCorreo.set(true);
    this.empresa.set(null);
    this.categorias.set([]);
    this.form.controls.categoriaId.setValue(0, { emitEvent: false });

    this.publicApi.identificarEmpresa(correo).subscribe({
      next: (res) => {
        this.verificandoCorreo.set(false);
        this.empresa.set(res);
        this.cargarCategorias(res.empresaId);
      },
      error: (err) => {
        this.verificandoCorreo.set(false);
        const msg = err?.error?.message
          || 'No encontramos una cuenta asociada a este correo. Regístrate o contacta a soporte.';
        this.snack.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      },
    });
  }

  private cargarCategorias(empresaId: number): void {
    this.publicApi.listarCategorias(empresaId).subscribe({
      next: (cs) => this.categorias.set(cs.map((c) => ({ id: c.id, nombre: c.nombre }))),
      error: () => this.categorias.set([]),
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
    if (this.form.invalid || !this.empresa()) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const v = this.form.getRawValue();
    this.publicApi.crearTicketAnonimo({
      correo: v.correo.trim(),
      telefono: v.telefono,
      titulo: v.titulo.trim(),
      prioridad: v.prioridad,
      categoriaId: v.categoriaId,
      problemaId: v.problemaId && v.problemaId > 0 ? v.problemaId : null,
      descripcion: v.descripcion,
    }).subscribe({
      next: (res) => {
        this.loading.set(false);
        this.codigoCreado.set(res.codigo);
        this.ticketCreado.set(true);
        this.snack.open('Ticket creado con éxito', 'OK', { duration: 3000, panelClass: ['snack-success'] });
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'No se pudo crear el ticket. Intenta nuevamente.';
        this.snack.open(msg, 'Cerrar', { duration: 5000, panelClass: ['snack-error'] });
      },
    });
  }

  crearOtro(): void {
    this.ticketCreado.set(false);
    this.codigoCreado.set('');
    this.form.reset({
      correo: '',
      titulo: '',
      prioridad: PrioridadTicket.MEDIA,
      categoriaId: 0,
      problemaId: 0,
      telefono: '',
      descripcion: '',
    });
    // Conservamos la empresa identificada para no obligar a reingresar el correo.
    if (this.empresa()) {
      this.cargarCategorias(this.empresa()!.empresaId);
    }
  }
}
