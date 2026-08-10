import { Component, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { RegisterRequest } from '../../../core/models/auth/register-request';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
  styleUrl: './register.scss',
})
export class RegisterComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);

  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  registerForm = this.fb.group({
    userName: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
    ],
    email: [
      '',
      [Validators.required, Validators.email],
    ],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100),
        Validators.pattern(/^(?=.*[a-zA-Z])(?=.*[0-9])/),  // at least 1 letter + 1 number
      ],
    ],
  });

  // Helper getters for template
  get userName() { return this.registerForm.get('userName'); }
  get email() { return this.registerForm.get('email'); }
  get password() { return this.registerForm.get('password'); }

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    this.isLoading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.authService
      .register(this.registerForm.value as RegisterRequest)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.successMessage.set(response.message);
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (error) => {
          this.isLoading.set(false);
          const msg =
            error.error?.message ??
            error.error?.title ??
            'Email or username already exists.';
          this.errorMessage.set(msg);
          console.error('Registration error:', error);
        },
      });
  }
}