import { CommonModule } from '@angular/common';
import {
  Component,
  ElementRef,
  OnInit,
  AfterViewInit,
  OnDestroy,
  ViewChild,
  inject,
  ChangeDetectorRef
} from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { PeerMatchSignalRService } from '../../../core/services/peer-match-signalr';
import { PeerMatchRtcService } from '../../../core/services/peer-match-rtc';
import { AuthService } from '../../../core/services/auth';
import { environment } from '../../../../environments/environment';

export interface MatchPreferenceDto {
  preferredProfessionId: number;
  preferredSkillIds: number[];
  goal: string;
  matchType: string;
  isSearching: boolean;
}

@Component({
  selector: 'app-room',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './room.html',
  styleUrls: ['./room.scss'],
})
export class RoomComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private signalRService = inject(PeerMatchSignalRService);
  private rtcService = inject(PeerMatchRtcService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  public localProfile: any = null;
  public remoteProfile: any = null;
  public isLocalVideoActive = true;
  public isRemoteVideoActive = true;
  public isProfileModalOpen = false;

  private readonly apiUrl = environment.apiUrl;
  private signalRSubscriptions: Subscription = new Subscription();

  public roomId: string = '';
  public sessionId: number | null = null;
  public currentUserId!: number;

  private userPreference!: MatchPreferenceDto;
  private excludeUserId: number | null = null;

  public isMuted = false;
  public isVideoOff = false;
  public isSearchingNextMatch = false;
  public searchTimeRemaining = 60;
  private searchTimer: any;
  private countdownTimer: any;

  async ngOnInit() {
    this.currentUserId = Number(this.authService.getUserId());
    this.roomId = this.route.snapshot.queryParamMap.get('roomId') || '';
    this.rtcService.setCurrentUser(this.currentUserId);
    this.rtcService.setRoomId(this.roomId);

    const sessIdParam = this.route.snapshot.queryParamMap.get('sessionId');
    if (sessIdParam) this.sessionId = Number(sessIdParam);

    if (this.currentUserId) {
      this.fetchLocalUserProfile(this.currentUserId);
    }

    this.loadUserMatchPreference();
    await this.initLocalStream();

    await this.signalRService.startConnection();
    if (this.roomId) {
      await this.signalRService.joinRoom(this.roomId);
    }

    this.listenToSignalREvents();
  }

  ngAfterViewInit() {
    if (this.rtcService.localStream && this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = this.rtcService.localStream;
      this.localVideo.nativeElement.muted = true;
      this.localVideo.nativeElement.play().catch(() => {});
    }

    if (this.rtcService.remoteStream && this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = this.rtcService.remoteStream;
      this.playVideo(this.remoteVideo.nativeElement);
    }
  }

  private async initLocalStream() {
    try {
      const stream = await this.rtcService.getLocalStream();
      if (this.localVideo?.nativeElement) {
        this.localVideo.nativeElement.srcObject = stream;
        this.localVideo.nativeElement.muted = true;
        this.localVideo.nativeElement.play().catch(() => {});
      }
    } catch (e) {
      console.warn('Camera access denied or unattached:', e);
    }
  }

  private fetchLocalUserProfile(userId: number) {
    this.http.get<any>(`${this.apiUrl}/Profile/user/${userId}`).subscribe({
      next: (data) => {
        this.localProfile = data;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Could not fetch local user profile:', err),
    });
  }

  public fetchRemoteUserProfile(remoteUserId: number) {
    if (!remoteUserId) return;
    this.http.get<any>(`${this.apiUrl}/Profile/user/${remoteUserId}`).subscribe({
      next: (data) => {
        this.remoteProfile = data;
        this.rtcService.setRemoteUserId(String(remoteUserId));
        this.cdr.detectChanges();
      },
      error: () => {
        this.remoteProfile = {
          userId: remoteUserId,
          firstName: 'Peer',
          lastName: 'User',
          professionTitle: 'Community Member',
          country: 'Online',
          skills: ['Networking']
        };
        this.rtcService.setRemoteUserId(String(remoteUserId));
        this.cdr.detectChanges();
      },
    });
  }

  // ============================================================
  // NEXT MATCH (EXCLUDE PREVIOUS USER)
  // ============================================================

  findNextMatch(): void {
    if (this.isSearchingNextMatch) return;

    this.excludeUserId = this.remoteProfile?.userId || this.remoteProfile?.id || null;

    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/Matching/end/${this.sessionId}`, {}).subscribe({
        error: (err) => console.error('Failed to end previous session:', err),
      });
      this.sessionId = null;
    }

    this.isSearchingNextMatch = true;
    this.searchTimeRemaining = 60;
    this.isProfileModalOpen = false;

    this.cleanupCurrentCall();

    const searchPayload: MatchPreferenceDto = {
      ...this.userPreference,
      preferredProfessionId: this.userPreference.preferredProfessionId || 1,
      preferredSkillIds: this.userPreference.preferredSkillIds?.length ? this.userPreference.preferredSkillIds : [1],
      isSearching: true,
    };

    this.http.post(`${this.apiUrl}/MatchPreference/${this.currentUserId}`, searchPayload).subscribe({
      next: () => this.pollForNextMatch(this.currentUserId),
      error: (err) => {
        this.isSearchingNextMatch = false;
        console.error('Failed to start next match search:', err);
      },
    });
  }

  private pollForNextMatch(currentUserId: number) {
    const pollInterval = 3000;
    const maxAttempts = 20;
    let attemptCount = 0;

    this.stopNextMatchSearch();

    this.countdownTimer = setInterval(() => {
      this.searchTimeRemaining--;
      if (this.searchTimeRemaining <= 0) {
        this.cancelNextMatchSearch();
      }
      this.cdr.detectChanges();
    }, 1000);

    this.searchTimer = setInterval(() => {
      attemptCount++;

      const body: any = {};
      if (this.excludeUserId) {
        body.excludeUserId = this.excludeUserId;
      }

      this.http.post(`${this.apiUrl}/Matching/find/${currentUserId}`, body).subscribe({
        next: (matchResponse: any) => {
          const newRoomId = matchResponse?.roomId || matchResponse?.id;
          const newSessionId = matchResponse?.sessionId;
          const matchedUser = matchResponse?.user;

          if (matchResponse?.matched && newRoomId && newRoomId !== this.roomId) {
            this.stopNextMatchSearch();

            if (newSessionId) this.sessionId = newSessionId;
            if (matchedUser) {
              this.remoteProfile = matchedUser;
              this.rtcService.setRemoteUserId(String(matchedUser.userId));
            }

            this.updateSearchingStatus(currentUserId, false);
            this.isSearchingNextMatch = false;
            this.roomId = newRoomId;

            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: { roomId: newRoomId, sessionId: this.sessionId },
              queryParamsHandling: 'merge',
            });

            this.rejoinNewRoom(newRoomId);
          }
        },
        error: (err) => {
          if (err.status !== 404 || attemptCount >= maxAttempts) {
            this.cancelNextMatchSearch();
          }
        },
      });
    }, pollInterval);
  }

  private updateSearchingStatus(userId: number, isSearching: boolean) {
    const payload: MatchPreferenceDto = { ...this.userPreference, isSearching };
    this.userPreference = payload;
    localStorage.setItem('userMatchPreference', JSON.stringify(payload));
    this.http.post(`${this.apiUrl}/MatchPreference/${userId}`, payload).subscribe();
  }

  public cancelNextMatchSearch() {
    this.stopNextMatchSearch();
    this.isSearchingNextMatch = false;
    if (this.currentUserId) this.updateSearchingStatus(this.currentUserId, false);
  }

  private stopNextMatchSearch() {
    if (this.searchTimer) clearInterval(this.searchTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private async rejoinNewRoom(newRoomId: string) {
    this.cleanupCurrentCall();
    this.rtcService.setRoomId(newRoomId);

    if (this.localVideo?.nativeElement && this.rtcService.localStream) {
      this.localVideo.nativeElement.srcObject = this.rtcService.localStream;
      this.localVideo.nativeElement.muted = true;
      this.localVideo.nativeElement.play().catch(() => {});
    }

    if (this.signalRService.isConnected()) {
      await this.signalRService.joinRoom(newRoomId);
    }
  }

  private cleanupCurrentCall() {
    this.remoteProfile = null;
    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = null;
    }
    if (this.roomId) this.signalRService.leaveRoom(this.roomId);
    this.rtcService.closeConnection();
  }

  // ============================================================
  // SIGNALR LISTENERS
  // ============================================================

  private listenToSignalREvents() {
    this.signalRSubscriptions.unsubscribe();
    this.signalRSubscriptions = new Subscription();

    this.signalRSubscriptions.add(
      this.signalRService.remoteUserJoined$.subscribe(async (userId) => {
        const remoteId = Number(userId);
        if (remoteId && remoteId !== this.currentUserId) {
          this.fetchRemoteUserProfile(remoteId);
          this.rtcService.setRemoteUserId(String(remoteId));
          await this.initLocalStream();
          this.rtcService.initiateOfferToUser(String(remoteId));
        }
      })
    );

    this.signalRSubscriptions.add(
      this.signalRService.remoteUserLeft$.subscribe(() => {
        this.remoteProfile = null;
        if (this.remoteVideo?.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = null;
        }
        this.rtcService.closeConnection();
        this.cdr.detectChanges();
      })
    );

    this.signalRSubscriptions.add(
      this.signalRService.receiveSignal$.subscribe(async ({ fromUserId, signalData }) => {
        if (Number(fromUserId) !== this.currentUserId) {
          if (!this.remoteProfile) {
            this.fetchRemoteUserProfile(Number(fromUserId));
          }
          this.rtcService.setRemoteUserId(fromUserId);
          await this.rtcService.handleSignal(signalData, fromUserId);
        }
      })
    );

    this.signalRSubscriptions.add(
      this.rtcService.remoteStream$.subscribe((stream) => {
        if (this.remoteVideo?.nativeElement) {
          this.remoteVideo.nativeElement.srcObject = stream;
          this.playVideo(this.remoteVideo.nativeElement);
        }
        this.isRemoteVideoActive = true;
        this.cdr.detectChanges();
      })
    );
  }

  public toggleAudio() {
    this.isMuted = !this.isMuted;
    this.rtcService.toggleAudio(!this.isMuted);
    this.cdr.detectChanges();
  }

  public toggleVideo() {
    this.isVideoOff = !this.isVideoOff;
    this.rtcService.toggleVideo(!this.isVideoOff);
    this.isLocalVideoActive = !this.isVideoOff;
    this.cdr.detectChanges();
  }

  public playVideo(el: HTMLVideoElement | null) {
    if (!el) return;
    const playPromise = el.play();
    if (playPromise !== undefined) {
      playPromise.catch((err) => {
        el.muted = true;
        el.play().then(() => {
          setTimeout(() => { el.muted = false; }, 300);
        }).catch(() => {
          const onUserClick = () => {
            el.play().catch(() => {});
            document.removeEventListener('click', onUserClick);
          };
          document.addEventListener('click', onUserClick, { once: true });
        });
      });
    }
  }

  public openRemoteProfileModal() {
    if (this.remoteProfile) this.isProfileModalOpen = true;
  }

  public closeRemoteProfileModal() {
    this.isProfileModalOpen = false;
  }

  public viewProfileInNewTab(userId?: number) {
    const id = userId || this.remoteProfile?.userId || this.remoteProfile?.id;
    if (id) window.open(`/profile/${id}`, '_blank');
  }

  public leaveCall() {
    this.stopNextMatchSearch();
    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/Matching/end/${this.sessionId}`, {}).subscribe();
      this.sessionId = null;
    }
    if (this.currentUserId) {
      this.updateSearchingStatus(this.currentUserId, false);
    }
    this.cleanupCurrentCall();
    this.rtcService.closeAll();
    this.router.navigate(['/dashboard']);
  }

  private loadUserMatchPreference() {
    const navState = this.router.getCurrentNavigation()?.extras.state as { matchPreference: MatchPreferenceDto };
    if (navState?.matchPreference) {
      this.userPreference = navState.matchPreference;
    } else {
      const stored = localStorage.getItem('userMatchPreference');
      if (stored) {
        try { this.userPreference = JSON.parse(stored); } catch { this.userPreference = this.getDefaultPreference(); }
      } else {
        this.userPreference = this.getDefaultPreference();
      }
    }
  }

  private getDefaultPreference(): MatchPreferenceDto {
    return {
      preferredProfessionId: 1,
      preferredSkillIds: [1],
      goal: 'Networking',
      matchType: 'random',
      isSearching: false
    };
  }

  ngOnDestroy() {
    this.stopNextMatchSearch();
    this.signalRSubscriptions.unsubscribe();
    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/Matching/end/${this.sessionId}`, {}).subscribe();
    }
    this.cleanupCurrentCall();
    this.rtcService.closeAll();
    this.signalRService.stopConnection();
  }
}