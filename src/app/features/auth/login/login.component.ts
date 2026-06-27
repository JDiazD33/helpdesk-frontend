import { Component, ChangeDetectionStrategy, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '../../../core/auth/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    CommonModule,
    ReactiveFormsModule,
    RouterLink,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule,
  ],
  template: `
    <div class="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary-600 to-primary-900 px-4">
      <mat-card class="w-full max-w-md p-2">
        <mat-card-header class="flex flex-col items-center pb-4">
          <mat-icon class="text-6xl text-primary-600 !w-16 !h-16">support_agent</mat-icon>
          <mat-card-title class="!text-3xl !font-bold !mt-2">HelpDesk</mat-card-title>
          <mat-card-subtitle>Mesa de Ayuda - Inicia sesión</mat-card-subtitle>
        </mat-card-header>
        <mat-card-content>
          <form [formGroup]="form" (ngSubmit)="submit()" class="flex flex-col gap-3">
            <mat-form-field appearance="outline">
              <mat-label>Email</mat-label>
              <input matInput type="email" formControlName="email" autocomplete="username" />
              <mat-icon matPrefix>email</mat-icon>
              @if (form.controls.email.hasError('required') && form.controls.email.touched) {
                <mat-error>El email es obligatorio</mat-error>
              }
              @if (form.controls.email.hasError('email')) {
                <mat-error>Email inválido</mat-error>
              }
            </mat-form-field>

            <mat-form-field appearance="outline">
              <mat-label>Contraseña</mat-label>
              <input matInput [type]="show() ? 'text' : 'password'" formControlName="password" autocomplete="current-password" />
              <mat-icon matPrefix>lock</mat-icon>
              <button mat-icon-button matSuffix type="button" (click)="show.set(!show())">
                <mat-icon>{{ show() ? 'visibility_off' : 'visibility' }}</mat-icon>
              </button>
              @if (form.controls.password.hasError('required') && form.controls.password.touched) {
                <mat-error>La contraseña es obligatoria</mat-error>
              }
            </mat-form-field>

            <button mat-flat-button color="primary" type="submit" [disabled]="loading() || form.invalid" class="!py-2">
              @if (loading()) {
                <mat-spinner diameter="20" class="mr-2 inline-block"></mat-spinner>
              }
              Ingresar
            </button>

            <div class="text-center text-sm text-gray-600 mt-2">
              ¿No tienes cuenta? <a routerLink="/register" class="text-primary-600 hover:underline">Regístrate</a>
            </div>
            <div class="text-center text-sm text-gray-600 mt-1">
              ¿Necesitas ayuda? <a routerLink="/reportar-problema" class="text-primary-600 hover:underline font-medium">Reportar un problema</a>
            </div>
          </form>
        </mat-card-content>
      </mat-card>
    </div>
  `,
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private auth = inject(AuthService);
  private router = inject(Router);
  private snack = inject(MatSnackBar);

  protected show = signal(false);
  protected loading = signal(false);

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  submit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    const { email, password } = this.form.getRawValue();
    this.auth.login(email, password).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading.set(false);
        const msg = err?.error?.message || 'No se pudo iniciar sesión';
        this.snack.open(msg, 'Cerrar', { duration: 4000, panelClass: ['snack-error'] });
      },
    });
  }
}
