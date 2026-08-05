// core/services/signalr.service.ts

import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface MediaStatePayload {
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
}

export interface SpaceStateUpdate {
  userId: number;
  mediaState: MediaStatePayload;
}

export interface SignalReceived {
  fromUserId: string;
  signalData: string;
}

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  public remoteUserJoined$ = new Subject<number | string>();
  public remoteUserLeft$ = new Subject<number | string>();
  public receiveSignal$ = new Subject<SignalReceived>();
  public receiveMessage$ = new Subject<any>();
  public spaceStateUpdated$ = new Subject<SpaceStateUpdate>();

  constructor(private ngZone: NgZone) {}

  public async startConnection(): Promise<void> {
    const hubUrl = `${environment.apiUrl.replace('/api', '')}/hubs/spaces`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.LongPolling
      })
      .withAutomaticReconnect()
      .build();

    this.registerSignalREvents();

    return this.hubConnection.start();
  }

  private registerSignalREvents(): void {
    this.hubConnection.on('UserJoinedSpace', (userId: number | string) => {
      console.log('👤 User joined:', userId);
      this.ngZone.run(() => {
        this.remoteUserJoined$.next(userId);
      });
    });

    this.hubConnection.on('UserLeftSpace', (userId: number | string) => {
      console.log('👋 User left:', userId);
      this.ngZone.run(() => {
        this.remoteUserLeft$.next(userId);
      });
    });

    this.hubConnection.on('ReceiveMessage', (messageData: any) => {
      console.log('💬 Message received:', messageData);
      this.ngZone.run(() => {
        this.receiveMessage$.next(messageData);
      });
    });

    this.hubConnection.on('SpaceStateUpdated', (data: any) => {
  console.log('🔔 SpaceStateUpdated received:', JSON.stringify(data));
  
  this.ngZone.run(() => {
    // Backend sends: { userId, mediaState }
    const targetUserId = Number(data?.userId);
    const mediaState = data?.mediaState;

    if (targetUserId && mediaState) {
      this.spaceStateUpdated$.next({
        userId: targetUserId,
        mediaState: mediaState
      });
    }
  });
});

    this.hubConnection.on('ReceiveSignal', (fromUserId: string, signalData: string) => {
      console.log('📶 Signal received from:', fromUserId);
      this.ngZone.run(() => {
        this.receiveSignal$.next({ fromUserId, signalData });
      });
    });
  }

  // --- HUB ACTIONS ---

  public async joinSpaceGroup(roomId: number | string): Promise<void> {
    if (this.isConnected()) {
      await this.hubConnection.invoke('JoinSpaceGroup', Number(roomId));
    }
  }

  public async leaveSpaceGroup(roomId: number | string): Promise<void> {
    if (this.isConnected()) {
      await this.hubConnection.invoke('LeaveSpaceGroup', Number(roomId));
    }
  }

  // Backend: ToggleMediaState(int roomId, UpdateMediaStateDto dto)
  public async toggleMediaState(roomId: number | string, payload: MediaStatePayload): Promise<void> {
  if (this.isConnected()) {
    console.log('📤 Sending ToggleMediaState:', { roomId: Number(roomId), payload });
    try {
      await this.hubConnection.invoke('ToggleMediaState', Number(roomId), payload);
      console.log('✅ ToggleMediaState sent successfully');
    } catch (err) {
      console.error('❌ ToggleMediaState failed:', err);
    }
  } else {
    console.warn('⚠️ SignalR not connected, cannot send ToggleMediaState');
  }
}

  // Backend doesn't have BroadcastStateChange, so we send as a message instead
  public async broadcastStateChange(roomId: number | string, eventType: string, payload: any): Promise<void> {
    if (this.isConnected()) {
      await this.hubConnection.invoke('SendMessage', Number(roomId), JSON.stringify({
        type: 'stateChange',
        eventType: eventType,
        payload: payload
      })).catch(err => console.warn('broadcastStateChange fallback error:', err));
    }
  }

  public async sendMessage(roomId: number | string, message: string): Promise<void> {
    if (this.isConnected()) {
      await this.hubConnection.invoke('SendMessage', Number(roomId), message);
    }
  }

  // Backend: SendSignal(int roomId, string targetUserId, string signalData)
  public async sendSignal(roomId: number | string, targetUserId: string, signalData: any): Promise<void> {
    if (this.isConnected()) {
      const dataString = typeof signalData === 'string' ? signalData : JSON.stringify(signalData);
      await this.hubConnection.invoke('SendSignal', Number(roomId), targetUserId, dataString);
    }
  }

  // --- ALIASES FOR BACKWARD COMPATIBILITY ---
  public async joinRoom(roomId: number | string): Promise<void> {
    return this.joinSpaceGroup(roomId);
  }

  public async leaveRoom(roomId: number | string): Promise<void> {
    return this.leaveSpaceGroup(roomId);
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  public stopConnection(): void {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}