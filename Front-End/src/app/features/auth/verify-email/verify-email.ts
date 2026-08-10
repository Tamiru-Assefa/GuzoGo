import { Component, inject, ChangeDetectorRef } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';
import { CommonModule } from '@angular/common';


@Component({
  selector: 'app-verify-email',
  standalone: true,
  imports: [CommonModule, RouterLink, FormsModule],
  template: `
    <div class="min-h-screen bg-[#070a11] flex items-center justify-center p-6">
      <div class="bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full text-center space-y-6">
        <div class="text-5xl">📧</div>
        <h2 class="text-2xl font-bold text-white">Email Verification</h2>

        @if (verifying) {
          <div class="flex justify-center">
            <svg class="animate-spin h-10 w-10 text-cyan-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
            </svg>
          </div>
          <p class="text-slate-400">Verifying your email...</p>
        } @else if (verified) {
          <div class="space-y-4">
            <p class="text-emerald-400 text-lg font-medium">✅ Email verified successfully!</p>
            <p class="text-slate-400">Your account is now active. Let's set up your professional profile.</p>
            <a routerLink="/create-profile"
               class="inline-block bg-gradient-to-r from-cyan-500 to-indigo-600 text-white px-6 py-3 rounded-xl font-semibold hover:shadow-lg hover:shadow-cyan-500/20 transition">
              Create Your Profile
            </a>
          </div>
        } @else {
          <div class="space-y-4">
            <p class="text-red-400">❌ {{ errorMessage || 'Invalid or expired verification link.' }}</p>
            <!-- Resend verification form -->
              <div class="border-t border-white/10 pt-4 mt-4">
                <p class="text-slate-400 text-sm mb-2">Request a new verification email</p>
                <input [(ngModel)]="emailForResend" type="email" placeholder="Your email"
                      class="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-white text-sm mb-2 focus:outline-none focus:border-cyan-400" />
                <button (click)="resendVerification()" [disabled]="resendLoading"
                        class="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 py-2 rounded-xl text-sm font-medium transition disabled:opacity-50">
                  {{ resendLoading ? 'Sending...' : 'Resend Verification Email' }}
                </button>
                @if(resendSuccess) {
                  <p class="text-emerald-400 text-xs mt-2 text-center">✅ If an account exists, a new email was sent.</p>
                }
              </div>
            <p class="text-slate-400 text-sm">If you have a verification token, enter it below:</p>
            <input [(ngModel)]="manualToken" type="text" placeholder="Verification token"
                   class="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-white text-center focus:outline-none focus:border-cyan-400" />
            <button (click)="verifyManualToken()" [disabled]="loadingManual"
                    class="w-full bg-indigo-600 hover:bg-indigo-500 text-white py-3 rounded-xl font-semibold disabled:opacity-50 transition">
              {{ loadingManual ? 'Verifying...' : 'Verify Token' }}
            </button>
            <a routerLink="/login" class="text-cyan-400 text-sm hover:underline">Back to Login</a>
          </div>
        }
      </div>
    </div>
  `
})
export class VerifyEmailComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);
  private cdr = inject(ChangeDetectorRef);

  verifying = true;
  verified = false;
  errorMessage = '';
  manualToken = '';
  loadingManual = false;
  emailForResend = '';
  resendLoading = false;
  resendSuccess = false;

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (token) {
      this.verifyToken(token);
    } else {
      this.verifying = false;
      this.errorMessage = 'No verification token found in URL.';
    }
  }

  private verifyToken(token: string) {
    this.verifying = true;
    this.http.post(`${environment.apiUrl}/Auth/verify-email`, { token }).subscribe({
      next: () => {
        this.verifying = false;
        this.verified = true;
        this.cdr.detectChanges();
      },
      error: (err) => {
        // Handle different error cases
        this.verifying = false;
        this.verified = false;
        if (err.status === 400) {
          this.errorMessage = 'The verification link is invalid or has expired.';
        } else {
          this.errorMessage = 'An error occurred. Please try again later.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  verifyManualToken() {
    if (!this.manualToken.trim()) return;
    this.loadingManual = true;
    this.verifyToken(this.manualToken.trim());
  }

  resendVerification() {
  if (!this.emailForResend.trim()) return;
  this.resendLoading = true;
  this.resendSuccess = false;
  this.http.post(`${environment.apiUrl}/Auth/resend-verification`, { email: this.emailForResend })
    .subscribe({
      next: () => {
        this.resendLoading = false;
        this.resendSuccess = true;
        this.cdr.detectChanges();
      },
      error: () => {
        this.resendLoading = false;
        // user might be already verified or doesn't exist
        this.resendSuccess = true; // don't reveal info
        this.cdr.detectChanges();
      }
    });
}
}