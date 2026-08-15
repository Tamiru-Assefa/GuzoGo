import {
  Component,
  OnInit,
  OnDestroy,
  NgZone,
  ChangeDetectorRef,
  Directive,
  ElementRef,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SpacesService } from '../../services/spaces';
import { SignalRService } from '../../../../core/services/signalr';
import { RtcService } from '../../../../core/services/rtc';
import { ProfileService } from '../../../../core/services/profile';

/**
 * Bulletproof directive for attaching MediaStream to <video> and <audio> elements.
 * Fixes black screens on iOS, Safari, Chrome & Firefox.
 */
@Directive({
  selector: '[appVideoStream]',
  standalone: true
})
export class VideoStreamDirective implements OnChanges {
  @Input('appVideoStream') stream: MediaStream | null | undefined = null;
  @Input() isMuted: boolean = false;

  constructor(private el: ElementRef<HTMLVideoElement | HTMLAudioElement>) {}

  ngOnChanges(changes: SimpleChanges): void {
    const mediaEl = this.el.nativeElement;
    mediaEl.muted = this.isMuted;
    
    if (mediaEl instanceof HTMLVideoElement) {
      mediaEl.playsInline = true;
      mediaEl.autoplay = true;
    }

    if (this.stream) {
      if (mediaEl.srcObject !== this.stream) {
        mediaEl.srcObject = this.stream;
      }
      mediaEl.play().catch(() => {});
    } else {
      mediaEl.srcObject = null;
    }
  }
}

export interface Participant {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  isVideoOn: boolean;
  isMuted: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream | null;
}

export interface ChatMessage {
  id?: number;
  senderFullName?: string;
  senderUserId?: string | number;
  content: string;
  sentAt: string | Date;
  isSystem?: boolean;
}

@Component({
  selector: 'app-room-detail',
  standalone: true,
  imports: [CommonModule, FormsModule, VideoStreamDirective],
  templateUrl: './room-detail.html',
  styleUrls: ['./room-detail.scss']
})
export class RoomDetailComponent implements OnInit, OnDestroy {
  private subscriptions: Subscription[] = [];

  public roomId!: number;
  public room: any = null;
  public participants: Participant[] = [];
  public messages: ChatMessage[] = [];
  public newMessageText = '';

  public currentUserId = Number(localStorage.getItem('userId') || '0');
  public isMuted = false;
  public isVideoOn = false;
  public isScreenSharing = false;
  public isHandRaised = false;
  public isChatOpen = true;
  public isMediaReady = false;
  public isHost = false;
  public isMutedByHost = false;
  public isKicked = false;
  public kickedMessage = '';

  public needsPassword = false;
  public passwordInput = '';
  public passwordError = '';
  public isVerifyingPassword = false;

  public showShareModal = false;
  public shareLink = '';

  constructor(
    private route: ActivatedRoute,
    public router: Router,
    private spacesService: SpacesService,
    private signalRService: SignalRService,
    public rtcService: RtcService,
    private cdr: ChangeDetectorRef,
    private ngZone: NgZone,
    private profileService: ProfileService
  ) {}

  async ngOnInit(): Promise<void> {
    this.roomId = Number(this.route.snapshot.paramMap.get('id'));
    if (!this.roomId) return;

    this.currentUserId = Number(localStorage.getItem('userId') || '0');
    this.rtcService.setCurrentUser(this.currentUserId);

    await this.initRoom();
  }

  private async initRoom(): Promise<void> {
    try {
      this.participants = [];
      this.messages = [];
      this.isMediaReady = false;
      this.isVideoOn = true;
      this.isMuted = false;
      this.isScreenSharing = false;
      this.isHandRaised = false;
      this.needsPassword = false;

      await this.loadRoomData();

      if (this.room && !this.room.isPublic) {
        const isParticipant = this.room.participants?.some(
          (p: any) => p.userId === this.currentUserId
        );
        if (!isParticipant) {
          this.room = null;
          this.participants = [];
          this.needsPassword = true;
          this.cdr.detectChanges();
          return;
        }
      }

      await this.continueInit();
    } catch (error) {
      console.error('Failed to initialize room:', error);
    }
    this.shareLink = `${window.location.origin}/spaces/${this.roomId}`;
  }

  private async continueInit(): Promise<void> {
    // 1. Initialize local media (camera/mic) FIRST
    await this.startLocalMedia();

    // 2. Setup WebRTC signaling listeners
    this.initWebRTC();

    // 3. Connect to SignalR and Join Space
    await this.initSignalR();

    this.loadChatMessages();
    this.loadProfilePictures();
  }

  private async startLocalMedia(): Promise<void> {
    try {
      const stream = await this.rtcService.getLocalStream();
      this.isVideoOn = true;
      this.isMuted = false;
      this.isMediaReady = true;

      let me = this.participants.find(p => p.userId === this.currentUserId);
      if (!me) {
        me = {
          userId: this.currentUserId,
          fullName: 'You',
          isVideoOn: true,
          isMuted: false,
          isScreenSharing: false,
          isHandRaised: false,
          stream: stream
        };
        this.participants.push(me);
      } else {
        me.stream = stream;
        me.isVideoOn = true;
        me.isMuted = false;
      }

      this.participants = [...this.participants];
      this.syncMediaStateToBackend();
      this.cdr.detectChanges();
    } catch (error) {
      console.error('Local media access error:', error);
      this.isVideoOn = false;
      this.isMuted = true;
      this.isMediaReady = false;
    }
  }

  private initWebRTC(): void {
    this.rtcService.initSignalListeners(this.roomId);

    // When remote stream arrives / updates
    this.subscriptions.push(
      this.rtcService.remoteStream$.subscribe(({ userId, stream }) => {
        this.ngZone.run(() => {
          const participant = this.participants.find(p => p.userId === Number(userId));
          if (participant) {
            participant.stream = stream;
            this.participants = [...this.participants];
            this.cdr.detectChanges();
          }
        });
      })
    );

    // When remote user leaves / disconnects
    this.subscriptions.push(
      this.rtcService.remoteDisconnected$.subscribe(userId => {
        this.ngZone.run(() => {
          const participant = this.participants.find(p => p.userId === Number(userId));
          if (participant) {
            participant.stream = null;
            this.participants = [...this.participants];
            this.cdr.detectChanges();
          }
        });
      })
    );
  }

  private async initSignalR(): Promise<void> {
    if (!this.signalRService.isConnected()) {
      await this.signalRService.startConnection();
    }

    // Join room: backend returns existing active user IDs
    const existingUsers: string[] = await this.signalRService.joinRoom(this.roomId);

    // Deterministic Offerer Rule:
    // AS THE NEW JOINER, WE initiate WebRTC offers to all existing users in the room
    if (existingUsers && Array.isArray(existingUsers)) {
      for (const userId of existingUsers) {
        if (Number(userId) !== this.currentUserId) {
          await this.rtcService.initiateOfferToUser(userId);
        }
      }
    }

    // When someone joins AFTER us:
    // We only update room list and WAIT for their offer. We DO NOT send an offer to them.
    this.subscriptions.push(
      this.signalRService.remoteUserJoined$.subscribe(userId => {
        this.ngZone.run(() => {
          this.onUserJoined(Number(userId));
        });
      })
    );

    // Remote user left
    this.subscriptions.push(
      this.signalRService.remoteUserLeft$.subscribe(userId => {
        this.ngZone.run(() => {
          this.onUserLeft(Number(userId));
        });
      })
    );

    // Chat messages
    this.subscriptions.push(
      this.signalRService.receiveMessage$.subscribe(msg => {
        this.ngZone.run(() => {
          this.handleIncomingMessage(msg);
        });
      })
    );

    // Media states (Mute, Video, Hand Raise)
    this.subscriptions.push(
      this.signalRService.spaceStateUpdated$.subscribe(update => {
        this.ngZone.run(() => {
          this.onRemoteStateUpdate(update.userId, update.mediaState);
        });
      })
    );
  }

  private async onUserJoined(userId: number): Promise<void> {
    if (userId === this.currentUserId) return;

    this.messages = [
      ...this.messages,
      {
        content: `Participant joined the space`,
        sentAt: new Date(),
        isSystem: true
      }
    ];

    await this.loadRoomData();
    this.loadProfilePictures();
    this.cdr.detectChanges();
  }

  private onUserLeft(userId: number): void {
    this.participants = this.participants.filter(p => p.userId !== userId);
    this.rtcService.closeConnection(userId.toString());

    this.messages = [
      ...this.messages,
      {
        content: `Participant left the space`,
        sentAt: new Date(),
        isSystem: true
      }
    ];
    this.cdr.detectChanges();
  }

  private onRemoteStateUpdate(userId: number, mediaState: any): void {
    const p = this.participants.find(part => part.userId === userId);
    if (p) {
      if (mediaState.isMuted !== undefined) p.isMuted = mediaState.isMuted;
      if (mediaState.isVideoOn !== undefined) p.isVideoOn = mediaState.isVideoOn;
      if (mediaState.isScreenSharing !== undefined) p.isScreenSharing = mediaState.isScreenSharing;
      if (mediaState.isHandRaised !== undefined) p.isHandRaised = mediaState.isHandRaised;

      this.participants = [...this.participants];
      this.cdr.detectChanges();
    }
  }

  private handleIncomingMessage(msg: any): void {
    const content = msg.content || '';
    if (typeof content === 'string' && content.startsWith('{') && content.includes('"action"')) {
      try {
        const cmd = JSON.parse(content);
        if (cmd.action === 'hostForceMute' && Number(cmd.targetUserId) === this.currentUserId) {
          this.isMutedByHost = cmd.muted;
          this.isMuted = cmd.muted;
          this.rtcService.toggleAudioTrack(!cmd.muted);
          const me = this.participants.find(p => p.userId === this.currentUserId);
          if (me) me.isMuted = cmd.muted;
          this.syncMediaStateToBackend();
          return;
        }
        if (cmd.action === 'kick' && Number(cmd.userId) === this.currentUserId) {
          this.isKicked = true;
          this.kickedMessage = 'You have been removed from the room by the host.';
          this.leaveRoom();
          return;
        }
      } catch (e) {}
    }

    this.messages = [...this.messages, msg];
    this.cdr.detectChanges();
  }

  private async loadRoomData(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.spacesService.getRoomById(this.roomId).subscribe({
        next: (data) => {
          this.ngZone.run(() => {
            this.room = data;
            if (!this.needsPassword) {
              this.participants = (data.participants || []).map((p: any) => {
                const existing = this.participants.find(e => e.userId === p.userId);
                return {
                  ...p,
                  stream: existing?.stream || (p.userId === this.currentUserId ? this.rtcService.localStream : null),
                  profilePictureUrl: p.profilePictureUrl || existing?.profilePictureUrl || ''
                };
              });

              this.isHost = data.hostUserId === this.currentUserId;
              const me = this.participants.find(p => p.userId === this.currentUserId);
              if (me) {
                this.isMuted = me.isMuted;
                this.isVideoOn = me.isVideoOn;
                this.isScreenSharing = me.isScreenSharing;
                this.isHandRaised = me.isHandRaised;
              }
            }
            this.cdr.detectChanges();
            resolve();
          });
        },
        error: (err) => reject(err)
      });
    });
  }

  public loadChatMessages(): void {
    this.spacesService.getRoomMessages(this.roomId).subscribe({
      next: (msgs) => {
        this.messages = msgs;
        this.cdr.detectChanges();
      },
      error: (err) => console.error('Error fetching chat messages', err)
    });
  }

  private loadProfilePictures(): void {
    this.participants.forEach(participant => {
      if (!participant.profilePictureUrl || participant.profilePictureUrl.includes('ui-avatars.com/api')) {
        this.profileService.getProfile(participant.userId).subscribe({
          next: (profile) => {
            if (profile?.profilePictureUrl && profile.profilePictureUrl !== participant.profilePictureUrl) {
              participant.profilePictureUrl = profile.profilePictureUrl;
              this.participants = [...this.participants];
              this.cdr.detectChanges();
            }
          },
          error: () => {}
        });
      }
    });
  }

  // ---------- Media Control Actions ----------
  public toggleMute(): void {
    if (this.isMutedByHost) return;
    this.isMuted = !this.isMuted;
    this.rtcService.toggleAudioTrack(!this.isMuted);
    this.updateLocalParticipantState();
    this.syncMediaStateToBackend();
  }

  public toggleVideo(): void {
    this.isVideoOn = !this.isVideoOn;
    this.rtcService.toggleVideoTrack(this.isVideoOn);
    this.updateLocalParticipantState();
    this.syncMediaStateToBackend();
  }

  public async toggleScreenShare(): Promise<void> {
    if (this.isScreenSharing) {
      this.rtcService.stopScreenShare();
      this.isScreenSharing = false;
    } else {
      try {
        await this.rtcService.startScreenShare();
        this.isScreenSharing = true;
      } catch {
        return;
      }
    }
    this.updateLocalParticipantState();
    this.syncMediaStateToBackend();
  }

  public toggleHandRaise(): void {
    this.isHandRaised = !this.isHandRaised;
    this.updateLocalParticipantState();
    this.syncMediaStateToBackend();
  }

  private updateLocalParticipantState(): void {
    const me = this.participants.find(p => p.userId === this.currentUserId);
    if (me) {
      me.isMuted = this.isMuted;
      me.isVideoOn = this.isVideoOn;
      me.isScreenSharing = this.isScreenSharing;
      me.isHandRaised = this.isHandRaised;
      this.participants = [...this.participants];
      this.cdr.detectChanges();
    }
  }

  private syncMediaStateToBackend(): void {
    const payload = {
      isMuted: this.isMuted,
      isVideoOn: this.isVideoOn,
      isScreenSharing: this.isScreenSharing,
      isHandRaised: this.isHandRaised
    };

    this.spacesService.toggleMedia(this.roomId, payload).subscribe({
      next: () => this.signalRService.toggleMediaState(this.roomId, payload),
      error: (err) => console.error('Error syncing media state:', err)
    });
  }

  public sendMessage(): void {
    if (!this.newMessageText.trim()) return;
    const text = this.newMessageText.trim();
    this.newMessageText = '';

    this.spacesService.sendMessage(this.roomId, text).subscribe({
      next: () => this.signalRService.sendMessage(this.roomId, text),
      error: (err) => console.error('Error sending message:', err)
    });
  }

  public leaveRoom(): void {
    this.rtcService.closeAllConnections();
    this.signalRService.leaveRoom(this.roomId);
    this.spacesService.leaveRoom(this.roomId).subscribe({
      next: () => this.router.navigate(['/spaces']),
      error: () => this.router.navigate(['/spaces'])
    });
  }

  public submitRoomPassword(): void {
    if (!this.passwordInput.trim()) {
      this.passwordError = 'Please enter the room password.';
      return;
    }

    this.isVerifyingPassword = true;
    this.passwordError = '';

    this.spacesService.joinRoom(this.roomId, this.passwordInput).subscribe({
      next: (success) => {
        this.isVerifyingPassword = false;
        if (success) {
          this.needsPassword = false;
          this.passwordInput = '';
          this.loadRoomData().then(() => this.continueInit());
        } else {
          this.passwordError = 'Incorrect password or room is full.';
        }
      },
      error: () => {
        this.isVerifyingPassword = false;
        this.passwordError = 'Failed to verify. Please try again.';
      }
    });
  }

  public onPasswordKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      this.submitRoomPassword();
    }
  }

  public cancelPasswordPrompt(): void {
    this.router.navigate(['/spaces']);
  }

  public getUserLabel(p: Participant): string {
    return p.userId === this.currentUserId ? `${p.fullName} (You)` : p.fullName;
  }

  public isAnyoneScreenSharing(): boolean {
    return this.participants.some(p => p.isScreenSharing);
  }

  public get sortedParticipants(): Participant[] {
    return [...this.participants].sort((a, b) => {
      if (a.isScreenSharing && !b.isScreenSharing) return -1;
      if (!a.isScreenSharing && b.isScreenSharing) return 1;
      return 0;
    });
  }

  public trackByUserId(index: number, p: Participant): number {
    return p.userId;
  }

  public trackByMessageId(index: number, m: ChatMessage): number {
    return m.id || index;
  }

  public copyRoomLink(): void {
    navigator.clipboard.writeText(this.shareLink);
  }

  public openShareModal(): void {
    this.showShareModal = true;
  }

  public closeShareModal(): void {
    this.showShareModal = false;
  }

  public viewProfile(userId: number): void {
    if (userId) {
      window.open(`/profile/${userId}`, '_blank');
    }
  }

  public encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  public muteUser(targetUserId: number, mute: boolean): void {
    if (!this.isHost) return;
    this.spacesService.muteParticipant(this.roomId, targetUserId, mute).subscribe({
      next: () => {
        const p = this.participants.find(item => item.userId === targetUserId);
        if (p) p.isMuted = mute;
        this.signalRService.sendMessage(
          this.roomId,
          JSON.stringify({ action: 'hostForceMute', targetUserId, muted: mute })
        );
      }
    });
  }

  public kickUser(targetUserId: number): void {
    if (!this.isHost) return;
    if (confirm('Kick this user from the space?')) {
      this.spacesService.kickParticipant(this.roomId, targetUserId).subscribe({
        next: () => {
          this.participants = this.participants.filter(p => p.userId !== targetUserId);
          this.rtcService.closeConnection(targetUserId.toString());
          this.signalRService.sendMessage(
            this.roomId,
            JSON.stringify({ action: 'kick', userId: targetUserId })
          );
        }
      });
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.forEach(s => s.unsubscribe());
    this.subscriptions = [];
    this.rtcService.closeAllConnections();
    this.signalRService.leaveRoom(this.roomId);
  }
}