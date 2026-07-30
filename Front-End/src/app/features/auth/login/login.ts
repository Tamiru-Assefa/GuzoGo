// import { Component, inject } from '@angular/core';
// import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
// import { Router, RouterLink } from '@angular/router';
// import { AuthService } from '../../../core/services/auth';
// import { LoginRequest } from '../../../core/models/auth/login-request';

// @Component({
//   selector: 'app-login',
//   imports: [ReactiveFormsModule, RouterLink],
//   templateUrl: './login.html',
//   styleUrl: './login.scss',
// })
// export class LoginComponent {
//   private fb = inject(FormBuilder);
//   private authService = inject(AuthService);
//   private router = inject(Router);

//   isLoading = false;
//   errorMessage = '';

//   loginForm = this.fb.group({
//     email: ['', [Validators.required, Validators.email]],
//     password: ['', [Validators.required]],
//   });

//   onSubmit() {
//     if (this.loginForm.invalid) {
//       this.loginForm.markAllAsTouched();
//       return;
//     }

//     this.isLoading = true;
//     this.errorMessage = '';

//     this.authService
//       .login(this.loginForm.value as LoginRequest)
//       .subscribe({
//         next: (response) => {
//           this.isLoading = false;
//           // Store token/user data as needed, e.g. localStorage.setItem('token', response.token);
//           this.router.navigate(['/create-profile']); 
//         },
//         error: (error) => {
//           this.isLoading = false;
//           this.errorMessage =
//             error.error?.message ?? 'Invalid email or password.';
//         },
//       });
//   }
// }
import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../../core/services/auth';
import { LoginRequest } from '../../../core/models/auth/login-request';

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './login.html',
  styleUrl: './login.scss',
})
export class LoginComponent {
  private fb = inject(FormBuilder);
  private authService = inject(AuthService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef); // 1. Inject ChangeDetectorRef

  isLoading = false;
  errorMessage = '';

  loginForm = this.fb.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required]],
  });

  onSubmit() {
  if (this.loginForm.invalid) {
    this.loginForm.markAllAsTouched();
    return;
  }

  this.isLoading = true;
  this.errorMessage = '';

  this.authService
    .login(this.loginForm.value as LoginRequest)
    .subscribe({
      next: (response) => {
        this.isLoading = false;
        // Save token or userId in authService / localStorage here
        
        // Always attempt to go to dashboard; guard handles profile check
        this.router.navigate(['/dashboard']); 
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message ?? 'Invalid email or password.';
        this.cdr.detectChanges();
      },
    });
}
}