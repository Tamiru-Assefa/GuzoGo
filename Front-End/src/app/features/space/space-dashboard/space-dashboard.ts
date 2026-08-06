// features/space/space-dashboard/space-dashboard.component.ts

import { Component, OnInit, NgZone, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { SpacesService } from '../services/spaces';
import { Space } from '../models/space.models';
import { ProfileService, UserProfile } from '../../../core/services/profile';
import { CategoryFilterComponent } from '../components/category-filter/category-filter';
import { SpaceCardComponent } from '../components/space-card/space-card';
import { CreateSpaceModalComponent } from '../components/create-space-modal/create-space-modal';
import { RouterModule } from '@angular/router';


@Component({
  selector: 'app-space-dashboard',
  standalone: true,
  imports: [
    CommonModule, 
    FormsModule, 
    CategoryFilterComponent, 
    SpaceCardComponent,
    CreateSpaceModalComponent,
     RouterModule
    
  ],
  templateUrl: './space-dashboard.html',
  styleUrls: ['./space-dashboard.scss'],
  
})
export class SpaceDashboardComponent implements OnInit {
  public isCreateModalOpen = false;
  public selectedCategory = 'All Topics';
  public searchQuery = '';
  public activeFilter: 'all' | 'my-spaces' | 'public' | 'private' = 'all';
  public isProfileOpen = false;
  public profilePictureUrl: string = '';
  public userName: string = '';
  public userEmail: string = '';
  public currentUserId = Number(localStorage.getItem('userId') || '0');

  public spaces: Space[] = [];

  // Category mapping: matches category-filter categories to room data
  // In SpaceDashboardComponent:

private categoryMap: { [key: number]: string } = {
  1: 'AI & Data Science',
  2: 'Business & Growth',
  3: 'Career & Interview',
  4: 'Creative & Design',
  5: 'Customer Experience',
  6: 'Cybersecurity & IT Ops',
  7: 'Finance & Strategy',
  8: 'Language Exchange',
  9: 'Legal & Regulatory',
  10: 'Mentorship & Leadership',
  11: 'Product Management',
  12: 'Productivity & Workflow',
  13: 'Quality Assurance',
  14: 'Research & Academic',
  15: 'Software Development',
  16: 'Startup & Co-Founding'
};

  constructor(
    private spacesService: SpacesService,
    private router: Router,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,  
    private ngZone: NgZone  
  ) {}

  ngOnInit(): void {
    this.fetchSpaces();
    this.loadUserProfile();
  }

 public fetchSpaces(): void {
  this.spacesService.getSpaces().subscribe({
    next: (data) => {
      this.ngZone.run(() => {           // <-- Wrap in NgZone
        if (data && data.length > 0) {
          this.spaces = data;
          this.cdr.detectChanges();     // <-- Force update
        }
      });
    },
    error: (err) => console.error('Error fetching spaces', err)
  });
}

  /**
   * Get category name from a space object
   */
  private getCategoryName(space: Space): string {
    // Check all possible category fields
    if ((space as any).categoryName) return (space as any).categoryName;
    if (space.category) return space.category;
    if ((space as any).categoryId && this.categoryMap[(space as any).categoryId]) {
      return this.categoryMap[(space as any).categoryId];
    }
    return 'General';
  }

  /**
   * Consolidated single getter for Search, Category, and Privacy/Ownership tabs
   */
  public get filteredSpaces(): Space[] {
    if (!this.spaces || this.spaces.length === 0) return [];

    const queryText = this.searchQuery.trim().toLowerCase();

    return this.spaces.filter((space) => {
      // 1. Category Filter
      let matchesCategory = true;
      if (this.selectedCategory !== 'All Topics' && this.selectedCategory !== 'All') {
        const spaceCategory = this.getCategoryName(space);
        matchesCategory = spaceCategory === this.selectedCategory;
      }

      // 2. Search Text Filter
      const searchText = (space.title ?? '').toLowerCase();
      const matchesSearch = !queryText || searchText.includes(queryText);

      // 3. Tab (All / My Spaces / Public / Private) Filter
      let matchesType = true;
      if (this.activeFilter === 'public') {
        matchesType = space.isPublic === true;
      } else if (this.activeFilter === 'private') {
        matchesType = space.isPublic === false;
      } else if (this.activeFilter === 'my-spaces') {
        matchesType = String((space as any).hostUserId || (space as any).hostId) === String(this.currentUserId);
      }

      return matchesCategory && matchesSearch && matchesType;
    });
  }

  public onCategorySelect(category: string): void {
    this.selectedCategory = category;
  }

  public filterOwnership(type: 'all' | 'my-spaces' | 'public' | 'private'): void {
    this.activeFilter = type;
  }

  public openCreateModal(): void {
    this.isCreateModalOpen = true;
  }

  public closeCreateModal(): void {
    this.isCreateModalOpen = false;
  }

  public onSpaceCreated(newSpace: Space): void {
    this.closeCreateModal();
    this.fetchSpaces();
  }

  public joinSpace(spaceId: number): void {
    this.router.navigate(['/spaces', spaceId]);
  }

  private loadUserProfile(): void {
  const userId = Number(localStorage.getItem('userId') || '0');
  if (userId) {
    this.profileService.getProfileByUserId(userId).subscribe({
      next: (profile: UserProfile) => {
        this.ngZone.run(() => {
          this.profilePictureUrl = profile.profilePictureUrl || '';
          this.userName = profile.firstName + ' ' + profile.lastName;
          this.userEmail = localStorage.getItem('email') || '';
          this.cdr.detectChanges();
        });
      },
      error: () => {
        // Use defaults - already handled
      }
    });
  }
}

  public editProfile(): void {
    this.router.navigate(['/profile/edit']);
  }

  public viewProfile(): void {
    const userId = localStorage.getItem('userId');
    this.router.navigate(['/profile', userId]);
  }

  public logout(): void {
    localStorage.clear();
    this.router.navigate(['/login']);
  }
}