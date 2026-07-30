import { Routes } from '@angular/router';
import { profileCheckGuard } from './core/guards/profile-check-guard';

export const routes: Routes = [
  // Redirect root path to register (or landing)
  { path: '', redirectTo: 'register', pathMatch: 'full' },

  {
    path: 'landing',
    loadComponent: () =>
      import('./features/landing/landing').then(
        (m) => m.LandingComponent
      ),
  },
  {
    path: 'register',
    loadComponent: () =>
      import('./features/auth/register/register').then(
        (m) => m.RegisterComponent
      ),
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./features/auth/login/login').then(
        (m) => m.LoginComponent
      ),
  },
  {
    path: 'create-profile',
    loadComponent: () =>
      import('./features/profile/create-profile/create-profile').then(
        (m) => m.CreateProfileComponent
      ),
  },
  {
    path: 'dashboard',
    canActivate: [profileCheckGuard], // Checks profile status before loading
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard').then(
        (m) => m.DashboardComponent
      ),
  },
  {
    path: 'room',
    loadComponent: () =>
      import('./features/room/room/room').then((m) => m.RoomComponent),
  },

  // Wildcard fallback
  { path: '**', redirectTo: 'register' },
];