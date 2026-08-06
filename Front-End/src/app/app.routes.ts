import { Routes } from '@angular/router';
import { profileCheckGuard } from './core/guards/profile-check-guard';
import { SpaceDashboardComponent } from './features/space/space-dashboard/space-dashboard';

export const routes: Routes = [
  // Redirect root path to register
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
    canActivate: [profileCheckGuard],
    loadComponent: () =>
      import('./features/dashboard/dashboard/dashboard').then(
        (m) => m.DashboardComponent
      ),
  },

  // Spaces Routes
  {
    path: 'spaces',
    component: SpaceDashboardComponent,
    canActivate: [profileCheckGuard]
  },
  {
    path: 'spaces/:id',
    canActivate: [profileCheckGuard],
    loadComponent: () =>
      import('./features/space/pages/room-detail/room-detail').then(
        (m) => m.RoomDetailComponent
      )
  },

  {
    path: 'room',
    loadComponent: () =>
      import('./features/room/room/room').then((m) => m.RoomComponent),
  },
  {
  path: 'profile/:id',
  loadComponent: () => import('./features/profile/pages/profile-view/profile-view')
    .then(m => m.ProfileViewComponent)
},

  // Wildcard fallback (keep at the bottom)
  { path: '**', redirectTo: 'register' },
];