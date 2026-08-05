import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, AfterViewInit, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { SignalRService, SpaceStateUpdate } from '../../../core/services/signalr'; 
import { RtcService } from '../../../core/services/rtc';                           
import { SpacesService } from '../services/spaces';                
interface Participant {
  userId: string;
  stream?: MediaStream;
  isMuted: boolean;
  isVideoOff: boolean;
  avatarUrl?: string;
}

@Component({
  selector: 'app-space',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './space.html',
  styleUrls: ['./space.scss']
})
export class SpaceComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('localVideo', { static: true }) localVideoElement!: ElementRef<HTMLVideoElement>;

  public roomId!: string;
  public numericRoomId!: number;
  public localStream!: MediaStream;
  public remoteParticipants: Map<string, Participant> = new Map();
  public localAvatarUrl: string | null = null;

  // Controls state
  public isMuted: boolean = false;
  public isVideoOff: boolean = false;
  public isScreenSharing: boolean = false;

  private subscriptions: Subscription = new Subscription();

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private signalRService: SignalRService,
    private rtcService: RtcService,
    private spacesService: SpacesService // <-- INJECTED HERE
  ) {}

  async ngOnInit(): Promise<void> {
    this.roomId = this.route.snapshot.paramMap.get('id') || '';
    this.numericRoomId = Number(this.roomId);

    if (!this.roomId || isNaN(this.numericRoomId)) {
      this.router.navigate(['/']);
      return;
    }

    // 1. Initialize Local Camera / Mic Stream
    try {
      this.localStream = await this.rtcService.getLocalStream();
      if (this.localVideoElement?.nativeElement) {
        this.localVideoElement.nativeElement.srcObject = this.localStream;
      }
    } catch (err) {
      console.error('Failed to access local media devices:', err);
    }

    this.localAvatarUrl = localStorage.getItem('profilePictureUrl');

    // 2. Start SignalR Connection (if not already connected)
    if (!this.signalRService.isConnected()) {
      await this.signalRService.startConnection();
    }

    // 3. Register WebRTC Signal Listeners
    this.rtcService.initSignalListeners(this.roomId, (remoteUserId, stream) => {
      this.handleRemoteStream(remoteUserId, stream);
    });

    // 4. Register SignalR Event Handlers
    this.setupSignalREvents();

    // 5. Join Room Group via SignalR
    await this.signalRService.joinSpaceGroup(this.numericRoomId);
  }

  private setupSignalREvents(): void {
    // When a new user joins the room, send them an offer
    this.subscriptions.add(
      this.signalRService.remoteUserJoined$.subscribe(async (userId: number | string) => {
        const peerId = userId.toString();
        this.addParticipantIfNotExists(peerId);
        await this.rtcService.createOffer(this.roomId, peerId, (remoteUserId, stream) => {
          this.handleRemoteStream(remoteUserId, stream);
        });
      })
    );

    // When a user leaves, clean up their stream and UI
    this.subscriptions.add(
      this.signalRService.remoteUserLeft$.subscribe((userId: number | string) => {
        const peerId = userId.toString();
        this.remoteParticipants.delete(peerId);
      })
    );

    // Unified listener for media state changes (mic, camera, hand raise, screen share)
    this.subscriptions.add(
      this.signalRService.spaceStateUpdated$.subscribe(({ userId, mediaState }: SpaceStateUpdate) => {
        const peerId = userId.toString();
        const participant = this.remoteParticipants.get(peerId);

        if (participant) {
          if (mediaState.isMuted !== undefined) {
            participant.isMuted = mediaState.isMuted;
          }
          if (mediaState.isVideoOn !== undefined) {
            participant.isVideoOff = !mediaState.isVideoOn;
          }
        }
      })
    );
  }

  private handleRemoteStream(userId: string, stream: MediaStream): void {
    const participant = this.remoteParticipants.get(userId) || {
      userId,
      isMuted: false,
      isVideoOff: false
    };
    participant.stream = stream;
    this.remoteParticipants.set(userId, { ...participant });
  }

  private addParticipantIfNotExists(userId: string): void {
    if (!this.remoteParticipants.has(userId)) {
      this.remoteParticipants.set(userId, {
        userId,
        isMuted: false,
        isVideoOff: false
      });
    }
  }

  // --- Real-Time Control Actions ---

  public toggleMicrophone(): void {
    this.isMuted = !this.isMuted;

    // Real media track enable/disable
this.rtcService.toggleAudioTrack(!this.isMuted);
this.rtcService.logLocalTracks();

    // Broadcast & Sync
    this.signalRService.broadcastStateChange(this.numericRoomId, 'MediaStateChanged', { isMuted: this.isMuted });
    this.spacesService.toggleMedia(this.numericRoomId, { isMuted: this.isMuted }).subscribe();
  }

  // space.component.ts

public async toggleCamera(): Promise<void> {
  console.log("Camera button clicked");
  this.isVideoOff = !this.isVideoOff;

  // 1. Enable or disable physical video track in RtcService
this.rtcService.toggleVideoTrack(!this.isVideoOff);
this.rtcService.logLocalTracks();


  // 2. Attach stream to HTML Video Element
  if (this.localVideoElement?.nativeElement) {
    const videoElem = this.localVideoElement.nativeElement;
    
    // Assign stream
    videoElem.srcObject = this.rtcService.localStream;
    
    // Explicitly call play() to guarantee execution
    if (!this.isVideoOff) {
      try {
        await videoElem.play();
      } catch (err) {
        console.error("Error playing video stream:", err);
      }
    }
  }

  // 3. Sync state via SignalR and HTTP POST API
  this.signalRService.broadcastStateChange(this.numericRoomId, 'MediaStateChanged', { isVideoOn: !this.isVideoOff });
  this.spacesService.toggleMedia(this.numericRoomId, { isVideoOn: !this.isVideoOff }).subscribe();
}

  public async toggleScreenShare(): Promise<void> {
    this.isScreenSharing = !this.isScreenSharing;

    if (this.isScreenSharing) {
      try {
        const screenStream = await this.rtcService.startScreenShare();
        if (this.localVideoElement?.nativeElement) {
          this.localVideoElement.nativeElement.srcObject = screenStream;
        }
      } catch {
        this.isScreenSharing = false;
        return;
      }
    } else {
      const cameraStream = await this.rtcService.stopScreenShare();
      if (this.localVideoElement?.nativeElement) {
        this.localVideoElement.nativeElement.srcObject = cameraStream || null;
      }
    }

    // Broadcast & Sync (Correctly inside toggleScreenShare)
    this.signalRService.broadcastStateChange(this.numericRoomId, 'MediaStateChanged', { isScreenSharing: this.isScreenSharing });
    this.spacesService.toggleMedia(this.numericRoomId, { isScreenSharing: this.isScreenSharing }).subscribe();
  }

  public async leaveSpace(): Promise<void> {
    if (this.numericRoomId) {
      await this.signalRService.leaveSpaceGroup(this.numericRoomId);
    }
    this.rtcService.closeAllConnections();
    this.router.navigate(['/']);
  }

  ngAfterViewInit(): void {
    if (this.localStream && this.localVideoElement?.nativeElement) {
      this.localVideoElement.nativeElement.srcObject = this.localStream;
    }
  }

  ngOnDestroy(): void {
    this.subscriptions.unsubscribe();
    void this.leaveSpace();
  }

  private attachLocalStreamToVideoElement(): void {
    if (this.localStream && this.localVideoElement?.nativeElement) {
      this.localVideoElement.nativeElement.srcObject = this.localStream;
    }
  }
}
