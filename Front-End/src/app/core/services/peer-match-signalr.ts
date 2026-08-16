// core/services/peer-match-signalr.service.ts

import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

export interface PeerSignal {
  fromUserId: string;
  signalData: string;
}

@Injectable({ providedIn: 'root' })
export class PeerMatchSignalRService {
  private hubConnection?: signalR.HubConnection;
  private eventsRegistered = false;

  public remoteUserJoined$ = new Subject<number | string>();
  public remoteUserLeft$ = new Subject<number | string>();
  public receiveSignal$ = new Subject<PeerSignal>();
  public reconnected$ = new Subject<void>();

  constructor(private ngZone: NgZone) {}

  public async startConnection(): Promise<void> {
    // Already connected
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      return;
    }

    // Replace with your actual GuzoHub route
    const hubUrl = `${environment.apiUrl.replace('/api', '')}/hubs/guzo`;

    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(hubUrl, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
        transport: signalR.HttpTransportType.LongPolling   // keeps behavior consistent with Spaces
      })
      .withAutomaticReconnect([0, 2000, 5000, 10000, 15000])
      .build();

    this.registerEvents();
    this.registerLifecycleEvents();

    await this.hubConnection.start();
    console.log('🟢 Peer Match SignalR connected');
  }

  // ============================================================
  // EVENT REGISTRATION
  // ============================================================

  private registerEvents(): void {
    if (!this.hubConnection || this.eventsRegistered) return;
    this.eventsRegistered = true;

    this.hubConnection.on('UserJoined', (userId: number | string) => {
      console.log('👤 Peer Match user joined:', userId);
      this.ngZone.run(() => this.remoteUserJoined$.next(userId));
    });

    this.hubConnection.on('UserLeft', (userId: number | string) => {
      console.log('👋 Peer Match user left:', userId);
      this.ngZone.run(() => this.remoteUserLeft$.next(userId));
    });

    this.hubConnection.on('ReceiveSignal', (fromUserId: string, signalData: string) => {
      console.log('📶 Peer Match signal from:', fromUserId);
      this.ngZone.run(() => this.receiveSignal$.next({ fromUserId, signalData }));
    });
  }

  // ============================================================
  // RECONNECT LIFECYCLE
  // ============================================================

  private registerLifecycleEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting(() => {
      console.warn('🟡 Peer Match SignalR reconnecting...');
    });

    this.hubConnection.onreconnected((connectionId: string | undefined) => {
      console.log('🟢 Peer Match SignalR reconnected:', connectionId);
      this.ngZone.run(() => this.reconnected$.next());
    });

    this.hubConnection.onclose(() => {
      console.warn('🔴 Peer Match SignalR closed');
    });
  }

  // ============================================================
  // HUB METHODS
  // ============================================================

  public async joinRoom(roomId: string): Promise<string[]> {
    if (!this.isConnected()) return [];
    const existingUsers = await this.hubConnection!.invoke<string[]>('JoinRoom', roomId);
    console.log('👥 Existing peer users when I joined:', existingUsers);
    return existingUsers || [];
  }

  public async leaveRoom(roomId: string): Promise<void> {
    if (this.isConnected()) {
      await this.hubConnection!.invoke('LeaveRoom', roomId);
    }
  }

  public async sendSignal(
    roomId: string,
    targetUserId: string,
    signalData: any
  ): Promise<void> {
    if (!this.isConnected()) return;

    const dataString = typeof signalData === 'string' ? signalData : JSON.stringify(signalData);
    await this.hubConnection!.invoke('SendSignal', roomId, targetUserId, dataString);
  }

  // ============================================================
  // STATUS & CLEANUP
  // ============================================================

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  public async stopConnection(): Promise<void> {
    if (this.hubConnection) {
      await this.hubConnection.stop();
      this.hubConnection = undefined;
      this.eventsRegistered = false;
      console.log('🔴 Peer Match SignalR stopped');
    }
  }
}