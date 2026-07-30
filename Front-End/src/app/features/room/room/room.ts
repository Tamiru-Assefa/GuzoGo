import { CommonModule } from '@angular/common';
import { Component, ElementRef, OnInit, OnDestroy, ViewChild, inject, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { HttpClient } from '@angular/common/http';
import { Subscription } from 'rxjs';
import { SignalRService } from '../../../core/services/signalr';
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
export class RoomComponent implements OnInit, OnDestroy {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;

  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private authService = inject(AuthService);
  private signalRService = inject(SignalRService);
  private cdr = inject(ChangeDetectorRef);
  private http = inject(HttpClient);

  // Profile data objects
  public localProfile: any = null;
  public remoteProfile: any = null;

  // Track active video state for template UI fallbacks
  public isLocalVideoActive = true;
  public isRemoteVideoActive = true;

  private readonly apiUrl = environment.apiUrl;

  private peerConnection!: RTCPeerConnection;
  private localStream!: MediaStream;
  private remoteStream!: MediaStream;
  private signalRSubscriptions: Subscription = new Subscription();

  public roomId: string = '';
  public sessionId: number | null = null;
  public currentUserId!: any;

  // Stored User Preference Payload
  private userPreference!: MatchPreferenceDto;

  // UI State Flags
  public isMuted = false;
  public isVideoOff = false;

  // Next Match Search & Polling States
  public isSearchingNextMatch = false;
  public searchTimeRemaining = 60;
  private searchTimer: any;
  private countdownTimer: any;

  private rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' },
    ],
  };

  async ngOnInit() {
    this.currentUserId = this.authService.getUserId();
    this.roomId = this.route.snapshot.queryParamMap.get('roomId') || '';

    const sessIdParam = this.route.snapshot.queryParamMap.get('sessionId');
    if (sessIdParam) {
      this.sessionId = Number(sessIdParam);
    }

    // Load local user profile for "You" preview tag if needed
    if (this.currentUserId) {
      this.fetchLocalUserProfile(this.currentUserId);
    }

    this.loadUserMatchPreference();

    await this.initLocalMedia();
    await this.signalRService.startConnection();

    if (this.roomId) {
      await this.signalRService.joinRoom(this.roomId);
    }

    this.listenToSignalREvents();
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
        this.cdr.detectChanges();
      },
      error: (err) => {
        console.error('Could not fetch remote user profile:', err);
        this.remoteProfile = {
          firstName: 'Peer',
          lastName: '',
          professionTitle: 'Member',
          country: 'Online',
        };
        this.cdr.detectChanges();
      },
    });
  }

  private loadUserMatchPreference() {
    const navState = this.router.getCurrentNavigation()?.extras.state as { matchPreference: MatchPreferenceDto };

    if (navState?.matchPreference) {
      this.userPreference = navState.matchPreference;
    } else {
      const stored = localStorage.getItem('userMatchPreference');
      if (stored) {
        try {
          this.userPreference = JSON.parse(stored);
        } catch {
          this.userPreference = this.getDefaultPreference();
        }
      } else {
        this.userPreference = this.getDefaultPreference();
      }
    }

    if (!this.userPreference.preferredProfessionId || this.userPreference.preferredProfessionId === 0) {
      this.userPreference.preferredProfessionId = 1;
    }
  }

  private getDefaultPreference(): MatchPreferenceDto {
    return {
      preferredProfessionId: 1,
      preferredSkillIds: [1],
      goal: 'Networking',
      matchType: 'random',
      isSearching: false,
    };
  }

  findNextMatch() {
    const currentUserId = this.authService.getUserId();
    if (!currentUserId) {
      this.router.navigate(['/login']);
      return;
    }

    if (this.isSearchingNextMatch) return;

    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/MatchSession/end/${this.sessionId}`, {}).subscribe({
        error: (err) => console.error('Failed to end previous session:', err),
      });
      this.sessionId = null;
    }

    this.isSearchingNextMatch = true;
    this.searchTimeRemaining = 60;

    this.cleanupCurrentCall();

    const searchPayload: MatchPreferenceDto = {
      ...this.userPreference,
      preferredProfessionId: this.userPreference.preferredProfessionId || 1,
      preferredSkillIds: this.userPreference.preferredSkillIds?.length ? this.userPreference.preferredSkillIds : [1],
      isSearching: true,
    };

    this.http.post(`${this.apiUrl}/MatchPreference/${currentUserId}`, searchPayload).subscribe({
      next: () => {
        this.pollForNextMatch(currentUserId);
      },
      error: (err) => {
        this.isSearchingNextMatch = false;
        console.error('Failed to start next match search:', err);
        alert('Failed to initiate search for next match.');
      },
    });
  }

  private pollForNextMatch(currentUserId: number) {
    const pollInterval = 5000;
    const maxAttempts = 12;
    let attemptCount = 0;

    this.stopNextMatchSearch();

    this.countdownTimer = setInterval(() => {
      this.searchTimeRemaining--;
      this.cdr.detectChanges();
    }, 1000);

    this.searchTimer = setInterval(() => {
      attemptCount++;

      this.http.post(`${this.apiUrl}/Matching/find/${currentUserId}`, {}).subscribe({
        next: (matchResponse: any) => {
          const newRoomId = matchResponse?.roomId || matchResponse?.matchedUserId || matchResponse?.id;
          const newSessionId = matchResponse?.sessionId;
          const matchedUserId = matchResponse?.matchedUserId;

          if (newRoomId && newRoomId !== this.roomId) {
            this.stopNextMatchSearch();

            if (newSessionId) {
              this.sessionId = newSessionId;
            }

            // If the matching endpoint directly returns matchedUserId, fetch immediately!
            if (matchedUserId) {
              this.fetchRemoteUserProfile(matchedUserId);
            }

            this.updateSearchingStatus(currentUserId, false);

            this.isSearchingNextMatch = false;
            this.roomId = newRoomId;

            const queryParams: any = { roomId: newRoomId };
            if (this.sessionId) {
              queryParams.sessionId = this.sessionId;
            }

            this.router.navigate([], {
              relativeTo: this.route,
              queryParams: queryParams,
              queryParamsHandling: 'merge',
            });

            this.rejoinNewRoom(newRoomId);
          }
        },
        error: (err) => {
          if (err.status === 404 && attemptCount < maxAttempts) {
            console.log(`Searching for next match... (${attemptCount}/${maxAttempts})`);
          } else if (attemptCount >= maxAttempts || err.status !== 404) {
            this.stopNextMatchSearch();
            this.isSearchingNextMatch = false;

            this.updateSearchingStatus(currentUserId, false);

            if (err.status === 404) {
              alert('No other online matches found right now.');
            }
            this.leaveCall();
          }
        },
      });
    }, pollInterval);
  }

  private updateSearchingStatus(userId: number, isSearching: boolean) {
    const payload: MatchPreferenceDto = {
      ...this.userPreference,
      preferredProfessionId: this.userPreference.preferredProfessionId || 1,
      preferredSkillIds: this.userPreference.preferredSkillIds?.length ? this.userPreference.preferredSkillIds : [1],
      isSearching: isSearching,
    };

    this.userPreference = payload;
    localStorage.setItem('userMatchPreference', JSON.stringify(payload));

    this.http.post(`${this.apiUrl}/MatchPreference/${userId}`, payload).subscribe({
      error: (err) => console.error('Failed to update searching status:', err),
    });
  }

  cancelNextMatchSearch() {
    this.stopNextMatchSearch();
    this.isSearchingNextMatch = false;
    if (this.currentUserId) {
      this.updateSearchingStatus(this.currentUserId, false);
    }
  }

  private stopNextMatchSearch() {
    if (this.searchTimer) clearInterval(this.searchTimer);
    if (this.countdownTimer) clearInterval(this.countdownTimer);
  }

  private async rejoinNewRoom(newRoomId: string) {
    this.cleanupCurrentCall();
    await this.initLocalMedia();

    if (this.signalRService.isConnected()) {
      await this.signalRService.joinRoom(newRoomId);
    }
  }

  private cleanupCurrentCall() {
    this.remoteProfile = null; // Clear old peer profile on call cleanup

    if (this.roomId) {
      this.signalRService.leaveRoom(this.roomId);
    }

    if (this.peerConnection) {
      this.peerConnection.close();
    }

    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    if (this.remoteStream) {
      this.remoteStream.getTracks().forEach((track) => track.stop());
    }
  }

  toggleAudio() {
    if (!this.localStream) return;
    const audioTracks = this.localStream.getAudioTracks();
    if (audioTracks.length > 0) {
      this.isMuted = !this.isMuted;
      audioTracks.forEach((track) => (track.enabled = !this.isMuted));
      this.cdr.detectChanges();
    }
  }

  toggleVideo() {
    if (!this.localStream) return;
    const videoTracks = this.localStream.getVideoTracks();
    if (videoTracks.length > 0) {
      this.isVideoOff = !this.isVideoOff;
      videoTracks.forEach((track) => (track.enabled = !this.isVideoOff));
      this.isLocalVideoActive = !this.isVideoOff;
      this.cdr.detectChanges();
    }
  }

  leaveCall() {
    this.stopNextMatchSearch();

    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/MatchSession/end/${this.sessionId}`, {}).subscribe({
        error: (err) => console.error('Failed to end match session on leave:', err),
      });
      this.sessionId = null;
    }

    if (this.currentUserId) {
      this.updateSearchingStatus(this.currentUserId, false);
    }

    this.cleanupCurrentCall();
    this.router.navigate(['/dashboard']);
  }

  private async initLocalMedia() {
    if (this.localStream) {
      this.localStream.getTracks().forEach((track) => track.stop());
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch (err) {
      console.warn('Camera/mic access unavailable on this instance:', err);
      this.localStream = new MediaStream();
    }

    if (this.localVideo?.nativeElement) {
      this.localVideo.nativeElement.srcObject = this.localStream;
    }
    this.cdr.detectChanges();
  }

  private createPeerConnection() {
    this.peerConnection = new RTCPeerConnection(this.rtcConfig);
    this.remoteStream = new MediaStream();

    if (this.remoteVideo?.nativeElement) {
      this.remoteVideo.nativeElement.srcObject = this.remoteStream;
    }

    const activeVideoTracks = this.localStream
      ? this.localStream.getVideoTracks().filter((t) => t.readyState === 'live')
      : [];
    const activeAudioTracks = this.localStream
      ? this.localStream.getAudioTracks().filter((t) => t.readyState === 'live')
      : [];

    if (activeVideoTracks.length > 0) {
      this.peerConnection.addTrack(activeVideoTracks[0], this.localStream);
    } else {
      this.peerConnection.addTransceiver('video', { direction: 'recvonly' });
    }

    if (activeAudioTracks.length > 0) {
      this.peerConnection.addTrack(activeAudioTracks[0], this.localStream);
    } else {
      this.peerConnection.addTransceiver('audio', { direction: 'recvonly' });
    }

    this.peerConnection.ontrack = (event) => {
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        this.remoteStream.addTrack(event.track);
      }

      if (this.remoteVideo?.nativeElement) {
        this.remoteVideo.nativeElement.srcObject = this.remoteStream;
      }

      const videoTrack = this.remoteStream.getVideoTracks()[0];
      if (videoTrack) {
        this.isRemoteVideoActive = videoTrack.enabled && videoTrack.readyState === 'live';

        videoTrack.onmute = () => {
          this.isRemoteVideoActive = false;
          this.cdr.detectChanges();
        };
        videoTrack.onunmute = () => {
          this.isRemoteVideoActive = true;
          this.cdr.detectChanges();
        };
      } else {
        this.isRemoteVideoActive = false;
      }

      this.cdr.detectChanges();
    };

    this.peerConnection.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalRService.sendSignal(
          this.roomId,
          'ice-candidate',
          JSON.stringify({ candidate: event.candidate, senderId: this.currentUserId })
        );
      }
    };
  }

  private listenToSignalREvents() {
  this.signalRSubscriptions.unsubscribe();
  this.signalRSubscriptions = new Subscription();

  // Event 1: When a remote user joins the SignalR room
  this.signalRSubscriptions.add(
    this.signalRService.remoteUserJoined$.subscribe(async (userId) => {
      if (userId) {
        const remoteId = Number(userId);
        if (remoteId && remoteId !== this.currentUserId) {
          this.fetchRemoteUserProfile(remoteId);
        }

        this.createPeerConnection();
        const offer = await this.peerConnection.createOffer();
        await this.peerConnection.setLocalDescription(offer);

        const signalPayload = {
          sdp: offer,
          senderId: this.currentUserId,
        };
        await this.signalRService.sendSignal(this.roomId, 'offer', JSON.stringify(signalPayload));
      }
    })
  );

  // Event 2: Receiving WebRTC signals
  this.signalRSubscriptions.add(
    this.signalRService.receiveSignal$.subscribe(async (signal) => {
      if (!signal?.data) return;

      let parsedData: any;
      try {
        parsedData = JSON.parse(signal.data);
      } catch {
        parsedData = signal.data;
      }

      // FIX: Access senderId safely without TS compilation errors
      const senderId = parsedData?.senderId || (signal as any).senderId;
      if (senderId && Number(senderId) !== Number(this.currentUserId)) {
        this.fetchRemoteUserProfile(Number(senderId));
      }

      const sdp = parsedData?.sdp || parsedData;

      switch (signal.signalType) {
        case 'offer':
          this.createPeerConnection();
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
          const answer = await this.peerConnection.createAnswer();
          await this.peerConnection.setLocalDescription(answer);

          const answerPayload = {
            sdp: answer,
            senderId: this.currentUserId,
          };
          await this.signalRService.sendSignal(this.roomId, 'answer', JSON.stringify(answerPayload));
          break;

        case 'answer':
          await this.peerConnection.setRemoteDescription(new RTCSessionDescription(sdp));
          break;

        case 'ice-candidate':
          const candidateObj = parsedData?.candidate || parsedData;
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidateObj));
          break;
      }
    })
  );
}

  ngOnDestroy() {
    this.stopNextMatchSearch();
    this.signalRSubscriptions.unsubscribe();

    if (this.sessionId) {
      this.http.post(`${this.apiUrl}/MatchSession/end/${this.sessionId}`, {}).subscribe();
    }

    this.cleanupCurrentCall();
    this.signalRService.stopConnection();
  }
}