import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { HeaderComponent } from '../../../shared/components/header/header';
import { ProfileService, UserProfile } from '../../../core/services/profile';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

export interface MatchPreferenceDto {
  desiredProfession: string;
  desiredSkills: string[];
  goal: string;
  additionalDescription?: string;
  matchType: string;
  isSearching: boolean;
}

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [HeaderComponent, FormsModule],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class DashboardComponent implements OnInit {
  private http = inject(HttpClient);
  private authService = inject(AuthService);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);

  // Search state
  isSearchingMatch = false;
  searchTimer: any;
  searchTimeRemaining = 60;
  errorMessage = '';                     // ★ NEW – replaces alerts

  private readonly apiUrl = environment.apiUrl;

  // Free-text inputs
  desiredProfession: string = '';
  desiredSkills: string[] = [];
  skillInput: string = '';
  selectedGoal: string = 'Networking';
  additionalDescription: string = '';

  goals = [
    { value: 'Networking', label: 'Networking' },
    { value: 'Hiring', label: 'Hiring' },
    { value: 'Jobseeker', label: 'Job Seeking' },
    { value: 'Learning', label: 'Learning' },
    { value: 'Mentoring', label: 'Mentoring' },
    { value: 'Collaboration', label: 'Collaboration' }
  ];

  get goalQuestion(): string {
    switch (this.selectedGoal) {
      case 'Networking': return 'Who would you like to connect with?';
      case 'Hiring': return 'What role are you looking to hire?';
      case 'Jobseeker': return 'What kind of opportunity are you seeking?';
      case 'Learning': return 'What would you like to learn?';
      case 'Mentoring': return 'What are you looking to mentor or be mentored in?';
      case 'Collaboration': return 'What kind of collaboration are you looking for?';
      default: return 'Describe your ideal match';
    }
  }

  get skillLabel(): string {
    switch (this.selectedGoal) {
      case 'Hiring': return 'Skills required for the role';
      case 'Jobseeker': return 'Your top skills (what you offer)';
      case 'Networking': return 'Skills you\'d like them to have';
      case 'Learning': return 'Skills you want to learn';
      case 'Mentoring': return 'Skills you can mentor or want to learn';
      case 'Collaboration': return 'Skills needed for the project';
      default: return 'Relevant skills';
    }
  }

  recentMatches: UserProfile[] = [];

  ngOnInit() {
    this.loadRecentMatches();
  }

  // --- Skill tag management ---
  addSkill(): void {
    const skill = this.skillInput.trim();
    if (skill && !this.desiredSkills.includes(skill)) {
      this.desiredSkills.push(skill);
    }
    this.skillInput = '';
  }

  removeSkill(skill: string): void {
    this.desiredSkills = this.desiredSkills.filter(s => s !== skill);
  }

  // ★ Helper: show an error that auto‑clears after 5 seconds
  private showError(msg: string) {
    this.errorMessage = msg;
    this.cdr.detectChanges();
    setTimeout(() => {
      this.errorMessage = '';
      this.cdr.detectChanges();
    }, 5000);
  }

  // --- Match flow ---
  findMatch(): void {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) {
      this.router.navigate(['/login']);
      return;
    }

    // ★ Validate profession
    if (!this.desiredProfession.trim()) {
      this.showError('Please describe who you want to meet.');
      return;
    }

    // ★ Validate skills – require at least one skill
    if (this.desiredSkills.length === 0) {
      this.showError('Please add at least one skill.');
      return;
    }

    if (this.isSearchingMatch) return;
    this.isSearchingMatch = true;
    this.searchTimeRemaining = 60;
    this.errorMessage = '';   // clear any previous error

    const payload: MatchPreferenceDto = {
      desiredProfession: this.desiredProfession.trim(),
      desiredSkills: this.desiredSkills,
      goal: this.selectedGoal,
      additionalDescription: this.additionalDescription.trim() || undefined,
      matchType: 'random',
      isSearching: true,
    };

    this.http.post(`${this.apiUrl}/MatchPreference/${currentUserId}`, payload)
      .subscribe({
        next: () => this.pollForMatch(currentUserId),
        error: (err) => {
          this.isSearchingMatch = false;
          console.error('Failed to save match preferences:', err);
          this.showError('Failed to initiate matching process. Please try again.');
        }
      });
  }

  private pollForMatch(currentUserId: number) {
    const pollInterval = 5000;
    const maxAttempts = 12;
    let attemptCount = 0;

    const countdownInterval = setInterval(() => {
      this.searchTimeRemaining--;
      if (this.searchTimeRemaining <= 0) {
        clearInterval(countdownInterval);
      }
      this.cdr.detectChanges();
    }, 1000);

    this.searchTimer = setInterval(() => {
      attemptCount++;

      this.http.post(`${this.apiUrl}/Matching/find/${currentUserId}`, {}).subscribe({
        next: (matchResponse: any) => {
          console.log('📡 Poll response:', matchResponse);

          if (matchResponse?.matched === true && matchResponse?.roomId) {
            console.log('✅ Match found! Navigating to room:', matchResponse.roomId);
            this.stopSearch(countdownInterval);
            this.isSearchingMatch = false;

            if (matchResponse.user?.userId) {
              this.saveMatchedUserId(matchResponse.user.userId);
            }

            this.router.navigate(['/room'], {
              queryParams: {
                roomId: matchResponse.roomId,
                sessionId: matchResponse.sessionId
              }
            });
            return;
          }

          if (attemptCount >= maxAttempts) {
            this.stopSearch(countdownInterval);
            this.isSearchingMatch = false;
            this.showError('No match found right now. Try again later.');
          }
        },
        error: (err) => {
          console.error('========== MATCHING API ERROR ==========');
          console.error(err);
          this.stopSearch(countdownInterval);
          this.isSearchingMatch = false;
          this.showError(`Matching failed. (${err.status})`);
        }
      });
    }, pollInterval);
  }

  cancelSearch(): void {
    this.stopSearch();
    this.isSearchingMatch = false;
    const currentUserId = this.authService.getUserId();
    if (currentUserId) {
      this.http.post(`${this.apiUrl}/MatchPreference/${currentUserId}`, {
        ...this.getCurrentPreference(),
        isSearching: false,
      }).subscribe();
    }
  }

  private stopSearch(countdownInterval?: any): void {
    if (this.searchTimer) clearInterval(this.searchTimer);
    if (countdownInterval) clearInterval(countdownInterval);
  }

  private getCurrentPreference(): MatchPreferenceDto {
    return {
      desiredProfession: this.desiredProfession.trim(),
      desiredSkills: this.desiredSkills,
      goal: this.selectedGoal,
      additionalDescription: this.additionalDescription.trim() || undefined,
      matchType: 'random',
      isSearching: false,
    };
  }

  saveMatchedUserId(matchedUserId: number): void {
    if (!matchedUserId) return;
    const existing: number[] = JSON.parse(localStorage.getItem('recentMatchedUserIds') || '[]');
    const updated = [matchedUserId, ...existing.filter(id => id !== matchedUserId)].slice(0, 6);
    localStorage.setItem('recentMatchedUserIds', JSON.stringify(updated));
    this.loadRecentMatches();
  }

  viewProfile(userId: number): void {
    this.router.navigate(['/profile', userId]);
  }

  private loadRecentMatches(): void {
    const stored = localStorage.getItem('recentMatchedUserIds');
    if (!stored) return;
    try {
      const ids: number[] = JSON.parse(stored).slice(0, 6);
      this.recentMatches = [];
      ids.forEach(uId => {
        this.profileService.getProfileByUserId(uId).subscribe({
          next: (profile: UserProfile) => {
            this.recentMatches.push(profile);
            this.cdr.detectChanges();
          }
        });
      });
    } catch (e) {
      console.error('Error loading matches:', e);
    }
  }
}