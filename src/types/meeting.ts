export type ConnectionStatus =
  | "idle"
  | "requesting-media"
  | "connecting"
  | "waiting"
  | "connected"
  | "room-full"
  | "error"
  | "left";

export interface ParticipantInfo {
  id: string;
  name: string;
  isSelf: boolean;
  isHost: boolean;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  speaking: boolean;
  connected: boolean;
}

export interface ChatMessage {
  id: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isSelf: boolean;
}

export interface FileTransferMeta {
  transferId: string;
  name: string;
  size: number;
  mime: string;
  senderId: string;
  senderName: string;
}

export interface FileTransferState extends FileTransferMeta {
  progress: number; // 0-1
  status: "sending" | "receiving" | "done" | "failed";
  url?: string;
  isSelf: boolean;
  timestamp: number;
}

export interface RecordingNotice {
  senderId: string;
  senderName: string;
  active: boolean;
}

/** App-level protocol carried over each PeerJS DataConnection. */
export type ProtocolMessage =
  | { type: "roster"; participants: { id: string; name: string }[] }
  | { type: "peer-joined"; id: string; name: string }
  | { type: "peer-left"; id: string }
  | { type: "room-full" }
  | {
      type: "chat";
      id: string;
      text: string;
      senderId: string;
      senderName: string;
      timestamp: number;
    }
  | {
      type: "file-meta";
      transferId: string;
      name: string;
      size: number;
      mime: string;
      senderId: string;
      senderName: string;
    }
  | {
      type: "file-chunk";
      transferId: string;
      index: number;
      total: number;
      data: ArrayBuffer;
    }
  | { type: "file-done"; transferId: string }
  | { type: "recording-start"; senderId: string; senderName: string }
  | { type: "recording-stop"; senderId: string }
  | {
      type: "media-state";
      senderId: string;
      micOn: boolean;
      camOn: boolean;
      screenSharing: boolean;
    };

export const MAX_PARTICIPANTS_OPTIONS = [2, 3, 4, 5, 6] as const;
export const DEFAULT_MAX_PARTICIPANTS = 2;
export const FILE_CHUNK_SIZE = 16 * 1024; // 16KB, safe for RTCDataChannel
export const JOIN_TIMEOUT_MS = 25_000;
