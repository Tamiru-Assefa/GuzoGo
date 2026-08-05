// features/space/services/spaces.service.ts

import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { RoomCategory, CreateSpaceRequest, Space } from '../models/space.models';

export interface UpdateMediaStateRequest {
  isMuted?: boolean;
  isVideoOn?: boolean;
  isScreenSharing?: boolean;
  isHandRaised?: boolean;
}

export interface ChatMessageResponse {
  id: number;
  senderUserId: number;
  senderFullName: string;
  content: string;
  sentAt: string;
  isSystem?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class SpacesService {
  private readonly baseUrl = `${environment.apiUrl}/Spaces`;

  constructor(private http: HttpClient) {}

  /** Helper to construct Auth Headers */
  private getAuthHeaders(): { headers: HttpHeaders } {
    const token = localStorage.getItem('token');
    return {
      headers: new HttpHeaders({
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token || ''}`
      })
    };
  }

  // --- Category & Space CRUD ---

  public getCategories(): Observable<RoomCategory[]> {
    return this.http.get<RoomCategory[]>(`${this.baseUrl}/categories`, this.getAuthHeaders());
  }

  public getSpaces(): Observable<Space[]> {
    return this.http.get<Space[]>(this.baseUrl, this.getAuthHeaders());
  }

  public createSpace(payload: CreateSpaceRequest): Observable<Space> {
    return this.http.post<Space>(this.baseUrl, payload, this.getAuthHeaders());
  }

  // --- Room Live Interaction Endpoints ---

  public getRoomById(roomId: number): Observable<any> {
    return this.http.get<any>(`${this.baseUrl}/${roomId}`, this.getAuthHeaders());
  }

  public joinRoom(roomId: number, password?: string): Observable<boolean> {
    return this.http.post<boolean>(
      `${this.baseUrl}/${roomId}/join`, 
      { password }, 
      this.getAuthHeaders()
    );
  }

  public leaveRoom(roomId: number): Observable<any> {
    return this.http.post<any>(
      `${this.baseUrl}/${roomId}/leave`, 
      {}, 
      this.getAuthHeaders()
    );
  }

  public toggleMedia(roomId: number, mediaState: UpdateMediaStateRequest): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl}/${roomId}/toggle-media`, 
    mediaState, 
    this.getAuthHeaders()
  );
}

  // --- Live Chat Endpoints ---

  public getRoomMessages(roomId: number): Observable<ChatMessageResponse[]> {
    return this.http.get<ChatMessageResponse[]>(
      `${this.baseUrl}/${roomId}/messages`, 
      this.getAuthHeaders()
    );
  }

  public sendMessage(roomId: number, content: string): Observable<ChatMessageResponse> {
    return this.http.post<ChatMessageResponse>(
      `${this.baseUrl}/${roomId}/messages`, 
      { content }, 
      this.getAuthHeaders()
    );
  }

  public kickParticipant(roomId: number, targetUserId: number): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl}/${roomId}/kick/${targetUserId}`, 
    {}, 
    this.getAuthHeaders()
  );
}

// In spaces.service.ts, add this method:

public muteParticipant(roomId: number, targetUserId: number, isMuted: boolean): Observable<any> {
  return this.http.post<any>(
    `${this.baseUrl}/${roomId}/mute/${targetUserId}?isMuted=${isMuted}`, 
    {}, 
    this.getAuthHeaders()
  );
}
}