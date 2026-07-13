import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSnackBar } from '@angular/material/snack-bar';
import { ReactiveFormsModule, FormBuilder, Validators, FormsModule } from '@angular/forms';
import { EmpresaApiService } from '../../../core/services/empresa-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Empresa, EmpresaRequest } from '../../../core/models/empresa.model';

@Component({
  selector: 'app-empresa-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, MatTableModule, MatPaginatorModule, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressSpinnerModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, ReactiveFormsModule,
  ],
  template: `
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Empresas</h1>
      @if (rol() === 'ADMIN_OWNER') {
        <button mat-flat-button color="primary" (click)="abrirForm()">
          <mat-icon>add</mat-icon> Nueva Empresa
        </button>
      }
    </div>
    <mat-card>
      <mat-card-content>
        <div class="flex items-center gap-3 mb-4">
          <mat-form-field appearance="outline" class="flex-1 min-w-[250px]" subscriptSizing="dynamic">
            <mat-label>Buscar por RUC</mat-label>
            <input
              #rucInput
              matInput
              placeholder="Buscar por RUC (11 dígitos)"
              [ngModel]="rucValue()"
              (ngModelChange)="onRucChange($event)"
              (keydown)="onKeyDown($event)"
              (paste)="onPaste($event)"
              maxlength="11"
              autocomplete="off"
            />
            @if (rucValue().length > 0) {
              <button matSuffix mat-icon-button (click)="limpiar()" type="button">
                <mat-icon>close</mat-icon>
              </button>
            }
          </mat-form-field>
          <div class="text-sm font-mono min-w-[80px]" [class.text-green-600]="rucValue().length === 11" [class.text-gray-400]="rucValue().length !== 11">
            {{ rucValue().length }} / 11 dígitos
          </div>
        </div>
        @if (errorMsg()) {
          <div class="text-sm text-red-600 mb-3">{{ errorMsg() }}</div>
        }
        @if (loading()) {
          <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
        } @else if (ds.data.length === 0 && rucValue().length === 11) {
          <div class="text-center py-8 text-gray-500">No se encontró ninguna empresa con el RUC ingresado.</div>
        } @else {
          <table mat-table [dataSource]="ds" class="w-full">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let e">{{ e.nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="ruc">
              <th mat-header-cell *matHeaderCellDef>RUC</th>
              <td mat-cell *matCellDef="let e">{{ e.ruc }}</td>
            </ng-container>
            <ng-container matColumnDef="correo">
              <th mat-header-cell *matHeaderCellDef>Correo</th>
              <td mat-cell *matCellDef="let e">{{ e.correoContacto }}</td>
            </ng-container>
            <ng-container matColumnDef="telefono">
              <th mat-header-cell *matHeaderCellDef>Teléfono</th>
              <td mat-cell *matCellDef="let e">{{ e.telefonoContacto }}</td>
            </ng-container>
            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let e">
                <span class="badge" [ngClass]="e.activo ? 'badge-resuelto' : 'badge-cerrado'">
                  {{ e.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let e">
                <button mat-icon-button (click)="eliminar(e)"><mat-icon color="warn">delete</mat-icon></button>
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
          <mat-paginator [pageSizeOptions]="[5, 10, 25]" pageSize="10"></mat-paginator>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class EmpresaListComponent implements OnInit, AfterViewInit {
  private api = inject(EmpresaApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  protected loading = signal(true);
  protected rol = computed(() => this.auth.getRol());
  protected cols = ['nombre', 'ruc', 'correo', 'telefono', 'activo', 'acciones'];
  protected rucValue = signal('');
  protected errorMsg = signal('');
  ds = new MatTableDataSource<Empresa>([]);

  ngOnInit(): void { this.cargar(); }
  ngAfterViewInit(): void { this.ds.paginator = this.paginator; }

  onKeyDown(e: KeyboardEvent): void {
    const allowed = ['Backspace', 'Delete', 'Tab', 'ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown', 'Home', 'End'];
    if (allowed.includes(e.key)) return;
    if (!/^\d$/.test(e.key)) e.preventDefault();
  }

  onPaste(e: ClipboardEvent): void {
    const data = e.clipboardData?.getData('text') ?? '';
    const cleaned = data.replace(/\D/g, '');
    if (cleaned.length !== 11 || data.length !== cleaned.length) {
      e.preventDefault();
      this.errorMsg.set('El RUC debe contener solo 11 dígitos numéricos.');
      return;
    }
  }

  onRucChange(val: string): void {
    this.errorMsg.set('');
    const digits = val.replace(/\D/g, '');
    if (digits !== val) {
      this.rucValue.set(digits);
      return;
    }
    this.rucValue.set(val);
    if (val.length === 11) this.buscarPorRuc(val);
    if (val.length === 0) this.cargar();
  }

  private buscarPorRuc(ruc: string): void {
    this.loading.set(true);
    this.api.listarTodas(ruc).subscribe({
      next: (es) => { this.ds.data = es; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  limpiar(): void {
    this.rucValue.set('');
    this.errorMsg.set('');
    this.cargar();
  }

  cargar(): void {
    this.loading.set(true);
    this.api.listarTodas().subscribe({
      next: (es) => { this.ds.data = es; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  abrirForm(): void {
    const ref = this.dialog.open(EmpresaFormDialog, { width: '450px' });
    ref.afterClosed().subscribe((payload?: EmpresaRequest) => {
      if (payload) {
        this.api.guardar(payload).subscribe({
          next: () => { this.snack.open('Empresa creada', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
        });
      }
    });
  }

  eliminar(e: Empresa): void {
    if (!confirm(`¿Desactivar empresa ${e.nombre}?`)) return;
    this.api.eliminar(e.id).subscribe({
      next: () => { this.snack.open('Empresa desactivada', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
    });
  }
}

@Component({
  selector: 'app-empresa-form-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Nueva Empresa</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-2">
        <mat-form-field appearance="outline">
          <mat-label>RUC</mat-label>
          <input matInput formControlName="ruc" maxlength="11" (keydown)="soloNumeros($event)" placeholder="12345678901" />
          @if (form.controls.ruc.hasError('required') && form.controls.ruc.touched) {
            <mat-error>Obligatorio</mat-error>
          } @else if (form.controls.ruc.hasError('pattern')) {
            <mat-error>Debe tener 11 dígitos</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Nombre</mat-label>
          <input matInput formControlName="nombre" (keydown)="soloTexto($event)" />
          @if (form.controls.nombre.hasError('required') && form.controls.nombre.touched) {
            <mat-error>Obligatorio</mat-error>
          } @else if (form.controls.nombre.hasError('pattern')) {
            <mat-error>Solo letras y espacios</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefonoContacto" maxlength="9" (keydown)="soloNumeros($event)" placeholder="999888777" />
          @if (form.controls.telefonoContacto.hasError('required') && form.controls.telefonoContacto.touched) {
            <mat-error>Obligatorio</mat-error>
          } @else if (form.controls.telefonoContacto.hasError('pattern')) {
            <mat-error>Debe tener 9 dígitos</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Correo</mat-label>
          <input matInput type="email" formControlName="correoContacto" />
          @if (form.controls.correoContacto.hasError('required') && form.controls.correoContacto.touched) {
            <mat-error>Obligatorio</mat-error>
          } @else if (form.controls.correoContacto.hasError('email')) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" [mat-dialog-close]="form.getRawValue()">Crear</button>
    </mat-dialog-actions>
  `,
})
export class EmpresaFormDialog {
  private fb = inject(FormBuilder);
  protected ref = inject(MatDialogRef<EmpresaFormDialog>);
  form = this.fb.nonNullable.group({
    ruc: ['', [Validators.required, Validators.pattern('^[0-9]{11}$')]],
    nombre: ['', [Validators.required, Validators.maxLength(150), Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\\s.,&-]+$')]],
    telefonoContacto: ['', [Validators.required, Validators.pattern('^[0-9]{9}$')]],
    correoContacto: ['', [Validators.required, Validators.email]],
  });

  soloNumeros(event: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(event.key)) event.preventDefault();
  }

  /** El nombre de empresa permite letras, números y signos comunes (, . & -). */
  soloTexto(event: KeyboardEvent): void {
    const permitido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ0-9\s.,&-]$/.test(event.key);
    const control = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(event.key);
    if (!permitido && !control) event.preventDefault();
  }
}
