import { Component, OnInit, NgZone, ChangeDetectorRef} from '@angular/core';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { ProfileService, UserProfile } from '../../../../core/services/profile';
import { Location } from '@angular/common';


@Component({
  selector: 'app-profile-view',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './profile-view.html',
  styleUrls: ['./profile-view.scss']
})
export class ProfileViewComponent implements OnInit {
  public profile: UserProfile | null = null;
  public isLoading = true;
  public errorMessage = '';
  public imageLoadFailed = false;

  constructor(
    private route: ActivatedRoute,
    private profileService: ProfileService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private location: Location,
  ) {}

  ngOnInit(): void {
    const userId = this.route.snapshot.paramMap.get('id');
    if (userId) {
      this.loadProfile(Number(userId));
    }
  }

private loadProfile(userId: number): void {
  this.isLoading = true;
  
  this.profileService.getProfileByUserId(userId).subscribe({
    next: (data: any) => {
      this.ngZone.run(() => {
        this.profile = {
          id: data.id,
          userId: data.userId,
          firstName: data.firstName || '',
          lastName: data.lastName || '',
          professionTitle: data.professionTitle || '',
          professionCategory: data.professionCategory || '',
          company: data.company || '',
          country: data.country || '',
          city: data.city || '',
          bio: data.bio || '',
          linkedInUrl: data.linkedInUrl || '',
          gitHubUrl: data.gitHubUrl || '',
          portfolioUrl: data.portfolioUrl || '',
          profilePictureUrl: data.profilePictureUrl || '',  // <-- Now included!
          experienceLevel: data.experienceLevel || 0,
          rating: data.rating || 0,
          totalRatings: data.totalRatings || 0,
          badgeLevel: data.badgeLevel || 'New Member'
        };
        
        this.isLoading = false;
        this.cdr.detectChanges();
      });
    },
    error: (err) => {
      this.errorMessage = 'Failed to load profile.';
      this.isLoading = false;
    }
  });
}

  public get fullName(): string {
    return this.profile ? `${this.profile.firstName} ${this.profile.lastName}` : '';
  }

  public get experienceLabel(): string {
    const levels: { [key: number]: string } = {
      1: 'Entry Level',
      2: 'Junior',
      3: 'Mid Level',
      4: 'Senior',
      5: 'Lead / Principal'
    };
    return this.profile ? levels[this.profile.experienceLevel] || 'Not specified' : '';
  }
  public onImageError(): void {
  this.imageLoadFailed = true;
  console.log('🖼️ Profile image failed to load, showing fallback');
}

goBack(): void {
  this.location.back();
}
}