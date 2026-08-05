// features/space/models/space.models.ts

// ==========================================
// EXISTING MODELS (Keep as-is)
// ==========================================

export interface RoomCategory {
  id: number;
  name: string;
  slug: string;
  icon: string;
}

export interface CreateSpaceRequest {
  title: string;
  categoryId: number;
  isPublic: boolean;
  password?: string;
  maxParticipants: number;
  allowVideo: boolean;
  allowScreenShare: boolean;
}

export interface Space {
  id: number;
  title: string;
  host?: string;
  category?: string;
  categoryId?: number;
  tags?: string[];
  participants?: number;
  maxParticipants: number;
  isPublic: boolean;
  avatars?: string[];
}

// ==========================================
// NEW MODELS FOR ROOM FEATURE
// ==========================================

export interface RoomParticipant {
  userId: number;
  fullName: string;
  profilePictureUrl?: string;
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
  isSpeaking?: boolean;
}

export interface RoomData {
  id: number;
  title: string;
  hostUserId: number;
  hostFullName: string;
  category: string;
  categoryId?: number;
  maxParticipants: number;
  allowVideo: boolean;
  allowScreenShare: boolean;
  isPublic: boolean;
  participants: RoomParticipant[];
}

export interface ChatMessage {
  id?: number;
  senderFullName?: string;
  senderUserId?: string | number;
  content: string;
  sentAt: string | Date;
  isSystem?: boolean;
}

export interface MediaState {
  isMuted: boolean;
  isVideoOn: boolean;
  isScreenSharing: boolean;
  isHandRaised: boolean;
}

export interface SignalData {
  type: 'offer' | 'answer' | 'ice-candidate';
  senderUserId: number;
  targetUserId: number;
  data: any;
}