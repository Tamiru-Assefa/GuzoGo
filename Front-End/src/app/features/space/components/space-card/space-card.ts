// features/space/components/space-card/space-card.component.ts
import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { SpacesService } from '../../services/spaces';

@Component({
  selector: 'app-space-card',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space-card.html',
  styleUrls: ['./space-card.scss']
})

export class SpaceCardComponent {
  @Input() room!: any;
  @Output() onJoin = new EventEmitter<number>();

  constructor(
    private router: Router,
    private spacesService: SpacesService
  ) {}

  // Category mapping dictionary
  // In SpaceCardComponent:

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

  /**
   * Returns category name from categoryId or category string
   */
  get categoryDisplayName(): string {
    if (this.room?.categoryName) return this.room.categoryName;
    if (this.room?.category) return this.room.category;
    if (this.room?.categoryId && this.categoryMap[this.room.categoryId]) {
      return this.categoryMap[this.room.categoryId];
    }
    return '🌐 General';
  }

  /**
   * Returns host name with fallback to current logged in user if host
   */
  get hostDisplayName(): string {
    return this.room?.hostName || 
           this.room?.host || 
           this.room?.creatorName || 
           this.room?.user?.fullName || 
           'Host';
  }

  /**
   * Generates active participant avatar list dynamically
   */
  get dynamicAvatars(): string[] {
    // 1. If backend returns an array of participant avatars
    if (this.room?.participantAvatars && Array.isArray(this.room.participantAvatars) && this.room.participantAvatars.length > 0) {
      return this.room.participantAvatars;
    }

    // 2. Otherwise calculate based on room.participants / current count
    const count = this.room?.participantsCount || this.room?.participants || 1;
    
    // Fallback host avatar
    const hostAvatar = this.room?.hostAvatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(this.hostDisplayName)}&background=4f46e5&color=fff`;

    const avatars = [hostAvatar];

    // Add generic participant avatars up to current count (max 3 displayed)
    for (let i = 1; i < Math.min(count, 3); i++) {
      avatars.push(`https://i.pravatar.cc/100?img=${(this.room?.id || 1) + i}`);
    }

    return avatars;
  }

  public join(): void {
    this.onJoin.emit(this.room.id);
  }

  public handleJoin(): void {
    // 1. If public room, join and navigate immediately
    if (this.room.isPublic) {
      this.spacesService.joinRoom(this.room.id).subscribe({
        next: () => {
          this.router.navigate(['/spaces', this.room.id]);
        },
        error: (err) => console.error('Failed to join room', err)
      });
    } else {
      // 2. If private room, prompt for password
      const password = prompt('Enter room password:');
      if (!password) return;

      this.spacesService.joinRoom(this.room.id, password).subscribe({
        next: (success) => {
          if (success) {
            this.router.navigate(['/spaces', this.room.id]);
          } else {
            alert('Incorrect password or room is full!');
          }
        },
        error: (err) => console.error('Error joining room', err)
      });
    }
  }
}