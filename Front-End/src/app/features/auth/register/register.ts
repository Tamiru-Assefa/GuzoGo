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

  // Convert state variables to Signals for instant UI rendering
  isLoading = signal(false);
  successMessage = signal('');
  errorMessage = signal('');

  registerForm = this.fb.group({
    userName: [
      '',
      [Validators.required, Validators.minLength(3), Validators.maxLength(50)],
    ],
    email: ['', [Validators.required, Validators.email]],
    password: [
      '',
      [
        Validators.required,
        Validators.minLength(6),
        Validators.maxLength(100),
      ],
    ],
  });

  onSubmit() {
    if (this.registerForm.invalid) {
      this.registerForm.markAllAsTouched();
      return;
    }

    // Update Signals using .set()
    this.isLoading.set(true);
    this.successMessage.set('');
    this.errorMessage.set('');

    this.authService
      .register(this.registerForm.value as RegisterRequest)
      .subscribe({
        next: (response) => {
          this.isLoading.set(false);
          this.successMessage.set(response.message);

          setTimeout(() => {
            this.router.navigate(['/login']);
          }, 1500);
        },
        error: (error) => {
          this.isLoading.set(false);

          // Fallback checks for both custom JSON { message: ... } and default ASP.NET ProblemDetails
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