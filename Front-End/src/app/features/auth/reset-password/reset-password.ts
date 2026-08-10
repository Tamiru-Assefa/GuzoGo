import { Component, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-reset-password',
  standalone: true,
  imports: [FormsModule, RouterLink],
  template: `
    <div class="min-h-screen bg-[#070a11] flex items-center justify-center p-6">
      <div class="bg-slate-900/70 backdrop-blur-2xl border border-white/10 rounded-3xl p-8 max-w-md w-full space-y-5">
        <div class="text-center">
          <div class="text-5xl mb-2">🔐</div>
          <h2 class="text-2xl font-bold text-white">Reset Password</h2>
          <p class="text-slate-400 text-sm">Enter your new password</p>
        </div>

        @if (done) {
          <div class="bg-emerald-500/10 border border-emerald-500/30 p-4 rounded-xl text-emerald-400 text-center space-y-3">
            ✅ Password reset successfully!<br/>
            <a routerLink="/login" class="inline-block bg-indigo-600 text-white px-6 py-2.5 rounded-xl font-semibold hover:bg-indigo-500 transition mt-2">Go to Login</a>
          </div>
        } @else {
          <div class="space-y-4">
            <input [(ngModel)]="password" type="password" placeholder="New password"
                   class="w-full bg-slate-950/80 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-slate-500 focus:outline-none focus:border-cyan-400" />
            <p class="text-xs text-slate-500 ml-1">At least 6 characters with letters and numbers.</p>
            <button (click)="submit()" [disabled]="loading"
                    class="w-full bg-gradient-to-r from-cyan-500 to-indigo-600 text-white py-3 rounded-xl font-semibold hover:opacity-90 disabled:opacity-50 flex items-center justify-center gap-2">
              @if(loading) {
                <svg class="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"></path>
                </svg>
                Resetting...
              } @else {
                <span>Reset Password</span>
              }
            </button>
          </div>
        }
      </div>
    </div>
  `
})
export class ResetPasswordComponent {
  private http = inject(HttpClient);
  private route = inject(ActivatedRoute);

  token = '';
  password = '';
  loading = false;
  done = false;

  ngOnInit() {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
  }

  submit() {
    if (!this.password || this.password.length < 6) return;
    this.loading = true;
    this.http.post(`${environment.apiUrl}/Auth/reset-password`, {
      token: this.token,
      newPassword: this.password
    }).subscribe({
      next: () => { this.done = true; this.loading = false; },
      error: () => { this.loading = false; alert('Invalid or expired token.'); }
    });
  }
}