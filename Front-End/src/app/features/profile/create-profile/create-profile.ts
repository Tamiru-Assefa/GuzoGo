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

  ngOnInit() {
    const currentUserId = this.authService.getUserId();

    if (currentUserId) {
      this.profileForm.patchValue({ userId: currentUserId });
    } else {
      // If no valid user ID is found in storage, send them back to login
      this.router.navigate(['/login']);
    }
  }

  isLoading = false;
  errorMessage = '';
  previewUrl: string | null = null; // Holds local preview URL

  professionTitles = [
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

  experienceLevels = [
    { label: 'Junior (1)', value: 1 },
    { label: 'Mid-Level (2)', value: 2 },
    { label: 'Senior (3)', value: 3 },
  ];

  profileForm = this.fb.group({
    userId: [0],
    firstName: ['', [Validators.required]],
    lastName: ['', [Validators.required]],
    professionTitleId: [null, [Validators.required]],
    experienceLevel: [1, [Validators.required]],
    company: [''],
    country: ['', [Validators.required]],
    city: ['', [Validators.required]],
    bio: [''],
    linkedInUrl: [''],
    gitHubUrl: [''],
    portfolioUrl: [''],
    profilePictureUrl: [''],
  });

  selectExperienceLevel(value: number) {
    this.profileForm.patchValue({ experienceLevel: value });
  }

  // Handle local file uploads
  onFileSelected(event: Event) {
    const fileInput = event.target as HTMLInputElement;
    if (fileInput.files && fileInput.files[0]) {
      const file = fileInput.files[0];
      
      const reader = new FileReader();
      reader.onload = () => {
        this.previewUrl = reader.result as string;
        // Save Base64 data URL into the profilePictureUrl form field
        this.profileForm.patchValue({ profilePictureUrl: this.previewUrl });
        this.cdr.detectChanges();
      };
      reader.readAsDataURL(file);
    }
  }

  // Handle URL input manually if typed/pasted
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
    const payload: CreateProfileRequest = {
      ...formValues,
      professionTitleId: Number(formValues.professionTitleId),
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