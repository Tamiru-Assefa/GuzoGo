import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { switchMap, catchError } from 'rxjs/operators';
import { of } from 'rxjs';

import { HeaderComponent } from '../../../shared/components/header/header';
import { ProfileService } from '../../../core/services/profile';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

export interface UserProfileResponse {
  id: number;
  userId: number;
  firstName: string;
  lastName: string;
  professionTitle: string;
  professionCategory: string;
  country: string;
  city: string;
  bio: string;
  profilePictureUrl?: string;
}

export interface MatchPreferenceDto {
  preferredProfessionId: number;
  preferredSkillIds: number[];
  goal: string;
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

  // Search State & Retries
  isSearchingMatch = false;
  searchTimer: any;
  searchTimeRemaining = 60; // 60 seconds timeout

  private readonly apiUrl = environment.apiUrl;

  // Exact 45 Profession Titles from DB
  allProfessionTitles = [
    { id: 1, name: 'Backend Developer' },
    { id: 2, name: 'Frontend Developer' },
    { id: 3, name: 'Full Stack Developer' },
    { id: 4, name: 'Software Engineer' },
    { id: 5, name: '.NET Developer' },
    { id: 6, name: 'Java Developer' },
    { id: 7, name: 'Python Developer' },
    { id: 8, name: 'QA Engineer' },
    { id: 9, name: 'Android Developer' },
    { id: 10, name: 'iOS Developer' },
    { id: 11, name: 'Flutter Developer' },
    { id: 12, name: 'React Native Developer' },
    { id: 13, name: 'Cloud Engineer' },
    { id: 14, name: 'Cloud Architect' },
    { id: 15, name: 'Solutions Architect' },
    { id: 16, name: 'AWS Engineer' },
    { id: 17, name: 'Azure Engineer' },
    { id: 18, name: 'AI Engineer' },
    { id: 19, name: 'Machine Learning Engineer' },
    { id: 20, name: 'Data Scientist' },
    { id: 21, name: 'Prompt Engineer' },
    { id: 22, name: 'Security Engineer' },
    { id: 23, name: 'Cybersecurity Analyst' },
    { id: 24, name: 'Penetration Tester' },
    { id: 25, name: 'Ethical Hacker' },
    { id: 26, name: 'Data Analyst' },
    { id: 27, name: 'Data Engineer' },
    { id: 28, name: 'Business Intelligence Analyst' },
    { id: 29, name: 'DevOps Engineer' },
    { id: 30, name: 'Site Reliability Engineer' },
    { id: 31, name: 'Kubernetes Engineer' },
    { id: 32, name: 'UI Designer' },
    { id: 33, name: 'UX Designer' },
    { id: 34, name: 'Product Designer' },
    { id: 35, name: 'Digital Marketer' },
    { id: 36, name: 'SEO Specialist' },
    { id: 37, name: 'Content Creator' },
    { id: 38, name: 'Social Media Manager' },
    { id: 39, name: 'Sales Representative' },
    { id: 40, name: 'Sales Manager' },
    { id: 41, name: 'Business Development Manager' },
    { id: 42, name: 'Entrepreneur' },
    { id: 43, name: 'Startup Founder' },
    { id: 44, name: 'Project Manager' },
    { id: 45, name: 'Product Manager' },
  ];

  // Exact 54 Skills from DB
  allSkills = [
    { id: 1, name: 'C#' },
    { id: 2, name: 'Java' },
    { id: 3, name: 'Python' },
    { id: 4, name: 'JavaScript' },
    { id: 5, name: 'TypeScript' },
    { id: 6, name: 'PHP' },
    { id: 7, name: 'C++' },
    { id: 8, name: 'Go' },
    { id: 9, name: 'Rust' },
    { id: 10, name: 'Angular' },
    { id: 11, name: 'React' },
    { id: 12, name: 'Vue.js' },
    { id: 13, name: 'HTML' },
    { id: 14, name: 'CSS' },
    { id: 15, name: 'Bootstrap' },
    { id: 16, name: 'Tailwind CSS' },
    { id: 17, name: 'ASP.NET Core' },
    { id: 18, name: 'Node.js' },
    { id: 19, name: 'Express.js' },
    { id: 20, name: 'Laravel' },
    { id: 21, name: 'Spring Boot' },
    { id: 22, name: 'SQL Server' },
    { id: 23, name: 'MySQL' },
    { id: 24, name: 'PostgreSQL' },
    { id: 25, name: 'MongoDB' },
    { id: 26, name: 'Redis' },
    { id: 27, name: 'AWS' },
    { id: 28, name: 'Azure' },
    { id: 29, name: 'Google Cloud' },
    { id: 30, name: 'Docker' },
    { id: 31, name: 'Kubernetes' },
    { id: 32, name: 'Terraform' },
    { id: 33, name: 'Git' },
    { id: 34, name: 'GitHub Actions' },
    { id: 35, name: 'Jenkins' },
    { id: 36, name: 'CI/CD' },
    { id: 37, name: '.NET MAUI' },
    { id: 38, name: 'Flutter' },
    { id: 39, name: 'Android' },
    { id: 40, name: 'iOS' },
    { id: 41, name: 'Machine Learning' },
    { id: 42, name: 'TensorFlow' },
    { id: 43, name: 'PyTorch' },
    { id: 44, name: 'OpenAI API' },
    { id: 45, name: 'Figma' },
    { id: 46, name: 'Adobe Photoshop' },
    { id: 47, name: 'Adobe Illustrator' },
    { id: 48, name: 'Digital Marketing' },
    { id: 49, name: 'SEO' },
    { id: 50, name: 'Content Writing' },
    { id: 51, name: 'Project Management' },
    { id: 52, name: 'Business Analysis' },
    { id: 53, name: 'Sales' },
    { id: 54, name: 'Customer Support' },
  ];

  // Form State
  selectedProfessionId: number | null = null;
  selectedSkills: { id: number; name: string }[] = [];
  selectedGoal: string = 'Networking';

  isSubmittingMatch = false;
  recentMatches: UserProfileResponse[] = [];

  ngOnInit() {
    this.loadRecentMatches();
  }

  loadRecentMatches() {
    const storedIdsRaw = localStorage.getItem('recentMatchedUserIds');
    if (!storedIdsRaw) return;

    try {
      const matchIds: number[] = JSON.parse(storedIdsRaw).slice(0, 6);
      if (matchIds.length === 0) return;

      this.recentMatches = [];
      matchIds.forEach((uId) => {
        this.profileService.getProfileByUserId(uId).subscribe({
          next: (profile: UserProfileResponse) => {
            this.recentMatches.push(profile);
            this.cdr.detectChanges();
          },
        });
      });
    } catch (e) {
      console.error('Error reading match history:', e);
    }
  }

  onSelectSkill(event: Event) {
    const selectEl = event.target as HTMLSelectElement;
    const selectedId = Number(selectEl.value);

    if (!selectedId) return;

    const found = this.allSkills.find((s) => s.id === selectedId);

    if (found && !this.selectedSkills.some((s) => s.id === found.id)) {
      this.selectedSkills.push(found);
    }

    selectEl.value = '';
  }

  removeSkill(id: number) {
    this.selectedSkills = this.selectedSkills.filter((s) => s.id !== id);
  }

  findMatch() {
  const currentUserId = this.authService.getUserId();

  if (!currentUserId) {
    this.router.navigate(['/login']);
    return;
  }

  if (!this.selectedProfessionId) {
    alert('Please select a profession title.');
    return;
  }

  // Prevent multiple overlapping searches
  if (this.isSearchingMatch) return;

  this.isSearchingMatch = true;
  this.searchTimeRemaining = 60;

  // 1. Post/Update Match Preferences
  const skillIds: number[] = this.selectedSkills.map((s) => Number(s.id));
  const matchPayload: MatchPreferenceDto = {
    preferredProfessionId: Number(this.selectedProfessionId),
    preferredSkillIds: skillIds,
    goal: this.selectedGoal,
    matchType: 'random',
    isSearching: true,
  };

  this.http
    .post(`${this.apiUrl}/MatchPreference/${currentUserId}`, matchPayload)
    .subscribe({
      next: () => {
        // Start polling loop every 5 seconds for up to 1 minute
        this.pollForMatch(currentUserId);
      },
      error: (err) => {
        this.isSearchingMatch = false;
        console.error('Failed to save match preferences:', err);
        alert('Failed to initiate matching process.');
      },
    });
}

private pollForMatch(currentUserId: number) {
  const pollInterval = 5000; // Check every 5 seconds
  const maxAttempts = 12;    // 12 attempts * 5s = 60s total
  let attemptCount = 0;

  // Countdown timer for UI display
  const countdownInterval = setInterval(() => {
    this.searchTimeRemaining--;
    this.cdr.detectChanges();
  }, 1000);

  this.searchTimer = setInterval(() => {
    attemptCount++;

    this.http.post(`${this.apiUrl}/Matching/find/${currentUserId}`, {}).subscribe({
      // Inside dashboard.component.ts -> pollForMatch()
      next: (matchResponse: any) => {
  const roomId = matchResponse?.roomId || matchResponse?.matchedUserId || matchResponse?.id;
  // 1. Extract sessionId from matchResponse (check if backend calls it sessionId or matchSessionId)
  const sessionId = matchResponse?.sessionId || matchResponse?.matchSessionId || matchResponse?.id;

  if (roomId) {
    this.stopSearch(countdownInterval);
    this.saveMatchedUserId(roomId);

    const prefPayload: MatchPreferenceDto = {
      preferredProfessionId: Number(this.selectedProfessionId),
      preferredSkillIds: this.selectedSkills.map((s) => Number(s.id)),
      goal: this.selectedGoal,
      matchType: 'random',
      isSearching: false,
    };

    this.http.post(`${this.apiUrl}/MatchPreference/${currentUserId}`, prefPayload).subscribe();

    localStorage.setItem('userMatchPreference', JSON.stringify(prefPayload));

    // 2. Pass BOTH roomId and sessionId in queryParams!
    this.router.navigate(['/room'], {
      queryParams: { roomId, sessionId },
      state: { matchPreference: prefPayload },
    });
  }
},
      error: (err) => {
        // If 404 (no match yet) and we still have time left, keep waiting
        if (err.status === 404 && attemptCount < maxAttempts) {
          console.log(`Searching... Attempt ${attemptCount}/${maxAttempts}`);
        } else if (attemptCount >= maxAttempts || err.status !== 404) {
          // Timeout reached or non-404 error occurred
          this.stopSearch(countdownInterval);
          this.isSearchingMatch = false;

          if (err.status === 404) {
            alert('No online matches found right now. Please try searching again in a moment!');
          } else {
            console.error('Matching API error during poll:', err);
          }
        }
      },
    });
  }, pollInterval);
}

cancelSearch() {
  this.stopSearch();
  this.isSearchingMatch = false;

  // Optional: Update backend to set isSearching = false
  const currentUserId = this.authService.getUserId();
  if (currentUserId && this.selectedProfessionId) {
    const cancelPayload: MatchPreferenceDto = {
      preferredProfessionId: Number(this.selectedProfessionId),
      preferredSkillIds: this.selectedSkills.map((s) => Number(s.id)),
      goal: this.selectedGoal,
      matchType: 'random',
      isSearching: false,
    };
    this.http.post(`${this.apiUrl}/MatchPreference/${currentUserId}`, cancelPayload).subscribe();
  }
}

private stopSearch(countdownInterval?: any) {
  if (this.searchTimer) clearInterval(this.searchTimer);
  if (countdownInterval) clearInterval(countdownInterval);
}

  saveMatchedUserId(matchedUserId: number) {
    const existing: number[] = JSON.parse(localStorage.getItem('recentMatchedUserIds') || '[]');
    const updated = [matchedUserId, ...existing.filter((id) => id !== matchedUserId)].slice(0, 6);
    localStorage.setItem('recentMatchedUserIds', JSON.stringify(updated));
    this.loadRecentMatches();
  }

  viewProfile(userId: number) {
    this.router.navigate(['/profile', userId]);
  }
}