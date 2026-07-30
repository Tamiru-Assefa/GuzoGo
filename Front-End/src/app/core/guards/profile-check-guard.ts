import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { ProfileService } from '../services/profile';
import { AuthService } from '../services/auth'; // Assuming AuthService holds user session/JWT
import { catchError, map, of } from 'rxjs';

export class ProfileCheckGuard {
  // Functional guard implementation
}

export const profileCheckGuard: CanActivateFn = (route, state) => {
  const profileService = inject(ProfileService);
  const authService = inject(AuthService);
  const router = inject(Router);

  // Get current logged-in userId (from auth state, token, or localStorage)
  const userId = authService.getUserId(); 

  if (!userId) {
    router.navigate(['/login']);
    return of(false);
  }

  return profileService.getProfileByUserId(userId).pipe(
    map((profile) => {
      if (profile) {
        return true; // Profile exists -> allow entry to Dashboard
      } else {
        router.navigate(['/create-profile']);
        return false;
      }
    }),
    catchError((error) => {
      // If backend returns 404 Not Found, redirect to profile creation
      router.navigate(['/create-profile']);
      return of(false);
    })
  );
};