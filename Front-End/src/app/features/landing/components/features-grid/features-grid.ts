import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-features-grid',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './features-grid.html',
  styleUrls: ['./features-grid.scss']
})
export class FeaturesGridComponent implements OnInit, OnDestroy {
  isMicActive = true;
  soundBars = Array(12).fill(0).map(() => Math.floor(Math.random() * 80) + 20);
  private soundWaveInterval: ReturnType<typeof setInterval> | null = null;

  matchingProgress = 45;
  isMatchFound = false;
  private matchingInterval: any;

  memberCount = 8;
  maxMembers = 15;
  activeAvatars = [
    { id: 1, color: '#f43f5e', initial: 'JD', name: 'John Dev', position: { x: 20, y: 30 } },
    { id: 2, color: '#10b981', initial: 'SF', name: 'Sara Founder', position: { x: 75, y: 25 } },
    { id: 3, color: '#3b82f6', initial: 'AM', name: 'Alex Mentor', position: { x: 45, y: 70 } }
  ];
  private communityInterval: any;

  starRating = 4.7;
  reputationBadgeGlow = false;
  private reputationInterval: any;

  ngOnInit() {
    this.startSoundWave();

    this.matchingInterval = setInterval(() => {
      this.matchingProgress = (this.matchingProgress + 1) % 100;
      if (this.matchingProgress === 0) {
        this.isMatchFound = true;
        setTimeout(() => this.isMatchFound = false, 1500);
      }
    }, 100);

    this.communityInterval = setInterval(() => {
      if (this.memberCount < this.maxMembers) {
        this.memberCount++;
      } else {
        this.memberCount = 5;
      }
    }, 2500);

    this.reputationInterval = setInterval(() => {
      this.reputationBadgeGlow = true;
      setTimeout(() => this.reputationBadgeGlow = false, 1000);
      this.starRating = Number((4.7 + Math.random() * 0.3).toFixed(1));
    }, 3000);
  }

  ngOnDestroy() {
    this.stopSoundWave();
    if (this.matchingInterval) clearInterval(this.matchingInterval);
    if (this.communityInterval) clearInterval(this.communityInterval);
    if (this.reputationInterval) clearInterval(this.reputationInterval);
  }

  private startSoundWave() {
    this.stopSoundWave();

    this.soundBars = this.soundBars.map(() => Math.floor(Math.random() * 80) + 20);
    this.soundWaveInterval = setInterval(() => {
      if (this.isMicActive) {
        this.soundBars = this.soundBars.map(() => Math.floor(Math.random() * 80) + 20);
      }
    }, 120);
  }

  private stopSoundWave() {
    if (this.soundWaveInterval) {
      clearInterval(this.soundWaveInterval);
      this.soundWaveInterval = null;
    }
  }

  toggleMic() {
    this.isMicActive = !this.isMicActive;

    if (this.isMicActive) {
      this.startSoundWave();
    } else {
      this.stopSoundWave();
      this.soundBars = this.soundBars.map(() => 5);
    }
  }
}