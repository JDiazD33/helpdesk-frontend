import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ViewChild, AfterViewInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { FormsModule } from '@angular/forms';
import { Observable, Subject, debounceTime, distinctUntilChanged, Subscription } from 'rxjs';
import { UsuarioApiService } from '../../../core/services/usuario-api.service';
import { RolApiService } from '../../../core/services/rol-api.service';
import { EmpresaApiService } from '../../../core/services/empresa-api.service';
import { AuthService } from '../../../core/auth/auth.service';
import { Usuario, UsuarioRequest } from '../../../core/models/usuario.model';
import { Rol } from '../../../core/models/rol.model';
import { Empresa } from '../../../core/models/empresa.model';

@Component({
  selector: 'app-usuario-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, MatTableModule, MatPaginatorModule,
    MatCardModule, MatFormFieldModule, MatInputModule, MatSelectModule, MatOptionModule,
    MatIconModule, MatButtonModule, MatCheckboxModule, MatProgressSpinnerModule, MatDialogModule,
    MatTooltipModule,
  ],
  template: `
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Usuarios</h1>
      <button mat-flat-button color="primary" (click)="abrirForm()">
        <mat-icon>add</mat-icon> Nuevo Usuario
      </button>
    </div>
    <mat-card>
      <mat-card-content>
        <div class="flex flex-wrap gap-4 mb-4 items-center">
          <mat-form-field appearance="outline" class="flex-1 min-w-[200px]">
            <mat-label>Buscar por nombre, apellido o email</mat-label>
            <input matInput [ngModel]="searchTerm()" (ngModelChange)="onSearchChange($event)" placeholder="Escriba para buscar..." />
            <mat-icon matSuffix>search</mat-icon>
          </mat-form-field>
          <div class="flex gap-3 items-center flex-wrap">
            <span class="text-sm font-medium text-gray-600">Roles:</span>
            @for (r of rolesDisponibles(); track r.id) {
              <mat-checkbox [checked]="rolesSeleccionados().has(r.id)" (change)="toggleRol(r.id)">
                {{ r.nombre }}
              </mat-checkbox>
            }
          </div>
        </div>
        @if (loading()) {
          <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
        } @else if (ds.data.length === 0) {
          <div class="text-center py-8 text-gray-500">No se encontraron usuarios</div>
        } @else {
          <table mat-table [dataSource]="ds" class="w-full">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let u">{{ u.nombres }} {{ u.apellidos }}</td>
            </ng-container>
            <ng-container matColumnDef="email">
              <th mat-header-cell *matHeaderCellDef>Email</th>
              <td mat-cell *matCellDef="let u">{{ u.email }}</td>
            </ng-container>
            <ng-container matColumnDef="rol">
              <th mat-header-cell *matHeaderCellDef>Rol</th>
              <td mat-cell *matCellDef="let u">{{ u.rol?.nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="activo">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let u">
                <span class="badge" [ngClass]="u.activo ? 'badge-resuelto' : 'badge-cerrado'">
                  {{ u.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let u">
                @if (u.id === currentUserId()) {
                  <span class="text-xs text-gray-400 italic">Tú</span>
                } @else if (u.activo) {
                  <button mat-icon-button matTooltip="Desactivar" (click)="eliminar(u)"><mat-icon color="warn">delete</mat-icon></button>
                } @else {
                  <button mat-icon-button matTooltip="Activar" (click)="activar(u)"><mat-icon style="color:#16a34a">check_circle</mat-icon></button>
                }
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
export class UsuarioListComponent implements OnInit, AfterViewInit, OnDestroy {
  private api = inject(UsuarioApiService);
  private rolApi = inject(RolApiService);
  private empresaApi = inject(EmpresaApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  protected loading = signal(true);
  protected rol = computed(() => this.auth.getRol());
  protected currentUserId = computed(() => this.auth.getUserId());
  protected cols = ['nombre', 'email', 'rol', 'activo', 'acciones'];
  protected searchTerm = signal('');
  protected rolesDisponibles = signal<Rol[]>([]);
  protected rolesSeleccionados = signal<Set<number>>(new Set());
  protected ds = new MatTableDataSource<Usuario>([]);

  private searchSubj = new Subject<string>();
  private subs: Subscription[] = [];

  ngOnInit(): void {
    this.cargarRoles();
    this.subs.push(
      this.searchSubj.pipe(debounceTime(300), distinctUntilChanged()).subscribe(() => this.aplicarFiltros())
    );
    this.cargar();
  }

  ngAfterViewInit(): void { this.ds.paginator = this.paginator; }

  ngOnDestroy(): void { this.subs.forEach(s => s.unsubscribe()); }

  private cargarRoles(): void {
    this.rolApi.listarTodos().subscribe(roles => {
      const filtered = this.rol() === 'ADMIN_EMPRESA'
        ? roles.filter(r => r.nombre !== 'ADMIN_OWNER')
        : roles;
      this.rolesDisponibles.set(filtered);
    });
  }

  onSearchChange(val: string): void {
    this.searchTerm.set(val);
    this.searchSubj.next(val);
  }

  toggleRol(rolId: number): void {
    const s = new Set(this.rolesSeleccionados());
    if (s.has(rolId)) s.delete(rolId); else s.add(rolId);
    this.rolesSeleccionados.set(s);
    this.aplicarFiltros();
  }

  private aplicarFiltros(): void {
    const search = this.searchTerm();
    const roles = [...this.rolesSeleccionados()];
    const empresaId = this.auth.getEmpresaId() ?? undefined;
    const rol = this.auth.user()?.rol;
    const eid = rol === 'ADMIN_OWNER' ? undefined : empresaId;

    this.loading.set(true);
    this.api.listarConFiltros(search || undefined, roles.length ? roles : undefined, eid).subscribe({
      next: (us) => { this.ds.data = us; this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  cargar(): void {
    this.aplicarFiltros();
  }

  abrirForm(): void {
    this.rolApi.listarTodos().subscribe((roles) => {
      // El admin_empresa solo puede crear AGENTE o CLIENTE.
      // El admin_owner puede crear todos los roles.
      const rolActual = this.rol();
      const rolesPermitidos = rolActual === 'ADMIN_OWNER'
        ? roles
        : roles.filter(r => r.nombre === 'AGENTE' || r.nombre === 'CLIENTE');

      // El admin_owner elige la empresa en el diálogo (combo);
      // el admin_empresa siempre crea en su empresa (fija por JWT, sin combo).
      if (rolActual === 'ADMIN_OWNER') {
        this.empresaApi.listarTodas().subscribe((empresas) => {
          const ref = this.dialog.open(UsuarioFormDialog, {
            data: { roles: rolesPermitidos, empresas },
            width: '450px',
          });
          this.alCrearUsuario(ref);
        });
      } else {
        const ref = this.dialog.open(UsuarioFormDialog, { data: { roles: rolesPermitidos }, width: '450px' });
        this.alCrearUsuario(ref);
      }
    });
  }

  private alCrearUsuario(ref: any): void {
    ref.afterClosed().subscribe((payload?: UsuarioRequest & { empresaId?: number }) => {
      if (payload) {
        // El owner indica la empresa del combo; el resto usa la de su JWT.
        const eid = this.rol() === 'ADMIN_OWNER'
          ? (payload.empresaId ?? 0)
          : this.auth.getEmpresaId()!;
        if (!eid) return;
        const { empresaId, ...datos } = payload;
        this.api.guardar(datos, eid).subscribe({
          next: () => { this.snack.open('Usuario creado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
        });
      }
    });
  }

  eliminar(u: Usuario): void {
    if (!confirm(`¿Desactivar a ${u.nombres} ${u.apellidos}?`)) return;
    this.api.eliminar(u.id).subscribe({
      next: () => { this.snack.open('Usuario desactivado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
    });
  }

  activar(u: Usuario): void {
    if (!confirm(`¿Activar a ${u.nombres} ${u.apellidos}?`)) return;
    this.api.activar(u.id).subscribe({
      next: () => { this.snack.open('Usuario activado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
    });
  }
}

@Component({
  selector: 'app-usuario-form-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Nuevo Usuario</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-2">
        <div class="grid grid-cols-2 gap-2">
          <mat-form-field appearance="outline">
            <mat-label>Nombres</mat-label>
            <input matInput formControlName="nombres" (keydown)="soloTexto($event)" />
            @if (form.controls.nombres.hasError('required') && form.controls.nombres.touched) {
              <mat-error>Obligatorio</mat-error>
            } @else if (form.controls.nombres.hasError('pattern')) {
              <mat-error>Solo letras y espacios</mat-error>
            }
          </mat-form-field>
          <mat-form-field appearance="outline">
            <mat-label>Apellidos</mat-label>
            <input matInput formControlName="apellidos" (keydown)="soloTexto($event)" />
            @if (form.controls.apellidos.hasError('required') && form.controls.apellidos.touched) {
              <mat-error>Obligatorio</mat-error>
            } @else if (form.controls.apellidos.hasError('pattern')) {
              <mat-error>Solo letras y espacios</mat-error>
            }
          </mat-form-field>
        </div>
        <mat-form-field appearance="outline">
          <mat-label>Email</mat-label>
          <input matInput type="email" formControlName="email" />
          @if (form.controls.email.hasError('required') && form.controls.email.touched) {
            <mat-error>El email es obligatorio</mat-error>
          } @else if (form.controls.email.hasError('email')) {
            <mat-error>Email inválido</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Contraseña</mat-label>
          <input matInput type="password" formControlName="password" />
          @if (form.controls.password.hasError('required') && form.controls.password.touched) {
            <mat-error>Obligatoria</mat-error>
          } @else if (form.controls.password.hasError('minlength')) {
            <mat-error>Mínimo 6 caracteres</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Teléfono</mat-label>
          <input matInput formControlName="telefono" maxlength="9" (keydown)="soloNumeros($event)" placeholder="999888777" />
          @if (form.controls.telefono.hasError('pattern') && form.controls.telefono.touched) {
            <mat-error>Debe tener 9 dígitos</mat-error>
          }
        </mat-form-field>
        <mat-form-field appearance="outline">
          <mat-label>Rol</mat-label>
          <mat-select formControlName="rolId">
            @for (r of data.roles; track r.id) {
              <mat-option [value]="r.id">{{ r.nombre }}</mat-option>
            }
          </mat-select>
          @if (form.controls.rolId.hasError('required') && form.controls.rolId.touched) {
            <mat-error>Selecciona un rol</mat-error>
          }
        </mat-form-field>
        @if (data.empresas && data.empresas.length > 0) {
          <mat-form-field appearance="outline">
            <mat-label>Empresa</mat-label>
            <mat-select formControlName="empresaId">
              @for (e of data.empresas; track e.id) {
                <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
              }
            </mat-select>
            @if (form.controls.empresaId.hasError('required') && form.controls.empresaId.touched) {
              <mat-error>Selecciona una empresa</mat-error>
            }
          </mat-form-field>
        }
      </form>
    </mat-dialog-content>
    <mat-dialog-actions align="end">
      <button mat-button mat-dialog-close>Cancelar</button>
      <button mat-flat-button color="primary" [disabled]="form.invalid" [mat-dialog-close]="form.getRawValue()">Crear</button>
    </mat-dialog-actions>
  `,
})
export class UsuarioFormDialog {
  private fb = inject(FormBuilder);
  protected data = inject<{ roles: Rol[]; empresas?: Empresa[] }>(MAT_DIALOG_DATA);
  protected ref = inject(MatDialogRef<UsuarioFormDialog>);
  form = this.fb.nonNullable.group({
    nombres: ['', [Validators.required, Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$')]],
    apellidos: ['', [Validators.required, Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$')]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    telefono: ['', [Validators.pattern('^[0-9]{9}$')]],
    rolId: [0, [Validators.required, Validators.min(1)]],
    empresaId: [0],
  });

  constructor() {
    if (this.data.empresas && this.data.empresas.length > 0) {
      this.form.controls.empresaId.setValidators([Validators.required, Validators.min(1)]);
      this.form.controls.empresaId.updateValueAndValidity();
    }
  }

  /** Permite solo números y teclas de edición en el campo teléfono. */
  soloNumeros(event: KeyboardEvent): void {
    const allowed = ['0','1','2','3','4','5','6','7','8','9','Backspace','Delete','ArrowLeft','ArrowRight','Tab'];
    if (!allowed.includes(event.key)) event.preventDefault();
  }

  /** Bloquea números/símbolos en nombres y apellidos (solo letras y espacios). */
  soloTexto(event: KeyboardEvent): void {
    const permitido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(event.key);
    const control = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(event.key);
    if (!permitido && !control) event.preventDefault();
  }
}
