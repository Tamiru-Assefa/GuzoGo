import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { Subject } from 'rxjs';
import { environment } from '../../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class SignalRService {
  private hubConnection!: signalR.HubConnection;

  // RxJS Subjects for event streams
  public remoteUserJoined$ = new Subject<number>();
  public remoteUserLeft$ = new Subject<string>();
  public receiveSignal$ = new Subject<{ signalType: string; data: string }>();
  public receiveMessage$ = new Subject<{ userName: string; message: string; timestamp: string }>();

  public startConnection(): Promise<void> {
    this.hubConnection = new signalR.HubConnectionBuilder()
      .withUrl(`${environment.apiUrl.replace('/api', '')}/guzoHub`, {
        accessTokenFactory: () => localStorage.getItem('token') || '',
      })
      .withAutomaticReconnect()
      .build();

    this.registerSignalREvents();

    return this.hubConnection.start();
  }

  private registerSignalREvents() {
    // Matches GuzoHub: await Clients.Group(roomId).SendAsync("UserJoined", userId);
    this.hubConnection.on('UserJoined', (userId: number) => {
      this.remoteUserJoined$.next(userId);
    });

    // Matches GuzoHub: await Clients.Group(roomId).SendAsync("UserLeft", connectionId);
    this.hubConnection.on('UserLeft', (connectionId: string) => {
      this.remoteUserLeft$.next(connectionId);
    });

    // Matches GuzoHub: await Clients.OthersInGroup(roomId).SendAsync("ReceiveSignal", signalType, data);
    this.hubConnection.on('ReceiveSignal', (signalType: string, data: string) => {
      this.receiveSignal$.next({ signalType, data });
    });

    // Matches GuzoHub: await Clients.Group(roomId).SendAsync("ReceiveMessage", userName, message, timestamp);
    this.hubConnection.on('ReceiveMessage', (userName: string, message: string, timestamp: string) => {
      this.receiveMessage$.next({ userName, message, timestamp });
    });
  }

  // GuzoHub expects JoinRoom(string roomId)
  public async joinRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('JoinRoom', roomId);
    }
  }

  // GuzoHub expects LeaveRoom(string roomId)
  public async leaveRoom(roomId: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('LeaveRoom', roomId);
    }
  }

  // GuzoHub expects SendSignal(string roomId, string signalType, string data)
  public async sendSignal(roomId: string, signalType: string, data: any): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      const dataString = typeof data === 'string' ? data : JSON.stringify(data);
      await this.hubConnection.invoke('SendSignal', roomId, signalType, dataString);
    }
  }

  // GuzoHub expects SendMessage(string roomId, string message)
  public async sendMessage(roomId: string, message: string): Promise<void> {
    if (this.hubConnection?.state === signalR.HubConnectionState.Connected) {
      await this.hubConnection.invoke('SendMessage', roomId, message);
    }
  }

  public isConnected(): boolean {
    return this.hubConnection?.state === signalR.HubConnectionState.Connected;
  }

  public stopConnection() {
    if (this.hubConnection) {
      this.hubConnection.stop();
    }
  }
}