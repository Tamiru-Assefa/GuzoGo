import { Injectable } from '@angular/core';
import { Subject, BehaviorSubject } from 'rxjs';
import { PeerMatchSignalRService } from './peer-match-signalr';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class PeerMatchRtcService {
  public localStream?: MediaStream;
  public remoteStream?: MediaStream;
  public screenStream?: MediaStream;

  public remoteStream$ = new Subject<MediaStream>();
  public remoteDisconnected$ = new Subject<string>();
  public connectionState$ = new BehaviorSubject<RTCPeerConnectionState>('new');

  private peerConnection?: RTCPeerConnection;
  private currentUserId: string = '';
  private currentRoomId: string = '';
  private remoteUserId: string = '';
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private isMakingOffer = false;

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: environment.iceServers,
    iceCandidatePoolSize: 10
    };  

  constructor(private signalRService: PeerMatchSignalRService) {}

  public setCurrentUser(userId: string | number): void {
    this.currentUserId = String(userId);
  }

  public setRemoteUserId(userId: string | number): void {
    this.remoteUserId = String(userId);
  }

  public setRoomId(roomId: string): void {
    this.currentRoomId = roomId;
  }

  private isSelf(userId: string | number): boolean {
    return String(userId) === this.currentUserId;
  }

  // ============================================================
  // LOCAL MEDIA
  // ============================================================

  public async getLocalStream(): Promise<MediaStream> {
    if (this.localStream && this.localStream.active) {
      if (this.peerConnection) {
        this.attachLocalTracksToPc(this.peerConnection);
      }
      return this.localStream;
    }

    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          frameRate: { ideal: 30 }
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      });

      if (this.peerConnection) {
        this.attachLocalTracksToPc(this.peerConnection);
      }
    } catch (err) {
      console.error('Failed to get camera/mic stream:', err);
      throw err;
    }

    return this.localStream;
  }

  public toggleAudio(enabled: boolean): void {
    this.localStream?.getAudioTracks().forEach(track => (track.enabled = enabled));
  }

  public toggleVideo(enabled: boolean): void {
    this.localStream?.getVideoTracks().forEach(track => (track.enabled = enabled));
  }

  // ============================================================
  // WEBRTC SIGNALING
  // ============================================================

  public async initiateOfferToUser(targetUserId: string): Promise<void> {
    if (this.isSelf(targetUserId)) return;
    this.setRemoteUserId(targetUserId);

    try {
      await this.getLocalStream();
    } catch (e) {
      console.warn('Could not acquire local media before offer:', e);
    }

    const pc = this.ensurePeerConnection();
    this.attachLocalTracksToPc(pc);

    if (this.isMakingOffer || pc.signalingState !== 'stable') {
      console.warn('Skipping offer: signaling state is not stable:', pc.signalingState);
      return;
    }

    try {
      this.isMakingOffer = true;
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });

      await pc.setLocalDescription(offer);

      await this.signalRService.sendSignal(this.currentRoomId, targetUserId, {
        type: 'offer',
        sdp: pc.localDescription
      });
    } catch (error) {
      console.error('Failed to create/send offer:', error);
    } finally {
      this.isMakingOffer = false;
    }
  }

  public async handleSignal(signalDataRaw: any, fromUserId: string): Promise<void> {
    if (this.isSelf(fromUserId)) return;

    let signal = signalDataRaw;
    if (typeof signalDataRaw === 'string') {
      try {
        signal = JSON.parse(signalDataRaw);
      } catch (e) {
        console.error('Failed to parse signal payload:', e);
        return;
      }
    }

    try {
      if (signal.type === 'offer' && signal.sdp) {
        try {
          await this.getLocalStream();
        } catch (e) {
          console.warn('Could not acquire local media before answer:', e);
        }

        const pc = this.ensurePeerConnection();
        this.attachLocalTracksToPc(pc);

        const isCollision = this.isMakingOffer || pc.signalingState !== 'stable';
        if (isCollision) {
          console.warn('Signaling collision detected. Rolling back local offer.');
          await Promise.all([
            pc.setLocalDescription({ type: 'rollback' }),
            pc.setRemoteDescription(new RTCSessionDescription(signal.sdp))
          ]);
        } else {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        }

        await this.drainPendingCandidates();

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        await this.signalRService.sendSignal(this.currentRoomId, fromUserId, {
          type: 'answer',
          sdp: pc.localDescription
        });

      } else if (signal.type === 'answer' && signal.sdp) {
        const pc = this.ensurePeerConnection();
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await this.drainPendingCandidates();
        }

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        const pc = this.ensurePeerConnection();

        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.warn('Error adding ICE candidate:', err);
          }
        } else {
          this.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (error) {
      console.error('Error in WebRTC signal handling:', error);
    }
  }

  // ============================================================
  // PEER CONNECTION & TRACK BINDING
  // ============================================================

  private ensurePeerConnection(): RTCPeerConnection {
    if (this.peerConnection) return this.peerConnection;

    const pc = new RTCPeerConnection(this.rtcConfig);
    this.peerConnection = pc;
    this.remoteStream = new MediaStream();

    this.attachLocalTracksToPc(pc);

    pc.ontrack = (event: RTCTrackEvent) => {
      console.log('[WebRTC Remote Track Received]:', event.track.kind);
      
      if (event.streams && event.streams[0]) {
        this.remoteStream = event.streams[0];
      } else if (event.track) {
        if (!this.remoteStream) {
          this.remoteStream = new MediaStream();
        }
        if (!this.remoteStream.getTracks().some(t => t.id === event.track.id)) {
          this.remoteStream.addTrack(event.track);
        }
      }

      if (this.remoteStream) {
        this.remoteStream$.next(this.remoteStream);
      }
    };

    pc.onicecandidate = (event) => {
      if (event.candidate && this.currentRoomId && this.remoteUserId) {
        this.signalRService.sendSignal(this.currentRoomId, this.remoteUserId, {
          type: 'candidate',
          candidate: event.candidate.toJSON()
        });
      }
    };

    pc.onconnectionstatechange = () => {
      this.connectionState$.next(pc.connectionState);
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.remoteDisconnected$.next(this.remoteUserId);
      }
    };

    return pc;
  }

  private attachLocalTracksToPc(pc: RTCPeerConnection): void {
    if (!this.localStream) {
      const senders = pc.getSenders();
      const hasAudio = senders.some(s => s.track?.kind === 'audio');
      const hasVideo = senders.some(s => s.track?.kind === 'video');
      if (!hasAudio) pc.addTransceiver('audio', { direction: 'sendrecv' });
      if (!hasVideo) pc.addTransceiver('video', { direction: 'sendrecv' });
      return;
    }

    const senders = pc.getSenders();
    this.localStream.getTracks().forEach(track => {
      const existingSender = senders.find(s => s.track?.kind === track.kind || (s as any).kind === track.kind);
      if (existingSender) {
        if (existingSender.track !== track) {
          existingSender.replaceTrack(track).catch(err => console.warn('replaceTrack err:', err));
        }
      } else {
        pc.addTrack(track, this.localStream!);
      }
    });
  }

  private async drainPendingCandidates(): Promise<void> {
    if (!this.peerConnection || !this.peerConnection.remoteDescription) return;

    while (this.pendingCandidates.length > 0) {
      const candidate = this.pendingCandidates.shift();
      if (candidate) {
        try {
          await this.peerConnection.addIceCandidate(new RTCIceCandidate(candidate));
        } catch (error) {
          console.warn('Failed to add buffered candidate:', error);
        }
      }
    }
  }

  public closeConnection(): void {
    if (this.peerConnection) {
      this.peerConnection.ontrack = null;
      this.peerConnection.onicecandidate = null;
      this.peerConnection.onconnectionstatechange = null;
      this.peerConnection.close();
      this.peerConnection = undefined;
    }
    this.remoteStream = undefined;
    this.pendingCandidates = [];
    this.remoteUserId = '';
    this.isMakingOffer = false;
  }

  public closeAll(): void {
    this.closeConnection();
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
      this.localStream = undefined;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;
    }
  }
}