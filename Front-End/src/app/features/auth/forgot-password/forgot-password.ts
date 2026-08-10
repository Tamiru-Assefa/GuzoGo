import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-forgot-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#070a11] flex items-center justify-center p-6">
      <div class="bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-5">
        <div class="text-center">
          <div class="text-5xl mb-2">🔑</div>
          <h2 class="text-2xl font-bold text-white">Forgot Password</h2>
          <p class="text-slate-400 text-sm">Enter your email and we'll send you a reset link</p>
        </div>

        <!-- Success message -->
        @if (sent) {
          <div class="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-center">
            ✅ If an account with that email exists, a reset link has been sent.
          </div>
        } @else {
          <div class="space-y-4">
            <!-- Email input with validation -->
            <input
              [(ngModel)]="email"
              type="email"
              placeholder="Email"
              (input)="validateEmail()"
              class="w-full bg-slate-950/80 border rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:ring-1 transition"
              [class.border-white/10]="!emailError"
              [class.border-red-400/50]="emailError"
              [class.focus:border-red-400]="emailError"
              [class.focus:ring-red-400]="emailError"
              [class.focus:border-cyan-400]="!emailError"
              [class.focus:ring-cyan-400]="!emailError"
            />
            <!-- Validation error message -->
            @if (emailError) {
              <p class="text-red-400 text-xs mt-1 ml-1">{{ emailError }}</p>
            }

            <button (click)="submit()" [disabled]="loading || !!emailError"
                    class="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              @if(loading) {
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Sending...
              } @else {
                <span>Send Reset Link</span>
              }
            </button>
          </div>
        }
        <a routerLink="/login" class="block text-center text-cyan-400 text-sm hover:underline">← Back to Login</a>
      </div>
    </div>
  `
})
export class ForgotPasswordComponent {
  private http = inject(HttpClient);
  private cdr = inject(ChangeDetectorRef);

  email = '';
  loading = false;
  sent = false;
  emailError = '';

  // Simple email regex – must contain something@something.something
  validateEmail() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!this.email.trim()) {
      this.emailError = '';
      return;
    }
    if (!emailRegex.test(this.email)) {
      this.emailError = 'Please enter a valid email address.';
    } else {
      this.emailError = '';
    }
  }

  submit() {
    if (!this.email.trim() || this.emailError) return;
    this.loading = true;
    this.http.post(`${environment.apiUrl}/Auth/forgot-password`, { email: this.email })
      .subscribe({
        next: () => {
          this.sent = true;
          this.loading = false;
          this.cdr.detectChanges();
        },
        error: () => {
          this.sent = true;  // still show success for security
          this.loading = false;
          this.cdr.detectChanges();
        }
      });
  }
}