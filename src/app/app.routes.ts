import { Routes } from '@angular/router';
import { authGuard } from './core/auth/auth.guard';
import { roleGuard } from './core/auth/role.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () => import('./features/auth/login/login.component').then((m) => m.LoginComponent),
  },
  {
    path: 'register',
    loadComponent: () => import('./features/auth/register/register.component').then((m) => m.RegisterComponent),
  },
  {
    path: 'reportar-problema',
    loadComponent: () => import('./features/auth/reporte-publico/reporte-publico.component').then((m) => m.ReportePublicoComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shared/components/shell/shell.component').then((m) => m.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./features/dashboard/dashboard.component').then((m) => m.DashboardComponent),
      },
      {
        path: 'tickets',
        loadComponent: () =>
          import('./features/tickets/ticket-list/ticket-list.component').then((m) => m.TicketListComponent),
      },
      {
        path: 'tickets/nuevo',
        canActivate: [roleGuard(['CLIENTE', 'AGENTE', 'ADMIN_OWNER', 'ADMIN_EMPRESA'])],
        loadComponent: () =>
          import('./features/tickets/ticket-form/ticket-form.component').then((m) => m.TicketFormComponent),
      },
      {
        path: 'tickets/:id',
        loadComponent: () =>
          import('./features/tickets/ticket-detail/ticket-detail.component').then((m) => m.TicketDetailComponent),
      },
      {
        path: 'usuarios',
        canActivate: [roleGuard(['ADMIN_OWNER', 'ADMIN_EMPRESA'])],
        loadComponent: () =>
          import('./features/usuarios/usuario-list/usuario-list.component').then((m) => m.UsuarioListComponent),
      },
      {
        path: 'empresas',
        canActivate: [roleGuard(['ADMIN_OWNER'])],
        loadComponent: () =>
          import('./features/empresas/empresa-list/empresa-list.component').then((m) => m.EmpresaListComponent),
      },
      {
        path: 'categorias',
        canActivate: [roleGuard(['ADMIN_OWNER', 'ADMIN_EMPRESA'])],
        loadComponent: () =>
          import('./features/catalogos/categorias/categoria-list.component').then((m) => m.CategoriaListComponent),
      },
      {
        path: 'problemas',
        canActivate: [roleGuard(['ADMIN_OWNER', 'ADMIN_EMPRESA'])],
        loadComponent: () =>
          import('./features/catalogos/problemas/problema-list.component').then((m) => m.ProblemaListComponent),
      },
      {
        path: 'roles',
        canActivate: [roleGuard(['ADMIN_OWNER'])],
        loadComponent: () =>
          import('./features/roles-permisos/rol-list/rol-list.component').then((m) => m.RolListComponent),
      },
      {
        path: 'permisos',
        canActivate: [roleGuard(['ADMIN_OWNER'])],
        loadComponent: () =>
          import('./features/roles-permisos/permiso-list/permiso-list.component').then((m) => m.PermisoListComponent),
      },
      {
        path: 'reportes',
        canActivate: [roleGuard(['ADMIN_OWNER', 'ADMIN_EMPRESA'])],
        loadComponent: () => import('./features/reportes/reportes.component').then((m) => m.ReportesComponent),
      },
    ],
  },
  {
    path: 'forbidden',
    loadComponent: () => import('./shared/components/forbidden/forbidden.component').then((m) => m.ForbiddenComponent),
  },
  { path: '**', redirectTo: '' },
];
