// core/components/header/header.component.ts

import { Component, inject, OnInit, NgZone } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { ProfileService } from '../../../core/services/profile';
import { AuthService } from '../../../core/services/auth';
import { ChangeDetectorRef } from '@angular/core';


@Component({
  selector: 'app-header',
  standalone: true,
  imports: [RouterLink, RouterLinkActive],
  template: `
    <header class="w-full bg-[#0a0d1a] border-b border-white/10 px-6 py-3 flex items-center justify-between sticky top-0 z-50">
      
      <!-- Left: Logo + Subtitle + Nav Links -->
      <div class="flex items-center gap-8">
        <div>
          <h1 class="text-2xl font-extrabold tracking-tight bg-gradient-to-r from-indigo-400 via-purple-400 to-indigo-300 bg-clip-text text-transparent">
            GuzoGo Peers
          </h1>
          <p class="text-slate-400 text-xs mt-0.5 font-normal">
            Live Voice & Video with Peers
          </p>
        </div>

        <nav class="flex items-center gap-2">
          <a
            routerLink="/spaces"
            routerLinkActive="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold"
            [routerLinkActiveOptions]="{ exact: true }"
            class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            Spaces
          </a>
          <a
            routerLink="/dashboard"
            routerLinkActive="bg-indigo-600/30 text-indigo-300 border border-indigo-500/30 font-semibold"
            class="px-4 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-white hover:bg-slate-800/60 transition cursor-pointer"
          >
            Peer Match
          </a>
        </nav>
      </div>

      <!-- Right Actions: Create Space Button + Profile Dropdown -->
      <div class="flex items-center gap-4">
        

        <!-- Profile Menu Dropdown -->
        <div class="relative">
          <div 
            (click)="isProfileOpen = !isProfileOpen"
            class="flex items-center gap-2 cursor-pointer group">
            
            <div class="w-10 h-10 rounded-full bg-slate-800 border-2 border-white/20 overflow-hidden flex items-center justify-center group-hover:border-indigo-400 transition shadow-md">
              @if (profilePictureUrl && profilePictureUrl.length > 10) {
                <img [src]="profilePictureUrl" alt="Avatar" class="w-full h-full object-cover" />
              } @else {
                <svg class="w-5 h-5 text-slate-400" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
                </svg>
              }
            </div>
            
            <svg 
              class="w-4 h-4 text-slate-400 transition-transform duration-200" 
              [class.rotate-180]="isProfileOpen"
              fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
            </svg>
          </div>

          <!-- Dropdown Options -->
          @if (isProfileOpen) {
            <div class="absolute right-0 mt-3 w-52 bg-[#0f132a] border border-[#1b2040] rounded-2xl shadow-2xl overflow-hidden z-50 backdrop-blur-lg">
              <div class="px-4 py-3 border-b border-[#1b2040]">
                <p class="text-sm font-semibold text-white">{{ userName || 'User' }}</p>
                <p class="text-xs text-slate-400 truncate">{{ userEmail || '' }}</p>
              </div>
              
              <button 
                (click)="viewProfile(); isProfileOpen = false"
                class="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-white transition flex items-center gap-2.5 cursor-pointer">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                </svg>
                View Profile
              </button>

              <button 
                (click)="editProfile(); isProfileOpen = false"
                class="w-full text-left px-4 py-2.5 text-sm text-slate-300 hover:bg-indigo-600/20 hover:text-white transition flex items-center gap-2.5 cursor-pointer">
                <svg class="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                </svg>
                Edit Profile
              </button>

              <button 
                (click)="logout(); isProfileOpen = false"
                class="w-full text-left px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-600/20 hover:text-rose-300 transition flex items-center gap-2.5 cursor-pointer border-t border-[#1b2040]">
                <svg class="w-4 h-4 text-rose-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                Logout
              </button>
            </div>
          }
        </div>

      </div>
    </header>
  `,
})
export class HeaderComponent implements OnInit {
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private ngZone = inject(NgZone);
  private cdr = inject(ChangeDetectorRef);

  profilePictureUrl: string = '';
  userName: string = '';
  userEmail: string = '';
  isProfileOpen = false;

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile() {
    const userId = Number(localStorage.getItem('userId') || '0');
    const email = localStorage.getItem('email') || '';
    this.userEmail = email;

    if (userId) {
      this.profileService.getProfileByUserId(userId).subscribe({
        next: (profile) => {
          this.ngZone.run(() => {
            this.profilePictureUrl = profile.profilePictureUrl || '';
            this.userName = `${profile.firstName} ${profile.lastName}`;
            this.cdr.detectChanges();   // ← forces immediate update
          });
        },
      });
    }
  }

  viewProfile() {
    const userId = localStorage.getItem('userId');
    if (userId) {
      this.router.navigate(['/profile', userId]);
    }
  }

  editProfile() {
    this.router.navigate(['/profile/edit']);
  }

  openCreateSpaceModal() {
    // If you want to emit an event or use a service to open the modal, do it here.
    // For now, navigate to spaces where the create button exists.
    this.router.navigate(['/spaces']);
  }

  logout() {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}