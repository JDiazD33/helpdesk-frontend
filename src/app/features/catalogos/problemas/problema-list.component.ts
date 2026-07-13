import { Component, ChangeDetectionStrategy, inject, signal, computed, OnInit, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatPaginator, MatPaginatorModule, PageEvent } from '@angular/material/paginator';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatButtonModule } from '@angular/material/button';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatDialog, MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatOptionModule } from '@angular/material/core';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { ProblemaApiService } from '../../../core/services/problema-api.service';
import { CategoriaApiService } from '../../../core/services/categoria-api.service';
import { EmpresaApiService } from '../../../core/services/empresa-api.service';
import { Problema, ProblemaRequest } from '../../../core/models/problema.model';
import { Categoria } from '../../../core/models/categoria.model';
import { Empresa } from '../../../core/models/empresa.model';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-problema-list',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule, MatTableModule, MatPaginatorModule, MatCardModule, MatIconModule,
    MatButtonModule, MatProgressSpinnerModule, MatDialogModule, MatFormFieldModule,
    MatInputModule, MatSelectModule, MatOptionModule, ReactiveFormsModule, MatTooltipModule,
  ],
  template: `
    <div class="flex justify-between items-center mb-4">
      <h1 class="text-2xl font-bold">Problemas</h1>
      <button mat-flat-button color="primary" (click)="abrirForm()">
        <mat-icon>add</mat-icon> Nuevo Problema
      </button>
    </div>
    <div class="mb-4 flex flex-wrap gap-3 items-end">
      @if (rol() === 'ADMIN_OWNER') {
        <mat-form-field appearance="outline" class="min-w-[240px]">
          <mat-label>Filtrar por empresa</mat-label>
          <mat-select [value]="empresaId()" (selectionChange)="onEmpresaChange($event.value)">
            <mat-option [value]="0">Todas las empresas</mat-option>
            @for (e of empresas(); track e.id) {
              <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
            }
          </mat-select>
        </mat-form-field>
      }
      <mat-form-field appearance="outline" class="min-w-[250px]">
        <mat-label>Categoría</mat-label>
        <mat-select [value]="categoriaId()" (selectionChange)="onCategoriaChange($event.value)">
          <mat-option [value]="0">Todas las categorías</mat-option>
          @for (c of categorias(); track c.id) {
            <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
          }
        </mat-select>
      </mat-form-field>
    </div>
    <mat-card>
      <mat-card-content>
        @if (loading()) {
          <div class="flex justify-center py-8"><mat-spinner></mat-spinner></div>
        } @else {
          <table mat-table [dataSource]="ds" class="w-full">
            <ng-container matColumnDef="nombre">
              <th mat-header-cell *matHeaderCellDef>Nombre</th>
              <td mat-cell *matCellDef="let p">{{ p.nombre }}</td>
            </ng-container>
            <ng-container matColumnDef="categoria">
              <th mat-header-cell *matHeaderCellDef>Categoría</th>
              <td mat-cell *matCellDef="let p">{{ p.categoriaNombre }}</td>
            </ng-container>
            <ng-container matColumnDef="descripcion">
              <th mat-header-cell *matHeaderCellDef>Descripción</th>
              <td mat-cell *matCellDef="let p">{{ p.descripcion }}</td>
            </ng-container>
            <ng-container matColumnDef="estado">
              <th mat-header-cell *matHeaderCellDef>Estado</th>
              <td mat-cell *matCellDef="let p">
                <span class="badge" [ngClass]="p.activo ? 'badge-resuelto' : 'badge-cerrado'">
                  {{ p.activo ? 'Activo' : 'Inactivo' }}
                </span>
              </td>
            </ng-container>
            <ng-container matColumnDef="acciones">
              <th mat-header-cell *matHeaderCellDef>Acciones</th>
              <td mat-cell *matCellDef="let p">
                @if (p.activo) {
                  <button mat-icon-button (click)="eliminar(p)" matTooltip="Desactivar"><mat-icon color="warn">delete</mat-icon></button>
                } @else {
                  <button mat-icon-button (click)="activar(p)" matTooltip="Activar"><mat-icon class="text-green-600">check_circle</mat-icon></button>
                }
              </td>
            </ng-container>
            <tr mat-header-row *matHeaderRowDef="cols"></tr>
            <tr mat-row *matRowDef="let row; columns: cols;"></tr>
          </table>
          @if (ds.data.length === 0 && !loading()) {
            <div class="text-center py-4 text-gray-500">
              {{ categoriaId() ? 'No hay problemas registrados en esta categoría.' : 'No hay problemas registrados.' }}
            </div>
          }
          <div [hidden]="loading()">
            <mat-paginator
              [length]="totalItems"
              [pageSize]="pageSize"
              [pageIndex]="currentPage - 1"
              [pageSizeOptions]="[5, 10, 25]"
              (page)="onPageEvent($event)"
              showFirstLastButtons
            ></mat-paginator>
          </div>
        }
      </mat-card-content>
    </mat-card>
  `,
})
export class ProblemaListComponent implements OnInit, AfterViewInit {
  private api = inject(ProblemaApiService);
  private catApi = inject(CategoriaApiService);
  private empresaApi = inject(EmpresaApiService);
  private auth = inject(AuthService);
  private snack = inject(MatSnackBar);
  private dialog = inject(MatDialog);
  @ViewChild(MatPaginator) paginator!: MatPaginator;
  protected loading = signal(true);
  protected cols = ['nombre', 'categoria', 'descripcion', 'estado', 'acciones'];
  protected categorias = signal<Categoria[]>([]);
  protected categoriaId = signal(0);
  // Filtro por empresa (solo ADMIN_OWNER): 0 = todas.
  protected empresaId = signal(0);
  protected empresas = signal<Empresa[]>([]);
  protected currentPage = 1;
  protected pageSize = 5;
  protected totalItems = 0;
  ds = new MatTableDataSource<Problema>([]);

  protected rol = computed(() => this.auth.user()?.rol ?? null);

  ngOnInit(): void {
    // El ADMIN_OWNER necesita el listado de empresas para el filtro.
    if (this.rol() === 'ADMIN_OWNER') {
      this.empresaApi.listarTodas().subscribe({
        next: (empresas) => this.empresas.set(empresas),
        error: () => this.empresas.set([]),
      });
      // En vista global sin empresa elegida: categorías de todas las empresas.
      this.catApi.listarTodasGlobal().subscribe(cats => this.categorias.set(cats));
    } else {
      // ADMIN_EMPRESA (y demás roles tenant): solo las categorías de SU empresa.
      const eid = this.auth.getEmpresaId();
      this.cargarCategoriasPorEmpresa(eid ?? 0);
    }
    this.cargar();
  }

  ngAfterViewInit(): void {
    if (this.paginator) this.ds.paginator = this.paginator;
  }

  /** Carga categorías de una empresa concreta; si eid=0, todas (vista global del owner). */
  private cargarCategoriasPorEmpresa(eid?: number): void {
    if (eid && eid > 0) {
      this.catApi.listarTodas(eid).subscribe(cats => this.categorias.set(cats));
    } else {
      this.catApi.listarTodasGlobal().subscribe(cats => this.categorias.set(cats));
    }
  }

  onEmpresaChange(eid: number): void {
    this.empresaId.set(eid);
    this.categoriaId.set(0);
    this.currentPage = 1;
    this.cargarCategoriasPorEmpresa(eid);
    this.cargar();
  }

  onCategoriaChange(catId: number): void {
    this.categoriaId.set(catId);
    this.currentPage = 1;
    this.cargar();
  }

  onPageEvent(e: PageEvent): void {
    this.currentPage = e.pageIndex + 1;
    this.pageSize = e.pageSize;
    this.cargar();
  }

  cargar(): void {
    const rol = this.auth.user()?.rol;
    const eid = this.auth.getEmpresaId();
    if (!eid && rol !== 'ADMIN_OWNER') return;
    this.loading.set(true);
    const cat = this.categoriaId() || undefined;

    if (rol === 'ADMIN_OWNER') {
      const empresaFiltro = this.empresaId();
      // Si el owner eligió una empresa concreta, lista problemas de esa empresa;
      // si eligió "Todas", usa la vista global.
      if (empresaFiltro > 0) {
        this.api.listarPaginado(empresaFiltro, this.currentPage, this.pageSize, cat).subscribe({
          next: (res) => { this.ds.data = res.data; this.totalItems = res.total; this.currentPage = res.page; this.loading.set(false); },
          error: () => this.loading.set(false),
        });
      } else {
        this.api.listarTodosPaginado(this.currentPage, this.pageSize, cat).subscribe({
          next: (res) => { this.ds.data = res.data; this.totalItems = res.total; this.currentPage = res.page; this.loading.set(false); },
          error: () => this.loading.set(false),
        });
      }
    } else {
      this.api.listarPaginado(eid!, this.currentPage, this.pageSize, cat).subscribe({
        next: (res) => { this.ds.data = res.data; this.totalItems = res.total; this.currentPage = res.page; this.loading.set(false); },
        error: () => this.loading.set(false),
      });
    }
  }

  abrirForm(): void {
    // El owner elige empresa en el diálogo; los demás usan la de su JWT.
    const isOwner = this.rol() === 'ADMIN_OWNER';
    const eidJwt = this.auth.getEmpresaId();
    if (!eidJwt && !isOwner) return;

    if (isOwner) {
      // El owner recibe empresas + categorías (para que elija ambas en el diálogo).
      this.empresaApi.listarTodas().subscribe((empresas) => {
        // Si hay empresa preseleccionada en el filtro, cargamos sus categorías;
        // si no, todas (globales).
        const pre = this.empresaId();
        const catObs = pre > 0
          ? this.catApi.listarActivas(pre)
          : this.catApi.listarActivasGlobal();
        catObs.subscribe((categorias) => {
          const ref = this.dialog.open(ProblemaFormDialog, {
            data: { empresas, categorias, empresaPreseleccionada: pre },
            width: '450px',
          });
          ref.afterClosed().subscribe((payload?: ProblemaRequest & { empresaId?: number }) => {
            if (payload) {
              const eid = payload.empresaId ?? pre ?? 0;
              if (!eid) return;
              const { empresaId, ...problemaData } = payload;
              this.api.guardar(problemaData, eid).subscribe({
                next: () => { this.snack.open('Problema creado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
              });
            }
          });
        });
      });
    } else {
      this.catApi.listarActivas(eidJwt!).subscribe((cats) => {
        const ref = this.dialog.open(ProblemaFormDialog, { data: { categorias: cats }, width: '450px' });
        ref.afterClosed().subscribe((payload?: ProblemaRequest) => {
          if (payload) {
            this.api.guardar(payload, eidJwt!).subscribe({
              next: () => { this.snack.open('Problema creado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
            });
          }
        });
      });
    }
  }

  eliminar(p: Problema): void {
    if (!confirm(`¿Desactivar ${p.nombre}?`)) return;
    // El owner elimina usando la empresa del filtro si la eligió; si está en
    // "Todas", usa la empresa a la que pertenece la categoría del problema.
    // Los demás roles usan su empresa del JWT.
    const eid = this.rol() === 'ADMIN_OWNER'
      ? (this.empresaId() > 0 ? this.empresaId() : (p.empresaId ?? this.auth.getEmpresaId()!))
      : this.auth.getEmpresaId()!;
    if (!eid) return;
    this.api.eliminar(p.id, eid).subscribe({
      next: () => { this.snack.open('Problema desactivado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
    });
  }

  activar(p: Problema): void {
    const eid = this.rol() === 'ADMIN_OWNER'
      ? (this.empresaId() > 0 ? this.empresaId() : (p.empresaId ?? this.auth.getEmpresaId()!))
      : this.auth.getEmpresaId()!;
    if (!eid) return;
    this.api.activar(p.id, eid).subscribe({
      next: () => { this.snack.open('Problema activado', 'OK', { duration: 2000, panelClass: ['snack-success'] }); this.cargar(); },
    });
  }
}

@Component({
  selector: 'app-problema-form-dialog',
  standalone: true,
  imports: [CommonModule, MatDialogModule, MatButtonModule, MatFormFieldModule, MatInputModule, MatSelectModule, ReactiveFormsModule],
  template: `
    <h2 mat-dialog-title>Nuevo Problema</h2>
    <mat-dialog-content>
      <form [formGroup]="form" class="flex flex-col gap-2">
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
          <mat-label>Descripción</mat-label>
          <input matInput formControlName="descripcion" (keydown)="soloTexto($event)" />
          @if (form.controls.descripcion.hasError('pattern') && form.controls.descripcion.touched) {
            <mat-error>Solo letras y espacios</mat-error>
          }
        </mat-form-field>
        @if (empresas.length > 0) {
          <mat-form-field appearance="outline">
            <mat-label>Empresa</mat-label>
            <mat-select formControlName="empresaId" (selectionChange)="onEmpresaChangeDialog($event.value)">
              @for (e of empresas; track e.id) {
                <mat-option [value]="e.id">{{ e.nombre }}</mat-option>
              }
            </mat-select>
            @if (form.controls.empresaId.hasError('required') && form.controls.empresaId.touched) {
              <mat-error>Selecciona una empresa</mat-error>
            }
          </mat-form-field>
        }
        <mat-form-field appearance="outline">
          <mat-label>Categoría</mat-label>
          <mat-select formControlName="categoriaId" [disabled]="empresas.length > 0 && !form.controls.empresaId.value">
            @for (c of categorias; track c.id) {
              <mat-option [value]="c.id">{{ c.nombre }}</mat-option>
            }
          </mat-select>
          @if (empresas.length > 0 && !form.controls.empresaId.value) {
            <mat-hint>Selecciona primero una empresa</mat-hint>
          } @else if (form.controls.categoriaId.hasError('required') && form.controls.categoriaId.touched) {
            <mat-error>Selecciona una categoría</mat-error>
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
export class ProblemaFormDialog {
  private fb = inject(FormBuilder);
  private catApi = inject(CategoriaApiService);
  private data = inject(MAT_DIALOG_DATA) as
    { empresas?: Empresa[]; categorias: Categoria[]; empresaPreseleccionada?: number } | null;

  // Empresas disponibles (solo el ADMIN_OWNER recibe la lista).
  empresas: Empresa[] = this.data?.empresas ?? [];
  // Categorías a mostrar (cambian según la empresa elegida por el owner).
  categorias: Categoria[] = this.data?.categorias ?? [];

  form = this.fb.nonNullable.group({
    nombre: ['', [Validators.required, Validators.maxLength(100), Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$')]],
    descripcion: ['', [Validators.pattern('^[a-zA-ZáéíóúÁÉÍÓÚñÑ\\s]+$')]],
    // empresaId solo aplica al owner; los demás no lo envían.
    empresaId: [this.data?.empresaPreseleccionada ?? 0, [Validators.min(0)]],
    categoriaId: [0, [Validators.required, Validators.min(1)]],
  });

  soloTexto(event: KeyboardEvent): void {
    const permitido = /^[a-zA-ZáéíóúÁÉÍÓÚñÑ\s]$/.test(event.key);
    const control = ['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(event.key);
    if (!permitido && !control) event.preventDefault();
  }

  constructor() {
    // Si el owner tiene empresa preseleccionada, cargamos sus categorías;
    // si no, el listado inicial ya vino del padre.
    const pre = this.data?.empresaPreseleccionada ?? 0;
    if (this.empresas.length > 0 && pre > 0) {
      this.recargarCategorias(pre);
    }
  }

  /** Al cambiar la empresa dentro del diálogo, recarga sus categorías. */
  onEmpresaChangeDialog(eid: number): void {
    this.form.controls.categoriaId.setValue(0, { emitEvent: false });
    this.recargarCategorias(eid);
  }

  private recargarCategorias(eid: number): void {
    if (eid > 0) {
      this.catApi.listarActivas(eid).subscribe(cats => this.categorias = cats);
    } else {
      this.catApi.listarActivasGlobal().subscribe(cats => this.categorias = cats);
    }
  }
}
