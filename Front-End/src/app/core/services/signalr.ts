// core/services/signalr.ts

import { Injectable, NgZone } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';


// ============================================================
// MEDIA STATE
// ============================================================

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


// ============================================================
// WEBRTC SIGNAL
// ============================================================

export interface SignalReceived {
  fromUserId: string;
  signalData: string;
}


// ============================================================
// SIGNALR SERVICE
// ============================================================

@Injectable({
  providedIn: 'root',
})
export class SignalRService {

  private hubConnection?: signalR.HubConnection;

  private eventsRegistered = false;

  // ==========================================================
  // EVENTS
  // ==========================================================

  public remoteUserJoined$ =
    new Subject<number | string>();

  public remoteUserLeft$ =
    new Subject<number | string>();

  public receiveSignal$ =
    new Subject<SignalReceived>();

  public receiveMessage$ =
    new Subject<any>();

  public spaceStateUpdated$ =
    new Subject<SpaceStateUpdate>();

  /**
   * Emits after `withAutomaticReconnect` successfully restores the connection.
   *
   * IMPORTANT: automatic reconnect gets a brand-new SignalR connection ID, which means
   * the client silently falls out of every group (e.g. "Space_123") it was in before the
   * drop - the server has no way to know the new connection should be back in that group.
   * Anyone listening to this must explicitly rejoin the room (call joinRoom again) or
   * signaling will look "connected" while quietly not working until a manual refresh.
   */
  public reconnected$ = new Subject<void>();

  /** Emits when the connection drops (either entering the automatic-reconnect retry loop,
   *  or closing for good after retries are exhausted). Useful for showing a "reconnecting..."
   *  indicator in the UI. */
  public connectionLost$ = new Subject<void>();


  constructor(
    private ngZone: NgZone
  ) {}


  // ==========================================================
  // START CONNECTION
  // ==========================================================

  public async startConnection(): Promise<void> {

    // Already connected.
    if (
      this.hubConnection?.state ===
      signalR.HubConnectionState.Connected
    ) {
      console.log('🟢 SignalR already connected');
      return;
    }

    // Currently connecting.
    if (
      this.hubConnection?.state ===
      signalR.HubConnectionState.Connecting
    ) {
      console.log('⏳ SignalR is already connecting');
      return;
    }

    const hubUrl =
      `${environment.apiUrl.replace('/api', '')}/hubs/spaces`;

    const token = localStorage.getItem('token');

    console.log(
      '🔑 SignalR token:',
      token ? 'present' : 'MISSING'
    );

    this.hubConnection =
      new signalR.HubConnectionBuilder()
        .withUrl(hubUrl, {
          accessTokenFactory: () =>
            localStorage.getItem('token') || '',

          // Keep your existing transport.
          transport:
            signalR.HttpTransportType.LongPolling
        })
        .withAutomaticReconnect([0, 2000, 5000, 10000, 15000])
        .build();


    this.registerSignalREvents();
    this.registerConnectionLifecycleEvents();


    await this.hubConnection.start();

    console.log('🟢 SignalR connected');
  }


  // ==========================================================
  // CONNECTION LIFECYCLE (reconnect handling)
  // ==========================================================

  private registerConnectionLifecycleEvents(): void {
    if (!this.hubConnection) return;

    this.hubConnection.onreconnecting((error) => {
      console.warn('🟡 SignalR reconnecting...', error);
      this.ngZone.run(() => this.connectionLost$.next());
    });

    this.hubConnection.onreconnected((connectionId) => {
      console.log('🟢 SignalR reconnected with new connection id:', connectionId);
      this.ngZone.run(() => this.reconnected$.next());
    });

    this.hubConnection.onclose((error) => {
      console.error('🔴 SignalR connection closed:', error);
      this.ngZone.run(() => this.connectionLost$.next());
    });
  }


  // ==========================================================
  // SIGNALR EVENTS
  // ==========================================================

  private registerSignalREvents(): void {

    if (!this.hubConnection) {
      return;
    }

    // Prevent duplicate handlers.
    if (this.eventsRegistered) {
      return;
    }

    this.eventsRegistered = true;


    // ========================================================
    // USER JOINED
    // ========================================================

    this.hubConnection.on(
      'UserJoinedSpace',
      (
        data: {
          userId: number | string;
          isNewUser: boolean;
        }
      ) => {

        console.log(
          '👤 User joined:',
          data.userId,
          'isNewUser:',
          data.isNewUser
        );

        this.ngZone.run(() => {

          this.remoteUserJoined$
            .next(data.userId);

        });
      }
    );


    // ========================================================
    // USER LEFT
    // ========================================================

    this.hubConnection.on(
      'UserLeftSpace',
      (userId: number | string) => {

        console.log(
          '👋 User left:',
          userId
        );

        this.ngZone.run(() => {

          this.remoteUserLeft$
            .next(userId);

        });
      }
    );


    // ========================================================
    // CHAT
    // ========================================================

    this.hubConnection.on(
      'ReceiveMessage',
      (messageData: any) => {

        console.log(
          '💬 Message received:',
          messageData
        );

        this.ngZone.run(() => {

          this.receiveMessage$
            .next(messageData);

        });
      }
    );


    // ========================================================
    // MEDIA STATE
    // ========================================================

    this.hubConnection.on(
      'SpaceStateUpdated',
      (data: any) => {

        console.log(
          '🔔 SpaceStateUpdated received:',
          JSON.stringify(data)
        );

        this.ngZone.run(() => {

          const targetUserId =
            Number(data?.userId);

          const mediaState =
            data?.mediaState;

          if (
            targetUserId &&
            mediaState
          ) {

            this.spaceStateUpdated$
              .next({
                userId: targetUserId,
                mediaState
              });
          }
        });
      }
    );


    // ========================================================
    // WEBRTC SIGNAL
    // ========================================================

    this.hubConnection.on(
      'ReceiveSignal',
      (
        fromUserId: string,
        signalData: string
      ) => {

        console.log(
          '📶 Signal received from:',
          fromUserId
        );

        this.ngZone.run(() => {

          this.receiveSignal$
            .next({
              fromUserId,
              signalData
            });

        });
      }
    );
  }


  // ==========================================================
  // JOIN SPACE
  // ==========================================================

  public async joinSpaceGroup(
    roomId: number | string
  ): Promise<string[]> {

    if (!this.isConnected()) {
      console.warn(
        '⚠️ SignalR not connected'
      );

      return [];
    }

    const existingUsers =
      await this.hubConnection!.invoke<string[]>(
        'JoinSpaceGroup',
        Number(roomId)
      );

    console.log(
      '👥 Existing users when I joined:',
      existingUsers
    );

    return existingUsers || [];
  }


  // ==========================================================
  // LEAVE SPACE
  // ==========================================================

  public async leaveSpaceGroup(
    roomId: number | string
  ): Promise<void> {

    if (this.isConnected()) {

      await this.hubConnection!.invoke(
        'LeaveSpaceGroup',
        Number(roomId)
      );
    }
  }


  // ==========================================================
  // MEDIA STATE
  // ==========================================================

  public async toggleMediaState(
    roomId: number | string,
    payload: MediaStatePayload
  ): Promise<void> {

    if (!this.isConnected()) {

      console.warn(
        '⚠️ SignalR not connected, cannot send ToggleMediaState'
      );

      return;
    }

    console.log(
      '📤 Sending ToggleMediaState:',
      {
        roomId: Number(roomId),
        payload
      }
    );

    try {

      await this.hubConnection!.invoke(
        'ToggleMediaState',
        Number(roomId),
        payload
      );

      console.log(
        '✅ ToggleMediaState sent successfully'
      );

    } catch (err) {

      console.error(
        '❌ ToggleMediaState failed:',
        err
      );
    }
  }


  // ==========================================================
  // BROADCAST STATE CHANGE
  // ==========================================================

  public async broadcastStateChange(
    roomId: number | string,
    eventType: string,
    payload: any
  ): Promise<void> {

    if (this.isConnected()) {

      await this.hubConnection!.invoke(
        'SendMessage',
        Number(roomId),
        JSON.stringify({
          type: 'stateChange',
          eventType,
          payload
        })
      ).catch(err =>
        console.warn(
          'broadcastStateChange fallback error:',
          err
        )
      );
    }
  }


  // ==========================================================
  // CHAT MESSAGE
  // ==========================================================

  public async sendMessage(
    roomId: number | string,
    message: string
  ): Promise<void> {

    if (this.isConnected()) {

      await this.hubConnection!.invoke(
        'SendMessage',
        Number(roomId),
        message
      );
    }
  }


  // ==========================================================
  // WEBRTC SIGNAL
  // ==========================================================

  public async sendSignal(
    roomId: number | string,
    targetUserId: string,
    signalData: any
  ): Promise<void> {

    if (!this.isConnected()) {

      console.warn(
        '⚠️ SignalR not connected, cannot send WebRTC signal'
      );

      return;
    }

    const dataString =
      typeof signalData === 'string'
        ? signalData
        : JSON.stringify(signalData);

    try {

      await this.hubConnection!.invoke(
        'SendSignal',
        Number(roomId),
        targetUserId,
        dataString
      );

    } catch (error) {

      console.error(
        `❌ Failed sending signal to ${targetUserId}:`,
        error
      );
    }
  }


  // ==========================================================
  // BACKWARD COMPATIBILITY
  // ==========================================================

  public async joinRoom(
    roomId: number | string
  ): Promise<string[]> {

    return this.joinSpaceGroup(roomId);
  }


  public async leaveRoom(
    roomId: number | string
  ): Promise<void> {

    return this.leaveSpaceGroup(roomId);
  }


  // ==========================================================
  // CONNECTION STATUS
  // ==========================================================

  public isConnected(): boolean {

    return (
      this.hubConnection?.state ===
      signalR.HubConnectionState.Connected
    );
  }


  // ==========================================================
  // STOP
  // ==========================================================

  public async stopConnection(): Promise<void> {

    if (this.hubConnection) {

      await this.hubConnection.stop();

      this.hubConnection = undefined;

      this.eventsRegistered = false;

      console.log(
        '🔴 SignalR stopped'
      );
    }
  }
}