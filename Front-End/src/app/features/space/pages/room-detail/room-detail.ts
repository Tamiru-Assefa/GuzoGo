// features/space/pages/room-detail/room-detail.component.ts

import { Component, OnInit, OnDestroy, NgZone, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { SpacesService } from '../../services/spaces';
import { SignalRService, SpaceStateUpdate } from '../../../../core/services/signalr';
import { RtcService } from '../../../../core/services/rtc';
import { Subscription } from 'rxjs';
import { ViewChildren, QueryList, ElementRef, AfterViewInit } from '@angular/core';
import { ProfileService } from '../../../../core/services/profile';

interface Participant {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  isVideoOn: boolean;
  isMuted: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
  stream?: MediaStream;
}

interface ChatMessage {
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
  imports: [CommonModule, FormsModule],
  templateUrl: './room-detail.html',
  styleUrls: ['./room-detail.scss']
})
export class RoomDetailComponent implements OnInit, OnDestroy {
  @ViewChildren('videoPlayer') videoPlayers!: QueryList<ElementRef<HTMLVideoElement>>;
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

  // Always get fresh userId from localStorage
  this.currentUserId = Number(localStorage.getItem('userId') || '0');
  console.log('🆔 Current User ID:', this.currentUserId);

  await this.initRoom();
}

 private async initRoom(): Promise<void> {
  try {
    console.log('🚀 initRoom STARTED for room:', this.roomId);
    
    // Reset state
    this.participants = [];
    this.messages = [];
    this.isMediaReady = false;
    this.isVideoOn = false;
    this.isMuted = true;
    this.isScreenSharing = false;
    this.isHandRaised = false;
    this.needsPassword = false; // Reset
    
    // 1. Load room data
    await this.loadRoomData();
    
    // 2. Check if room exists and is private
    if (this.room && !this.room.isPublic) {
      const isParticipant = this.room.participants?.some(
        (p: any) => p.userId === this.currentUserId
      );
      
      if (!isParticipant) {
        console.log('🔒 Room is private, showing password prompt');
        // Clear room data to prevent leaking info
        this.room = null;
        this.participants = [];
        this.needsPassword = true;
        this.cdr.detectChanges();
        return;
      }
    }
    
    // 3. Continue if public or already a participant
    await this.continueInit();
    
  } catch (error) {
    console.error('❌ FAILED to initialize room:', error);
  }
  this.shareLink = `${window.location.origin}/spaces/${this.roomId}`;
}

  private async continueInit(): Promise<void> {
  console.log('🔌 Connecting SignalR...');
  await this.initSignalR();
  
  console.log('🎥 Starting local media...');
  await this.startLocalMedia();
  
  console.log('🔗 Setting up WebRTC...');
  this.initWebRTC();
  
  this.loadChatMessages();
  
  const others = this.participants.filter(p => p.userId !== this.currentUserId);
  console.log(`👥 Creating peer connections for ${others.length} other participants`);
  others.forEach(p => {
    this.rtcService.createOffer(
      this.roomId,
      p.userId.toString(),
      (userId, stream) => this.onRemoteStream(userId, stream)
    );
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
        // Reload room data to get updated participants
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

  public encodeValue(value: string): string {
    return encodeURIComponent(value);
  }

  /** Start camera & microphone */
  private async startLocalMedia(): Promise<void> {
  try {
    console.log('📹 Requesting getUserMedia...');
    const stream = await this.rtcService.getLocalStream();
    console.log('✅ Got local stream, tracks:', stream.getTracks().length);
    
    this.isVideoOn = true;
    this.isMuted = false;
    this.isMediaReady = true;

    // Find or wait for current user in participants
    let me = this.participants.find(p => p.userId === this.currentUserId);
      if (!me) {
  console.warn('⚠️ Current user not in participants, adding manually');
  me = {
    userId: this.currentUserId,
    fullName: 'You',
    profilePictureUrl: undefined,  // Will be filled by loadProfilePictures
    isVideoOn: true,
    isMuted: false,
    isScreenSharing: false,
    isHandRaised: false,
    isSpeaking: false,
    stream: stream
  };
  this.participants.push(me); // Add to END instead of unshift
  // Fetch profile picture for self
  this.loadProfilePictures();
}
     else {
      console.log('👤 Setting stream on participant:', me.fullName);
      me.stream = stream;
      me.isVideoOn = true;
      me.isMuted = false;
    }

    // Force Angular change detection
    this.participants = [...this.participants];

    this.syncMediaStateToBackend();
    console.log('✅ Camera and microphone ready');

  } catch (error) {
    console.error('❌ Camera/mic error:', error);
    this.isVideoOn = false;
    this.isMuted = true;
    this.isMediaReady = false;
  }
}

  ngAfterViewInit(): void {
  // Watch for video element changes
  this.videoPlayers.changes.subscribe((elements) => {
    elements.forEach((el: ElementRef<HTMLVideoElement>) => {
      const participant = this.participants.find(p => p.stream);
      if (participant?.stream && el.nativeElement.srcObject !== participant.stream) {
        el.nativeElement.srcObject = participant.stream;
        console.log('📹 Manually bound stream to video element');
      }
    });
  });
}

  /** Connect SignalR */
  private async initSignalR(): Promise<void> {
  if (!this.signalRService.isConnected()) {
    await this.signalRService.startConnection();
  }
  await this.signalRService.joinRoom(this.roomId);

  // User joined
  this.subscriptions.push(
    this.signalRService.remoteUserJoined$.subscribe(userId => {
      this.ngZone.run(() => {
        this.onUserJoined(Number(userId));
        this.cdr.detectChanges();
      });
    })
  );

  // User left
  this.subscriptions.push(
    this.signalRService.remoteUserLeft$.subscribe(userId => {
      this.ngZone.run(() => {
        this.onUserLeft(Number(userId));
        this.cdr.detectChanges();
      });
    })
  );

  // Messages
  this.subscriptions.push(
    this.signalRService.receiveMessage$.subscribe(msg => {
      this.ngZone.run(() => {
        this.handleIncomingMessage(msg);
        this.cdr.detectChanges();
      });
    })
  );

  // State updates
  this.subscriptions.push(
    this.signalRService.spaceStateUpdated$.subscribe(update => {
      this.ngZone.run(() => {
        this.onRemoteStateUpdate(update.userId, update.mediaState);
        this.cdr.detectChanges();
      });
    })
  );
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
        this.participants = [...this.participants];
        this.syncMediaStateToBackend();
        return;
      }
      
      if (cmd.action === 'hostForceMute') {
        const p = this.participants.find(p => p.userId === Number(cmd.targetUserId));
        if (p) p.isMuted = cmd.muted;
        this.participants = [...this.participants];
        return;
      }
      
      if (cmd.action === 'kick' && Number(cmd.userId) === this.currentUserId) {
        this.isKicked = true;
        this.kickedMessage = 'You have been removed from the room.';
        this.rtcService.closeAllConnections();
        this.signalRService.leaveRoom(this.roomId);
        return;
      }
      
      if (cmd.action === 'kick') {
        this.participants = this.participants.filter(p => p.userId !== Number(cmd.userId));
        this.rtcService.closeConnection(String(cmd.userId));
        return;
      }
      
    } catch (e) {}
  }
  
  // Regular message
  this.messages = [...this.messages, msg];
}

  /** Setup WebRTC listeners */
  private initWebRTC(): void {
    this.rtcService.initSignalListeners(
      this.roomId,
      (userId, stream) => this.onRemoteStream(userId, stream)
    );
  }

  /** Handle remote stream from WebRTC */
  private onRemoteStream(userId: string, stream: MediaStream): void {
    const participant = this.participants.find(p => p.userId === Number(userId));
    if (participant) {
      participant.stream = stream;
    }
  }

  /** User joined the room */
  private async onUserJoined(userId: number): Promise<void> {
  this.messages = [...this.messages, {
    content: `User joined the room`,
    sentAt: new Date(),
    isSystem: true
  }];
  
  await this.loadRoomData();
  
  if (userId !== this.currentUserId) {
    this.rtcService.createOffer(
      this.roomId,
      userId.toString(),
      (uid, stream) => this.ngZone.run(() => this.onRemoteStream(uid, stream))
    );
  }
  
  this.cdr.detectChanges();
}

  /** User left the room */
 private onUserLeft(userId: number): void {
  this.participants = this.participants.filter(p => p.userId !== userId);
  this.rtcService.closeConnection(userId.toString());
  
  this.messages = [...this.messages, {
    content: `User left the room`,
    sentAt: new Date(),
    isSystem: true
  }];
}

  public get localStream(): MediaStream | null {
  return this.rtcService.localStream;
}

  /** Remote user changed media state */
private onRemoteStateUpdate(userId: number, mediaState: any): void {
  console.log('🔄 onRemoteStateUpdate - userId:', userId, 'mediaState:', mediaState);
  
  const p = this.participants.find(part => part.userId === userId);
  if (p) {
    console.log('👤 Found participant:', p.fullName);
    console.log('  Before:', { muted: p.isMuted, video: p.isVideoOn, hand: p.isHandRaised });
    
    if (mediaState.isMuted !== undefined) p.isMuted = mediaState.isMuted;
    if (mediaState.isVideoOn !== undefined) p.isVideoOn = mediaState.isVideoOn;
    if (mediaState.isScreenSharing !== undefined) p.isScreenSharing = mediaState.isScreenSharing;
    if (mediaState.isHandRaised !== undefined) p.isHandRaised = mediaState.isHandRaised;
    
    console.log('  After:', { muted: p.isMuted, video: p.isVideoOn, hand: p.isHandRaised });
    
    // Force Angular to update
    this.participants = [...this.participants];
    this.cdr.detectChanges();
  } else {
    console.warn('⚠️ Participant not found for userId:', userId);
  }
}

  public onVideoPlaying(userId: number): void {
  console.log(`✅ Video playing for user ${userId}`);
}

  /** Load room from API */
 private async loadRoomData(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.spacesService.getRoomById(this.roomId).subscribe({
      next: (data) => {
        this.ngZone.run(() => {
          this.room = data;
          
          // Only set up participants if not waiting for password
          if (!this.needsPassword) {
            this.participants = (data.participants || []).map((p: any) => {
              const existing = this.participants.find(existing => existing.userId === p.userId);
              return {
                ...p,
                stream: existing?.stream || null,
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

  /** Load chat messages */
  public loadChatMessages(): void {
    this.spacesService.getRoomMessages(this.roomId).subscribe({
      next: (msgs) => (this.messages = msgs),
      error: (err) => console.error('Error fetching messages', err)
    });
  }

  // ==========================================
  // MEDIA CONTROLS (using RtcService)
  // ==========================================

  // In room-detail.component.ts

public toggleMute(): void {
  if (this.isMutedByHost) {
    console.warn('🔒 Cannot unmute - muted by host');
    return;
  }
  
  this.isMuted = !this.isMuted;
  this.rtcService.toggleAudioTrack(!this.isMuted);
  this.updateLocalParticipantState();
  this.syncMediaStateToBackend(); // This now broadcasts via SignalR
}


  public toggleVideo(): void {
  this.isVideoOn = !this.isVideoOn;
  this.rtcService.toggleVideoTrack(this.isVideoOn);
  this.updateLocalParticipantState();
  this.syncMediaStateToBackend(); // This now broadcasts via SignalR
}

  public async toggleScreenShare(): Promise<void> {
  if (this.isScreenSharing) {
    this.rtcService.stopScreenShare();
    this.isScreenSharing = false;
  } else {
    try {
      await this.rtcService.startScreenShare();
      this.isScreenSharing = true;
    } catch (error) {
      console.error('Screen share failed:', error);
      return;
    }
  }
  this.updateLocalParticipantState();
  this.syncMediaStateToBackend(); // This now broadcasts via SignalR
}

  public toggleHandRaise(): void {
  this.isHandRaised = !this.isHandRaised;
  this.updateLocalParticipantState();
  this.syncMediaStateToBackend(); // This now broadcasts via SignalR
}

  // ==========================================
  // HELPERS
  // ==========================================

  private updateLocalParticipantState(): void {
    const me = this.participants.find(p => p.userId === this.currentUserId);
    if (me) {
      me.isMuted = this.isMuted;
      me.isVideoOn = this.isVideoOn;
      me.isScreenSharing = this.isScreenSharing;
      me.isHandRaised = this.isHandRaised;
    }
  }

  private syncMediaStateToBackend(): void {
  const payload = {
    isMuted: this.isMuted,
    isVideoOn: this.isVideoOn,
    isScreenSharing: this.isScreenSharing,
    isHandRaised: this.isHandRaised
  };

  // 1. Persist to DB via REST API
  this.spacesService.toggleMedia(this.roomId, payload).subscribe({
    next: () => {
      // 2. Broadcast to all participants via SignalR
      this.signalRService.toggleMediaState(this.roomId, payload);
      console.log('📤 Media state broadcasted:', payload);
    },
    error: (err) => console.error('Error syncing media state:', err)
  });
}

private loadProfilePictures(): void {
  console.log('🖼️ Fetching profile pictures for', this.participants.length, 'participants');
  
  this.participants.forEach(participant => {
    const shouldFetchPicture = !participant.profilePictureUrl || participant.profilePictureUrl.includes('ui-avatars.com/api');
    console.log('  Fetching profile for userId:', participant.userId, 'current picture:', participant.profilePictureUrl, 'shouldFetch:', shouldFetchPicture);
    
    if (shouldFetchPicture) {
      this.profileService.getProfile(participant.userId).subscribe({
        next: (profile) => {
          console.log('  ✅ Got profile for', participant.userId, 'picture:', profile.profilePictureUrl?.substring(0, 50) + '...');
          if (profile.profilePictureUrl && profile.profilePictureUrl !== participant.profilePictureUrl) {
            participant.profilePictureUrl = profile.profilePictureUrl;
            this.participants = [...this.participants];
            this.cdr.detectChanges();
          }
        },
        error: (err) => {
          console.log('  ❌ Failed for userId:', participant.userId, err);
        }
      });
    }
  });
}

  public sendMessage(): void {
  if (!this.newMessageText.trim()) return;
  
  const text = this.newMessageText.trim();
  this.newMessageText = '';

  this.spacesService.sendMessage(this.roomId, text).subscribe({
    next: () => {
      this.signalRService.sendMessage(this.roomId, text);
    },
    error: (err) => console.error('Error sending message:', err)
  });
}
  public leaveRoom(): void {
  console.log('🚪 Leaving room...');
  
  // 1. Leave SignalR group
  this.signalRService.leaveRoom(this.roomId);
  
  // 2. Close all WebRTC connections
  this.rtcService.closeAllConnections();
  
  // 3. Leave via REST API
  this.spacesService.leaveRoom(this.roomId).subscribe({
    next: () => {
      console.log('✅ Left room successfully');
      // 4. Navigate away
      this.router.navigate(['/spaces']);
    },
    error: (err) => {
      console.error('Error leaving room:', err);
      // Still navigate even if API fails
      this.router.navigate(['/spaces']);
    }
  });
}

  public getUserLabel(p: Participant): string {
    return p.userId === this.currentUserId ? `${p.fullName} (You)` : p.fullName;
  }

  public hasVideoTrack(stream: MediaStream): boolean {
  // Just check if stream exists and is active
  return stream?.active === true;
}

  public trackByUserId(index: number, p: Participant): number {
    return p.userId;
  }

  public trackByMessageId(index: number, m: ChatMessage): number {
    return m.id || index;
  }

 public kickUser(targetUserId: number): void {
  if (!this.isHost) return;
  
  if (confirm('Kick this user?')) {
    this.spacesService.kickParticipant(this.roomId, targetUserId).subscribe({
      next: () => {
        this.participants = this.participants.filter(p => p.userId !== targetUserId);
        this.rtcService.closeConnection(targetUserId.toString());
        
        // Notify everyone
        this.signalRService.sendMessage(
          this.roomId, 
          JSON.stringify({ action: 'kick', userId: targetUserId })
        );
      },
      error: (err) => console.error('Failed to kick:', err)
    });
  }
}

// In room-detail.component.ts

public muteUser(targetUserId: number, mute: boolean): void {
  if (!this.isHost) return;
  
  console.log(`🔇 Host ${mute ? 'muting' : 'unmuting'} user:`, targetUserId);
  
  // 1. Call the REST API to persist to DB
  this.spacesService.muteParticipant(this.roomId, targetUserId, mute).subscribe({
    next: () => {
      console.log('✅ Mute API success');
      
      // 2. Update local participant state immediately
      const p = this.participants.find(p => p.userId === targetUserId);
      if (p) {
        p.isMuted = mute;
        this.participants = [...this.participants]; // Trigger change detection
      }
      
      // 3. Send SignalR message to force mute on target user's client
      const muteCommand = JSON.stringify({
        action: 'hostForceMute',
        targetUserId: targetUserId,
        muted: mute
      });
      
      this.signalRService.sendMessage(this.roomId, muteCommand);
      console.log('📤 Force mute command sent via SignalR');
    },
    error: (err) => console.error('❌ Mute API failed:', err)
  });
}

  ngOnDestroy(): void {
  console.log('🧹 Cleaning up room...');
  
  this.subscriptions.forEach(s => s.unsubscribe());
  this.subscriptions = [];
  
  this.rtcService.closeAllConnections();
  this.signalRService.leaveRoom(this.roomId);
  
  this.participants = [];
  this.messages = [];
  this.isMediaReady = false;
}

public isAnyoneScreenSharing(): boolean {
  return this.participants.some(p => p.isScreenSharing);
}
// In room-detail.component.ts

public get sortedParticipants(): Participant[] {
  return [...this.participants].sort((a, b) => {
    // Screen sharer first
    if (a.isScreenSharing && !b.isScreenSharing) return -1;
    if (!a.isScreenSharing && b.isScreenSharing) return 1;
    return 0;
  });
}
public copyRoomLink(): void {
  navigator.clipboard.writeText(this.shareLink).then(() => {
    // Temporary feedback
  });
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
}