import { Component, inject, OnInit, ChangeDetectorRef } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { ProfileService } from '../../../core/services/profile';
import { CreateProfileRequest } from '../../../core/models/profile/create-profile-request';
import { AuthService } from '../../../core/services/auth';

@Component({
  selector: 'app-create-profile',
  imports: [ReactiveFormsModule],
  templateUrl: './create-profile.html',
  styleUrl: './create-profile.scss',
})
export class CreateProfileComponent implements OnInit {
  private fb = inject(FormBuilder);
  private profileService = inject(ProfileService);
  private router = inject(Router);
  private cdr = inject(ChangeDetectorRef);
  private authService = inject(AuthService);

  isLoading = false;
  errorMessage = '';
  previewUrl: string | null = null;

  // Experience levels for the card selector
  experienceLevels = [
    { label: 'Junior (1)', value: 1 },
    { label: 'Mid-Level (2)', value: 2 },
    { label: 'Senior (3)', value: 3 },
  ];

  // Updated form: profession is now a free‑text field, required fields marked with *
  profileForm = this.fb.group({
    userId: [0],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    profession: ['', [Validators.required]],   // was professionTitleId
    experienceLevel: [1, [Validators.required]],
    company: [''],                                  // optional
    country: [''],
    city: [''],
    bio: ['', [Validators.required]],
    linkedInUrl: [''],                              // optional
    gitHubUrl: [''],                                // optional
    portfolioUrl: [''],                             // optional
    profilePictureUrl: [''],                        // optional
  });

  ngOnInit() {
    const currentUserId = this.authService.getUserId();
    if (currentUserId) {
      this.profileForm.patchValue({ userId: currentUserId });
    } else {
      this.router.navigate(['/login']);
    }
  }

  selectExperienceLevel(value: number) {
    this.profileForm.patchValue({ experienceLevel: value });
  }

  // Handle local file uploads (base64 not shown in UI)
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

  // Handle URL input (preview only, base64 still hidden)
  onUrlChange(url: string) {
    this.previewUrl = url;
  }

  onSubmit() {
    if (this.profileForm.invalid) {
      this.profileForm.markAllAsTouched();
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    const formValues = this.profileForm.value;

    // Build payload – map free-text profession to the backend field name
    const payload: CreateProfileRequest = {
      userId: formValues.userId,
      firstName: formValues.firstName,
      lastName: formValues.lastName,
      profession: formValues.profession,  // free‑text
      experienceLevel: Number(formValues.experienceLevel),
      company: formValues.company || '',
      country: formValues.country || '',
      city: formValues.city || '',
      bio: formValues.bio,
      linkedInUrl: formValues.linkedInUrl || '',
      gitHubUrl: formValues.gitHubUrl || '',
      portfolioUrl: formValues.portfolioUrl || '',
      profilePictureUrl: formValues.profilePictureUrl || '',
    } as CreateProfileRequest;


    this.profileService.createProfile(payload).subscribe({
      next: () => {
        this.isLoading = false;
        this.router.navigate(['/dashboard']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage =
          error.error?.message ?? 'Failed to create profile. Please try again.';
        this.cdr.detectChanges();
      },
    });
  }
}