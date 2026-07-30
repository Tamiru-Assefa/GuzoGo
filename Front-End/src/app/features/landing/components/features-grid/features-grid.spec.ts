import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-features-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features-grid.component.html',
  styleUrls: ['./features-grid.component.scss']
})
export class FeaturesGridComponent implements OnInit, OnDestroy {
  soundBars = Array(12).fill(0).map(() => Math.floor(Math.random() * 70) + 15);
  private soundWaveInterval: ReturnType<typeof setInterval> | null = null;

  matchingProgress = 45;
  isMatchFound = false;
  private matchingInterval: ReturnType<typeof setInterval> | null = null;

  memberCount = 8;
  maxMembers = 15;
  activeAvatars = [
    { id: 1, color: '#f43f5e', initial: 'JD', name: 'John Dev', position: { x: 20, y: 30 } },
    { id: 2, color: '#10b981', initial: 'SF', name: 'Sara Founder', position: { x: 75, y: 25 } },
    { id: 3, color: '#3b82f6', initial: 'AM', name: 'Alex Mentor', position: { x: 45, y: 70 } }
  ];
  private communityInterval: ReturnType<typeof setInterval> | null = null;

  starRating = 4.7;
  reputationBadgeGlow = false;
  private reputationInterval: ReturnType<typeof setInterval> | null = null;

  ngOnInit() {
    // Soundwave continuously animates
    this.soundWaveInterval = setInterval(() => {
      this.soundBars = this.soundBars.map(() => Math.floor(Math.random() * 75) + 15);
    }, 120);

    // Matching radar scanning loop
    this.matchingInterval = setInterval(() => {
      this.matchingProgress = (this.matchingProgress + 1) % 100;
      if (this.matchingProgress === 0) {
        this.isMatchFound = true;
        setTimeout(() => this.isMatchFound = false, 1500);
      }
    }, 100);

    // Room member count ticker
    this.communityInterval = setInterval(() => {
      if (this.memberCount < this.maxMembers) {
        this.memberCount++;
      } else {
        this.memberCount = 5;
      }
    }, 2500);

    // Trust rating pulse update
    this.reputationInterval = setInterval(() => {
      this.reputationBadgeGlow = true;
      setTimeout(() => this.reputationBadgeGlow = false, 1000);
      this.starRating = Number((4.7 + Math.random() * 0.3).toFixed(1));
    }, 3000);
  }

  ngOnDestroy() {
    if (this.soundWaveInterval) clearInterval(this.soundWaveInterval);
    if (this.matchingInterval) clearInterval(this.matchingInterval);
    if (this.communityInterval) clearInterval(this.communityInterval);
    if (this.reputationInterval) clearInterval(this.reputationInterval);
  }
}