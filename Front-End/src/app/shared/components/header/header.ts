import { Component, inject, OnInit } from '@angular/core';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="w-full bg-[#0d1322] border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      <!-- Center Navigation Links -->
      <nav class="flex items-center gap-8 mx-auto">
        
        <a
          routerLink="/room"
          routerLinkActive="text-cyan-400 border-b-2 border-cyan-400 font-semibold"
          class="text-slate-400 hover:text-white transition py-1 text-sm tracking-wide"
        >
          Room
        </a>
        <a
          routerLink="/dashboard"
          routerLinkActive="text-cyan-400 border-b-2 border-cyan-400 font-semibold"
          class="text-slate-400 hover:text-white transition py-1 text-sm tracking-wide"
        >
          Dashboard
        </a>
      </nav>

      <!-- Right User Profile Avatar -->
      <div class="flex items-center gap-2 cursor-pointer">
        <div class="w-9 h-9 rounded-full bg-slate-800 border border-white/20 overflow-hidden flex items-center justify-center">
          @if (avatarUrl) {
            <img [src]="avatarUrl" alt="User Avatar" class="w-full h-full object-cover" />
          } @else {
            <svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
            </svg>
          }
        </div>
        <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
        </svg>
      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  avatarUrl: string | null = null;

  ngOnInit() {
    // Optionally pull avatar URL from localStorage or user state
    this.avatarUrl = localStorage.getItem('profilePictureUrl');
  }
}