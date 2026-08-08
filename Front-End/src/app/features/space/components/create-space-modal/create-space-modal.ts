// features/space/components/create-space-modal/create-space-modal.component.ts

import { Component, OnInit, Output, EventEmitter,  NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { SpacesService } from '../../services/spaces';
import { RoomCategory, CreateSpaceRequest, Space } from '../../models/space.models';

@Component({
  selector: 'app-create-space-modal',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './create-space-modal.html',
  styleUrls: ['./create-space-modal.scss']
})
export class CreateSpaceModalComponent implements OnInit {
  @Output() close = new EventEmitter<void>();
  @Output() spaceCreated = new EventEmitter<Space>();

  public createForm!: FormGroup;
  public categories: RoomCategory[] = [];
  public isLoadingCategories = true;
  public isSubmitting = false;
  public errorMessage: string | null = null;

  public createdSpaceLink: string = '';
  public showShareLink = false;

  public participantOptions: number[] = [2, 4, 6, 8, 10, 12];

  constructor(
    private fb: FormBuilder,
    private spacesService: SpacesService,
    private router: Router,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone
  ) {}

  ngOnInit(): void {
    this.initForm();
    this.loadCategories();
  }

  private initForm(): void {
    this.createForm = this.fb.group({
      title: ['', [Validators.required, Validators.minLength(3), Validators.maxLength(80)]],
      categoryId: ['', [Validators.required]],
      isPublic: [true, [Validators.required]],
      password: [''],
      maxParticipants: [6, [Validators.required]],
      allowVideo: [true],
      allowScreenShare: [true]
    });

    // Dynamic password validation toggle
    this.createForm.get('isPublic')?.valueChanges.subscribe((isPublic: boolean) => {
      const passwordControl = this.createForm.get('password');
      if (!isPublic) {
        passwordControl?.setValidators([Validators.required, Validators.minLength(4)]);
      } else {
        passwordControl?.clearValidators();
        passwordControl?.setValue('');
      }
      passwordControl?.updateValueAndValidity();
    });
  }

  private loadCategories(): void {
    this.isLoadingCategories = true;
    this.spacesService.getCategories().subscribe({
      next: (cats) => {
        this.categories = cats;
        this.isLoadingCategories = false;
        if (cats.length > 0) {
          this.createForm.patchValue({ categoryId: cats[0].id });
        }
      },
      error: (err) => {
        console.error('Failed to load categories', err);
        this.isLoadingCategories = false;
        // Fallback mock categories for UI testing if endpoint isn't live yet
        this.categories = [
          { id: 1, name: 'Software Development', slug: 'software-dev', icon: 'fa-code' },
          { id: 2, name: 'Language Exchange', slug: 'language-exchange', icon: 'fa-comments' },
          { id: 3, name: 'UI/UX & Design', slug: 'design', icon: 'fa-paint-brush' },
          { id: 4, name: 'Career & Interviews', slug: 'career', icon: 'fa-briefcase' }
        ];
        if (this.categories.length > 0) {
          this.createForm.patchValue({ categoryId: this.categories[0].id });
        }
      }
    });
  }

   public onSubmit(): void {
  if (this.createForm.invalid) {
    this.createForm.markAllAsTouched();
    return;
  }

  this.isSubmitting = true;
  this.errorMessage = null;

  const formValues = this.createForm.value;
  const payload: CreateSpaceRequest = {
    title: formValues.title.trim(),
    categoryId: Number(formValues.categoryId),
    isPublic: formValues.isPublic,
    password: formValues.isPublic ? undefined : formValues.password,
    maxParticipants: Number(formValues.maxParticipants),
    allowVideo: formValues.allowVideo,
    allowScreenShare: formValues.allowScreenShare
  };

  this.spacesService.createSpace(payload).subscribe({
  next: (newSpace: any) => {
    this.ngZone.run(() => {
      console.log('✅ Space created:', newSpace);
      this.isSubmitting = false;
      
      const spaceId = newSpace?.id || newSpace?.roomId;
      
      if (spaceId) {
        this.createdSpaceLink = `${window.location.origin}/spaces/${spaceId}`;
        
        if (!formValues.isPublic && formValues.password) {
          this.createdSpaceLink += ` (Password: ${formValues.password})`;
        }
        
        this.showShareLink = true;
        this.cdr.detectChanges();
      } else {
        this.errorMessage = 'Space created but could not generate link.';
      }
    });
  },
  error: (err) => {
    this.ngZone.run(() => {
      console.error('Error creating space', err);
      this.isSubmitting = false;
      this.errorMessage = 'Failed to create space. Please try again.';
      this.cdr.detectChanges();
    });
  }
});

}

  public copyLink(): void {
    navigator.clipboard.writeText(this.createdSpaceLink).then(() => {
      // Show copied feedback
      const btn = document.querySelector('.copy-btn');
      if (btn) {
        btn.textContent = 'Copied!';
        setTimeout(() => {
          btn.textContent = 'Copy Link';
        }, 2000);
      }
    });
  }

  public goToSpace(): void {
    const spaceId = this.createdSpaceLink.split('/').pop()?.split(' ')[0];
    if (spaceId) {
      this.close.emit();
      this.router.navigate(['/spaces', spaceId]);
    }
  }

  public onCancel(): void {
    this.close.emit();
  }

  // Helper getters for validation errors in template
  get f() {
    return this.createForm.controls;
  }
}