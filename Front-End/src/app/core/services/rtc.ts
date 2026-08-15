import { Injectable } from '@angular/core';
import { SignalRService } from './signalr';
import { Subject } from 'rxjs';

export interface RemoteStreamEvent {
  userId: string;
  stream: MediaStream;
}

interface PeerMeta {
  pc: RTCPeerConnection;
  stream: MediaStream;
  pendingCandidates: RTCIceCandidateInit[];
}

@Injectable({
  providedIn: 'root'
})
export class RtcService {
  public localStream: MediaStream | null = null;
  public screenStream?: MediaStream;

  public remoteStream$ = new Subject<RemoteStreamEvent>();
  public remoteDisconnected$ = new Subject<string>();

  private peers: Map<string, PeerMeta> = new Map();
  private currentRoomId: number | string | null = null;
  private currentUserId: string = '';

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.relay.metered.ca:80' },
      { urls: 'stun:stun1.l.google.com:19302' },
      {
        urls: 'turn:global.relay.metered.ca:80',
        username: '02390c91f5732650459073e6',
        credential: '3QacNDMVJ4J5DqX2'
      },
      {
        urls: 'turn:global.relay.metered.ca:80?transport=tcp',
        username: '02390c91f5732650459073e6',
        credential: '3QacNDMVJ4J5DqX2'
      },
      {
        urls: 'turn:global.relay.metered.ca:443',
        username: '02390c91f5732650459073e6',
        credential: '3QacNDMVJ4J5DqX2'
      },
      {
        urls: 'turns:global.relay.metered.ca:443?transport=tcp',
        username: '02390c91f5732650459073e6',
        credential: '3QacNDMVJ4J5DqX2'
      }
    ],
    iceCandidatePoolSize: 10
  };

  constructor(private signalRService: SignalRService) {}

  public setCurrentUser(userId: string | number): void {
    this.currentUserId = userId.toString();
  }

  // ---------- Local Media Initialization ----------
  public async getLocalStream(): Promise<MediaStream> {
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }

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

    return this.localStream;
  }

  public toggleAudioTrack(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(track => (track.enabled = enabled));
  }

  public toggleVideoTrack(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(track => (track.enabled = enabled));
  }

  // ---------- Screen Sharing ----------
  public async startScreenShare(): Promise<MediaStream> {
    try {
      this.screenStream = await navigator.mediaDevices.getDisplayMedia({
        video: { width: 1920, height: 1080, frameRate: 30 },
        audio: false
      });

      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (!screenTrack) throw new Error('No video track found in screen share');

      this.peers.forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(screenTrack).catch(err => console.error('Failed to replace track with screen:', err));
        }
      });

      screenTrack.onended = () => this.stopScreenShare();
      return this.screenStream;
    } catch (error) {
      console.error('Screen sharing failed:', error);
      throw error;
    }
  }

  public stopScreenShare(): MediaStream | null {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = undefined;
    }

    const cameraTrack = this.localStream?.getVideoTracks()[0];
    if (cameraTrack) {
      this.peers.forEach(({ pc }) => {
        const sender = pc.getSenders().find(s => s.track?.kind === 'video');
        if (sender) {
          sender.replaceTrack(cameraTrack).catch(err => console.error('Failed to restore camera track:', err));
        }
      });
    }

    return this.localStream;
  }

  // ---------- Signaling Listeners ----------
  public initSignalListeners(
    roomId: number | string,
    onRemoteStream?: (remoteUserId: string, stream: MediaStream) => void
  ): void {
    this.currentRoomId = roomId;

    this.signalRService.receiveSignal$.subscribe(({ fromUserId, signalData }) => {
      const parsed = typeof signalData === 'string' ? JSON.parse(signalData) : signalData;
      this.handleIncomingSignal(fromUserId, parsed, onRemoteStream);
    });
  }

  // ---------- Peer Connection Setup ----------
  private getOrCreatePeer(
    remoteUserId: string,
    onRemoteStream?: (remoteUserId: string, stream: MediaStream) => void
  ): PeerMeta {
    let peer = this.peers.get(remoteUserId);
    if (peer) return peer;

    const pc = new RTCPeerConnection(this.rtcConfig);
    const remoteMediaStream = new MediaStream();

    peer = {
      pc,
      stream: remoteMediaStream,
      pendingCandidates: []
    };

    // Attach local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream!);
      });
    }

    // ICE Candidate generation (Trickle ICE)
    pc.onicecandidate = ({ candidate }) => {
      if (candidate && this.currentRoomId) {
        this.signalRService.sendSignal(this.currentRoomId, remoteUserId, {
          type: 'candidate',
          candidate: candidate.toJSON()
        });
      }
    };

    // Robust Track Reception: Handles both audio and video arrivals independently
    pc.ontrack = (event) => {
      if (event.track) {
        // Prevent duplicate tracks of the same kind
        const existingTrack = peer!.stream.getTracks().find(t => t.kind === event.track.kind);
        if (existingTrack) {
          peer!.stream.removeTrack(existingTrack);
        }
        peer!.stream.addTrack(event.track);

        // Notify room component of updated stream
        this.remoteStream$.next({
          userId: remoteUserId,
          stream: peer!.stream
        });

        if (onRemoteStream) {
          onRemoteStream(remoteUserId, peer!.stream);
        }

        event.track.onunmute = () => {
          this.remoteStream$.next({
            userId: remoteUserId,
            stream: peer!.stream
          });
        };
      }
    };

    // Connection lifecycle
    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'failed' || pc.connectionState === 'closed') {
        this.closeConnection(remoteUserId);
      }
    };

    this.peers.set(remoteUserId, peer);
    return peer;
  }

  /**
   * Deterministic Caller Action: Only called by the newly joined user towards existing room members.
   */
  public async initiateOfferToUser(remoteUserId: string): Promise<void> {
    const peer = this.getOrCreatePeer(remoteUserId);
    const { pc } = peer;

    try {
      const offer = await pc.createOffer({
        offerToReceiveAudio: true,
        offerToReceiveVideo: true
      });
      await pc.setLocalDescription(offer);

      if (this.currentRoomId) {
        await this.signalRService.sendSignal(this.currentRoomId, remoteUserId, {
          type: 'offer',
          sdp: pc.localDescription
        });
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for user ${remoteUserId}:`, err);
    }
  }

  public connectToUser(remoteUserId: string): void {
    this.getOrCreatePeer(remoteUserId);
  }

  public async createOffer(
    roomId: number | string,
    remoteUserId: string,
    onRemoteStream?: (remoteUserId: string, stream: MediaStream) => void
  ): Promise<void> {
    const peer = this.getOrCreatePeer(remoteUserId, onRemoteStream);
    const { pc } = peer;

    try {
      if (pc.signalingState === 'stable' && !pc.localDescription) {
        const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: true });
        await pc.setLocalDescription(offer);

        await this.signalRService.sendSignal(roomId, remoteUserId, {
          type: 'description',
          description: pc.localDescription
        });
      }
    } catch (err) {
      console.error(`[WebRTC] Failed to create offer for ${remoteUserId}:`, err);
    }
  }

  public logLocalTracks(): void {
    if (!this.localStream) {
      console.log('[RTC] No local stream available');
      return;
    }

    console.log(
      '[RTC] Local tracks:',
      this.localStream.getTracks().map(track => ({
        kind: track.kind,
        enabled: track.enabled,
        readyState: track.readyState
      }))
    );
  }

  /**
   * Unified incoming signal handler
   */
  private async handleIncomingSignal(
    remoteUserId: string,
    signal: any,
    onRemoteStream?: (remoteUserId: string, stream: MediaStream) => void
  ): Promise<void> {
    const peer = this.getOrCreatePeer(remoteUserId, onRemoteStream);
    const { pc } = peer;

    try {
      if (signal.type === 'offer' && signal.sdp) {
        // Callee receives offer from new joiner
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        await this.drainPendingCandidates(remoteUserId);

        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);

        if (this.currentRoomId) {
          await this.signalRService.sendSignal(this.currentRoomId, remoteUserId, {
            type: 'answer',
            sdp: pc.localDescription
          });
        }

      } else if (signal.type === 'answer' && signal.sdp) {
        // Offerer receives answer back
        if (pc.signalingState === 'have-local-offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          await this.drainPendingCandidates(remoteUserId);
        }

      } else if (signal.type === 'candidate' && signal.candidate) {
        const candidate = new RTCIceCandidate(signal.candidate);
        if (pc.remoteDescription && pc.remoteDescription.type) {
          try {
            await pc.addIceCandidate(candidate);
          } catch (err) {
            console.warn('[WebRTC] Error adding ICE candidate:', err);
          }
        } else {
          peer.pendingCandidates.push(signal.candidate);
        }
      }
    } catch (err) {
      console.error(`[WebRTC] Error handling signal from ${remoteUserId}:`, err);
    }
  }

  private async drainPendingCandidates(remoteUserId: string): Promise<void> {
    const peer = this.peers.get(remoteUserId);
    if (!peer || !peer.pc.remoteDescription) return;

    while (peer.pendingCandidates.length > 0) {
      const candidateInit = peer.pendingCandidates.shift();
      if (candidateInit) {
        try {
          await peer.pc.addIceCandidate(new RTCIceCandidate(candidateInit));
        } catch (e) {
          console.warn('[WebRTC] Failed to add buffered ICE candidate:', e);
        }
      }
    }
  }

  // ---------- Cleanup ----------
  public closeConnection(userId: string): void {
    const peer = this.peers.get(userId);
    if (peer) {
      peer.pc.ontrack = null;
      peer.pc.onicecandidate = null;
      peer.pc.close();
      peer.stream.getTracks().forEach(t => t.stop());
      this.peers.delete(userId);
    }
    this.remoteDisconnected$.next(userId);
  }

  public closeAllConnections(): void {
    this.peers.forEach((_, userId) => this.closeConnection(userId));
    this.peers.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(t => t.stop());
      this.localStream = null;
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(t => t.stop());
      this.screenStream = undefined;
    }
  }
}