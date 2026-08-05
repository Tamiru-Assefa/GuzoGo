// core/services/rtc.service.ts

import { Injectable } from '@angular/core';
import { SignalRService } from './signalr';

@Injectable({
  providedIn: 'root'
})
export class RtcService {
  public localStream!: MediaStream;
public screenStream?: MediaStream;
  private peerConnections: Map<string, RTCPeerConnection> = new Map();

  private readonly rtcConfig: RTCConfiguration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  constructor(private signalRService: SignalRService) {}

  /** Initialize local media stream */
  // core/services/rtc.service.ts

// core/services/rtc.service.ts

public async getLocalStream(): Promise<MediaStream> {
  // Always get fresh stream - stop old one if exists
  if (this.localStream) {
    this.localStream.getTracks().forEach(track => track.stop());
    this.localStream = null!;
  }
  
  this.localStream = await navigator.mediaDevices.getUserMedia({
    video: { width: 1280, height: 720 },
    audio: true
  });
  
  return this.localStream;
}

  /** Toggle microphone on/off */
  public toggleAudioTrack(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getAudioTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /** Toggle camera on/off */
  public toggleVideoTrack(enabled: boolean): void {
    if (!this.localStream) return;
    this.localStream.getVideoTracks().forEach(track => {
      track.enabled = enabled;
    });
  }

  /** Start screen sharing */
  public async startScreenShare(): Promise<MediaStream> {
  try {
    this.screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: { width: 1920, height: 1080, frameRate: 30 },
      audio: false
    });

    const screenTrack = this.screenStream.getVideoTracks()[0];
    
    if (!screenTrack) {
      throw new Error('No video track in screen share');
    }

    console.log('📺 Screen share track:', screenTrack.label);

    // Replace video track in ALL peer connections
    this.peerConnections.forEach((pc, userId) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender) {
        sender.replaceTrack(screenTrack)
          .then(() => console.log('✅ Replaced track for user:', userId))
          .catch(err => console.error('❌ Failed to replace track:', err));
      }
    });

    // Handle user clicking "Stop Sharing" in browser
    screenTrack.onended = () => {
      console.log('🛑 Browser stop sharing detected');
      this.stopScreenShare();
    };

    console.log('✅ Screen share started, peers updated:', this.peerConnections.size);
    return this.screenStream;

  } catch (error) {
    console.error('Screen share failed:', error);
    throw error;
  }
}

  /** Stop screen sharing and restore camera */
  public stopScreenShare(): MediaStream | undefined {
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
      this.screenStream = undefined;
    }

    const cameraTrack = this.localStream?.getVideoTracks()[0];

    this.peerConnections.forEach((pc) => {
      const sender = pc.getSenders().find(s => s.track?.kind === 'video');
      if (sender && cameraTrack) {
        sender.replaceTrack(cameraTrack);
      }
    });
    return this.localStream;
  }

  /** Listen for incoming WebRTC signals */
  public initSignalListeners(
    roomId: number | string,
    onRemoteStream: (userId: string, stream: MediaStream) => void
  ): void {
    this.signalRService.receiveSignal$.subscribe(({ fromUserId, signalData }) => {
      // Backend sends: ReceiveSignal(string fromUserId, string signalData)
      const parsed = typeof signalData === 'string' ? JSON.parse(signalData) : signalData;
      this.handleSignal(roomId, fromUserId, parsed, onRemoteStream);
    });
  }

  public logLocalTracks(): void {
    if (!this.localStream) return;
    console.log('====== LOCAL STREAM ======');
    this.localStream.getTracks().forEach(track => {
      console.log({ kind: track.kind, enabled: track.enabled, readyState: track.readyState });
    });
  }

  /** Handle incoming offer/answer/candidate */
  // In handleSignal method, before setting remote description:
private async handleSignal(
  roomId: number | string,
  fromUserId: string,
  signal: any,
  onRemoteStream: (userId: string, stream: MediaStream) => void
): Promise<void> {
  let pc = this.peerConnections.get(fromUserId);

  if (signal.type === 'offer') {
    // Close existing connection if in bad state
    if (pc && pc.signalingState !== 'stable') {
      console.warn('⚠️ Connection in bad state, recreating...');
      pc.close();
      this.peerConnections.delete(fromUserId);
      pc = undefined;
    }
    
    if (!pc) {
      pc = this.createPeerConnection(roomId, fromUserId, onRemoteStream);
    }
    
    try {
      await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      
      await this.signalRService.sendSignal(roomId, fromUserId, {
        type: 'answer',
        sdp: answer
      });
    } catch (error) {
      console.error('❌ Error handling offer:', error);
      // Reset connection on error
      pc.close();
      this.peerConnections.delete(fromUserId);
    }

  } else if (signal.type === 'answer' && pc) {
    try {
      if (pc.signalingState === 'have-local-offer') {
        await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
      } else {
        console.warn('⚠️ Ignoring answer - wrong signaling state:', pc.signalingState);
      }
    } catch (error) {
      console.error('❌ Error handling answer:', error);
    }

  } else if (signal.type === 'ice-candidate' && pc) {
    try {
      if (signal.candidate) {
        await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
      }
    } catch (error) {
      console.error('❌ Error adding ICE candidate:', error);
    }
  }
}

  /** Create offer and send to remote user */
 public async createOffer(
  roomId: number | string,
  targetUserId: string,
  onRemoteStream: (userId: string, stream: MediaStream) => void
): Promise<void> {
  // Don't create if already exists and in progress
  const existing = this.peerConnections.get(targetUserId);
  if (existing && existing.signalingState !== 'stable') {
    console.warn('⚠️ Connection already in progress for user:', targetUserId);
    return;
  }
  
  const pc = this.createPeerConnection(roomId, targetUserId, onRemoteStream);
  
  try {
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);

    await this.signalRService.sendSignal(roomId, targetUserId, {
      type: 'offer',
      sdp: offer
    });
  } catch (error) {
    console.error('❌ Error creating offer:', error);
    pc.close();
    this.peerConnections.delete(targetUserId);
  }
}

  /** Create a new peer connection */
  private createPeerConnection(
    roomId: number | string,
    remoteUserId: string,
    onRemoteStream: (userId: string, stream: MediaStream) => void
  ): RTCPeerConnection {
    // Remove existing connection if any
    const existing = this.peerConnections.get(remoteUserId);
    if (existing) {
      existing.close();
    }

    const pc = new RTCPeerConnection(this.rtcConfig);

    // Add local tracks
    if (this.localStream) {
      this.localStream.getTracks().forEach(track => {
        pc.addTrack(track, this.localStream);
      });
    }

    // Handle remote stream
    pc.ontrack = (event) => {
      if (event.streams?.[0]) {
        onRemoteStream(remoteUserId, event.streams[0]);
      }
    };

    // Send ICE candidates via SignalR
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        this.signalRService.sendSignal(roomId, remoteUserId, {
          type: 'ice-candidate',
          candidate: event.candidate
        });
      }
    };

    this.peerConnections.set(remoteUserId, pc);
    return pc;
  }

  /** Clean up everything */
  public closeAllConnections(): void {
    this.peerConnections.forEach(pc => pc.close());
    this.peerConnections.clear();

    if (this.localStream) {
      this.localStream.getTracks().forEach(track => track.stop());
    }
    if (this.screenStream) {
      this.screenStream.getTracks().forEach(track => track.stop());
    }
  }

  /** Close specific peer connection */
  public closeConnection(userId: string): void {
    const pc = this.peerConnections.get(userId);
    if (pc) {
      pc.close();
      this.peerConnections.delete(userId);
    }
  }
}