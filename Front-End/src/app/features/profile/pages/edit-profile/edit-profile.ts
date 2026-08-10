import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { Location } from '@angular/common';
import { CommonModule } from '@angular/common';
import { ProfileService, UserProfile } from '../../../../core/services/profile';
import { AuthService } from '../../../../core/services/auth';

@Component({
  selector: 'app-edit-profile',
  standalone: true,
  imports: [ReactiveFormsModule, CommonModule],
  templateUrl: './edit-profile.html',
  styleUrls: ['./edit-profile.scss']
})
export class EditProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private authService = inject(AuthService);
  private router = inject(Router);
  private location = inject(Location);
  private cdr = inject(ChangeDetectorRef);

  isLoading = true;
  isSaving = false;
  formDisabled = false;
  errorMessage = '';
  successMessage = '';
  previewUrl: string | null = null;
  profileId: number | null = null;

  experienceLevels = [
    { label: 'Junior (1)', value: 1 },
    { label: 'Mid-Level (2)', value: 2 },
    { label: 'Senior (3)', value: 3 },
  ];

  profileForm = this.fb.group({
    firstName: ['', Validators.required],
    lastName: ['', Validators.required],
    profession: ['', Validators.required],
    experienceLevel: [1, Validators.required],
    company: [''],
    country: ['', Validators.required],
    city: ['', Validators.required],
    bio: ['', Validators.required],
    linkedInUrl: [''],
    gitHubUrl: [''],
    portfolioUrl: [''],
    profilePictureUrl: [''],
  });

  ngOnInit() {
    const userId = this.authService.getUserId();
    if (!userId) {
      this.errorMessage = 'No user session found. Redirecting...';
      this.isLoading = false;
      setTimeout(() => this.router.navigate(['/login']), 2000);
      return;
    }
    this.loadProfile(userId);
  }

  goBack(): void {
    this.location.back();
  }

  private loadProfile(userId: number) {
    this.isLoading = true;
    this.profileService.getProfileByUserId(userId).subscribe({
      next: (profile: UserProfile) => {
        this.profileId = profile.id;
        this.profileForm.patchValue({
          firstName: profile.firstName,
          lastName: profile.lastName,
          profession: profile.profession,
          experienceLevel: profile.experienceLevel,
          company: profile.company,
          country: profile.country,
          city: profile.city,
          bio: profile.bio,
          linkedInUrl: profile.linkedInUrl,
          gitHubUrl: profile.gitHubUrl,
          portfolioUrl: profile.portfolioUrl,
          profilePictureUrl: profile.profilePictureUrl,
        });
        if (profile.profilePictureUrl) {
          this.previewUrl = profile.profilePictureUrl;
        }
        this.isLoading = false;
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.errorMessage = 'Failed to load profile.';
        this.isLoading = false;
      }
    });
  }

  selectExperienceLevel(value: number) {
    this.profileForm.patchValue({ experienceLevel: value });
  }

  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        this.profileForm.patchValue({ profilePictureUrl: this.previewUrl });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  onSubmit() {
    if (this.profileForm.invalid || !this.profileId) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isSaving = true;
    this.errorMessage = '';
    this.successMessage = '';

    const formValues = this.profileForm.value;

    this.profileService.updateProfile(this.profileId, formValues).subscribe({
      next: () => {
        this.successMessage = 'Profile updated successfully!';
        this.isSaving = false;
        this.formDisabled = true;
        this.cdr.detectChanges();
        // no auto-navigation – user can stay and then click "Back to Dashboard"
      },
      error: (err) => {
        this.errorMessage = err.error?.message ?? 'Update failed. Please try again.';
        this.isSaving = false;
        this.cdr.detectChanges();
      }
    });
  }
}