import Peer, { type DataConnection, type MediaConnection } from "peerjs";
import { generateShortCode } from "./shortCode";
import type {
  ChatMessage,
  ConnectionStatus,
  FileTransferState,
  ParticipantInfo,
  ProtocolMessage,
  RecordingNotice,
} from "@/types/meeting";
import { FILE_CHUNK_SIZE, JOIN_TIMEOUT_MS } from "@/types/meeting";

const PEER_OPTIONS = {
  config: {
    iceServers: [
      { urls: "stun:stun.l.google.com:19302" },
      { urls: "stun:stun1.l.google.com:19302" },
      { urls: "stun:stun.cloudflare.com:3478" },
    ],
  },
  debug: 1,
} as const;

const HOST_ID_ATTEMPTS = 6;

interface ParticipantEntry {
  id: string;
  name: string;
  isHost: boolean;
  dataConn?: DataConnection;
  mediaConn?: MediaConnection;
  stream?: MediaStream;
  micOn: boolean;
  camOn: boolean;
  screenSharing: boolean;
  connected: boolean;
}

interface IncomingFile {
  meta: {
    transferId: string;
    name: string;
    size: number;
    mime: string;
    senderId: string;
    senderName: string;
  };
  chunks: ArrayBuffer[];
  received: number;
}

type EventMap = {
  status: ConnectionStatus;
  "status-message": string;
  notice: string;
  participants: ParticipantInfo[];
  chat: ChatMessage;
  file: FileTransferState;
  "recording-notice": RecordingNotice;
  "local-stream": MediaStream | null;
  "screen-stream": MediaStream | null;
  "meeting-code": string;
};

class Emitter<T extends Record<string, unknown>> {
  private listeners = new Map<keyof T, Set<(payload: T[keyof T]) => void>>();

  on<K extends keyof T>(event: K, cb: (payload: T[K]) => void): () => void {
    if (!this.listeners.has(event)) this.listeners.set(event, new Set());
    this.listeners.get(event)!.add(cb as (payload: T[keyof T]) => void);
    return () => this.listeners.get(event)?.delete(cb as (payload: T[keyof T]) => void);
  }

  protected emit<K extends keyof T>(event: K, payload: T[K]) {
    this.listeners.get(event)?.forEach((cb) => cb(payload));
  }
}

function isPeerJsError(err: unknown): err is { type: string; message?: string } {
  return typeof err === "object" && err !== null && "type" in err;
}

export class PeerMeetingClient extends Emitter<EventMap> {
  private peer: Peer | null = null;
  private selfId = "";
  private selfName: string;
  private hostId = "";
  private isHost = false;
  private maxParticipants = 2;
  private participants = new Map<string, ParticipantEntry>();
  private localStream: MediaStream | null = null;
  private micOn = true;
  private camOn = true;
  private screenSharing = false;
  private screenStream: MediaStream | null = null;
  private originalCamTrack: MediaStreamTrack | null = null;
  private recording: { recorder: MediaRecorder; stream: MediaStream } | null = null;
  private incomingFiles = new Map<string, IncomingFile>();
  private status: ConnectionStatus = "idle";

  constructor(name: string) {
    super();
    this.selfName = name;
  }

  getSelfId() {
    return this.selfId;
  }

  isRecording() {
    return this.recording !== null;
  }

  isScreenSharing() {
    return this.screenSharing;
  }

  // ---------- lifecycle: start / join ----------

  async startMeeting(maxParticipants: number): Promise<string> {
    this.isHost = true;
    this.maxParticipants = maxParticipants;
    this.setStatus("requesting-media", "Requesting camera & microphone…");
    await this.acquireLocalMedia();

    this.setStatus("connecting", "Creating your meeting…");
    let lastErr: unknown;
    for (let attempt = 0; attempt < HOST_ID_ATTEMPTS; attempt++) {
      const code = generateShortCode();
      try {
        this.peer = await this.createPeerInstance(code);
        this.selfId = code;
        this.hostId = code;
        this.setupPeerListeners();
        this.setStatus("waiting", "Waiting for people to join…");
        this.emit("meeting-code", code);
        this.emitParticipants();
        return code;
      } catch (err) {
        lastErr = err;
        if (isPeerJsError(err) && err.type === "unavailable-id") continue;
        break;
      }
    }
    this.setStatus("error", "Could not create a meeting right now. Please try again.");
    throw lastErr ?? new Error("Failed to allocate a meeting code");
  }

  async joinMeeting(hostCode: string): Promise<void> {
    this.isHost = false;
    this.hostId = hostCode;
    this.emit("meeting-code", hostCode);
    this.setStatus("requesting-media", "Requesting camera & microphone…");
    await this.acquireLocalMedia();

    this.setStatus("connecting", "Connecting to meeting…");
    try {
      this.peer = await this.createPeerInstance(undefined);
    } catch {
      this.setStatus("error", "Could not connect right now. Please try again.");
      throw new Error("Failed to create local peer");
    }
    this.selfId = this.peer.id;
    this.setupPeerListeners();

    const entry = this.getOrCreateEntry(hostCode, "Host", true);
    const dataConn = this.peer.connect(hostCode, {
      reliable: true,
      metadata: { name: this.selfName },
    });
    this.wireDataConnection(entry, dataConn);
    const call = this.peer.call(hostCode, this.getOutgoingStream());
    this.wireMediaConnection(entry, call);

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => reject(new Error("timeout")), JOIN_TIMEOUT_MS);
      const unsubStatus = this.on("status", (s) => {
        if (s === "connected") {
          clearTimeout(timeout);
          unsubStatus();
          resolve();
        } else if (s === "room-full" || s === "error") {
          clearTimeout(timeout);
          unsubStatus();
          reject(new Error(s));
        }
      });
    }).catch((err) => {
      if ((err as Error).message === "timeout") {
        this.setStatus(
          "error",
          "Couldn't reach that meeting. Check the code, or ask the host to resend it.",
        );
      }
      throw err;
    });
  }

  leave() {
    this.stopRecording();
    if (this.screenSharing) this.stopScreenShare();
    for (const entry of this.participants.values()) {
      entry.dataConn?.close();
      entry.mediaConn?.close();
    }
    this.participants.clear();
    this.localStream?.getTracks().forEach((t) => t.stop());
    this.localStream = null;
    this.peer?.destroy();
    this.peer = null;
    this.setStatus("left", "You left the meeting.");
  }

  // ---------- peer / connection plumbing ----------

  private createPeerInstance(id: string | undefined): Promise<Peer> {
    return new Promise((resolve, reject) => {
      const peer = id ? new Peer(id, PEER_OPTIONS) : new Peer(PEER_OPTIONS);
      const onOpen = () => {
        cleanup();
        resolve(peer);
      };
      const onError = (err: unknown) => {
        cleanup();
        peer.destroy();
        reject(err);
      };
      const cleanup = () => {
        peer.off("open", onOpen);
        peer.off("error", onError);
      };
      peer.on("open", onOpen);
      peer.on("error", onError);
    });
  }

  private setupPeerListeners() {
    if (!this.peer) return;
    this.peer.on("connection", (conn) => this.handleIncomingDataConnection(conn));
    this.peer.on("call", (call) => this.handleIncomingCall(call));
    this.peer.on("error", (err) => {
      if (isPeerJsError(err) && err.type === "peer-unavailable") {
        // A mesh-link attempt to someone who already left; not fatal.
        return;
      }
      console.error("PeerJS error", err);
    });
  }

  private handleIncomingDataConnection(conn: DataConnection) {
    const peerId = conn.peer;
    const name = (conn.metadata as { name?: string } | undefined)?.name ?? "Guest";

    if (this.isHost && !this.participants.has(peerId)) {
      const activeCount = [...this.participants.values()].filter((p) => p.connected).length;
      if (activeCount + 1 >= this.maxParticipants) {
        conn.on("open", () => {
          conn.send({ type: "room-full" } satisfies ProtocolMessage);
          setTimeout(() => conn.close(), 400);
        });
        return;
      }
    }

    const entry = this.getOrCreateEntry(peerId, name, peerId === this.hostId);
    this.wireDataConnection(entry, conn);
  }

  private handleIncomingCall(call: MediaConnection) {
    const peerId = call.peer;
    const entry = this.getOrCreateEntry(peerId, "Guest", peerId === this.hostId);
    call.answer(this.getOutgoingStream());
    this.wireMediaConnection(entry, call);
  }

  private getOrCreateEntry(id: string, name: string, isHost: boolean): ParticipantEntry {
    let entry = this.participants.get(id);
    if (!entry) {
      entry = {
        id,
        name,
        isHost,
        micOn: true,
        camOn: true,
        screenSharing: false,
        connected: false,
      };
      this.participants.set(id, entry);
    } else if (name && name !== "Guest") {
      entry.name = name;
    }
    return entry;
  }

  private wireDataConnection(entry: ParticipantEntry, conn: DataConnection) {
    entry.dataConn = conn;
    conn.on("open", () => {
      entry.connected = true;
      this.emitParticipants();

      if (this.isHost && entry.id !== this.hostId) {
        const others = [...this.participants.values()].filter(
          (p) => p.connected && p.id !== entry.id,
        );
        conn.send({
          type: "roster",
          participants: [
            { id: this.selfId, name: this.selfName },
            ...others.map((p) => ({ id: p.id, name: p.name })),
          ],
        } satisfies ProtocolMessage);

        for (const other of others) {
          other.dataConn?.send({
            type: "peer-joined",
            id: entry.id,
            name: entry.name,
          } satisfies ProtocolMessage);
        }

        this.setStatus("connected", "Connected");
      }

      if (!this.isHost && entry.id === this.hostId) {
        this.setStatus("connected", "Connected");
      }
    });

    conn.on("data", (data) => this.handleMessage(entry.id, data as ProtocolMessage));
    conn.on("close", () => this.handlePeerDisconnect(entry.id));
    conn.on("error", () => this.handlePeerDisconnect(entry.id));
  }

  private wireMediaConnection(entry: ParticipantEntry, call: MediaConnection) {
    entry.mediaConn = call;
    call.on("stream", (remoteStream) => {
      entry.stream = remoteStream;
      this.emitParticipants();
    });
    call.on("close", () => {
      entry.stream = undefined;
      this.emitParticipants();
    });
  }

  private handlePeerDisconnect(peerId: string) {
    const entry = this.participants.get(peerId);
    if (!entry) return;
    entry.dataConn?.close();
    entry.mediaConn?.close();
    this.participants.delete(peerId);
    this.emitParticipants();

    if (this.isHost) {
      this.broadcast({ type: "peer-left", id: peerId });
    }

    if (!this.isHost && peerId === this.hostId && this.status === "connected") {
      this.emit(
        "notice",
        "The host left the meeting. No new participants can join, but you can keep talking to whoever's still connected.",
      );
    }
  }

  // ---------- protocol message handling ----------

  private handleMessage(fromId: string, msg: ProtocolMessage) {
    switch (msg.type) {
      case "roster": {
        for (const p of msg.participants) {
          if (p.id === this.selfId || this.participants.has(p.id)) continue;
          const entry = this.getOrCreateEntry(p.id, p.name, p.id === this.hostId);
          if (this.selfId < p.id) {
            this.connectToPeer(entry);
          }
        }
        this.emitParticipants();
        break;
      }
      case "peer-joined": {
        if (msg.id === this.selfId || this.participants.has(msg.id)) return;
        const entry = this.getOrCreateEntry(msg.id, msg.name, false);
        if (this.selfId < msg.id) {
          this.connectToPeer(entry);
        }
        this.emitParticipants();
        break;
      }
      case "peer-left": {
        this.handlePeerDisconnect(msg.id);
        break;
      }
      case "room-full": {
        this.setStatus("room-full", "This meeting is full.");
        this.leave();
        break;
      }
      case "chat": {
        this.emit("chat", {
          id: msg.id,
          senderId: msg.senderId,
          senderName: msg.senderName,
          text: msg.text,
          timestamp: msg.timestamp,
          isSelf: false,
        });
        break;
      }
      case "file-meta": {
        this.incomingFiles.set(msg.transferId, {
          meta: msg,
          chunks: [],
          received: 0,
        });
        this.emit("file", {
          transferId: msg.transferId,
          name: msg.name,
          size: msg.size,
          mime: msg.mime,
          senderId: msg.senderId,
          senderName: msg.senderName,
          progress: 0,
          status: "receiving",
          isSelf: false,
          timestamp: Date.now(),
        });
        break;
      }
      case "file-chunk": {
        const incoming = this.incomingFiles.get(msg.transferId);
        if (!incoming) return;
        incoming.chunks[msg.index] = msg.data;
        incoming.received += msg.data.byteLength;
        this.emit("file", {
          ...incoming.meta,
          progress: Math.min(0.99, incoming.received / incoming.meta.size),
          status: "receiving",
          isSelf: false,
          timestamp: Date.now(),
        });
        break;
      }
      case "file-done": {
        const incoming = this.incomingFiles.get(msg.transferId);
        if (!incoming) return;
        const blob = new Blob(incoming.chunks, { type: incoming.meta.mime });
        const url = URL.createObjectURL(blob);
        this.emit("file", {
          ...incoming.meta,
          progress: 1,
          status: "done",
          isSelf: false,
          url,
          timestamp: Date.now(),
        });
        this.incomingFiles.delete(msg.transferId);
        break;
      }
      case "recording-start": {
        this.emit("recording-notice", {
          senderId: msg.senderId,
          senderName: msg.senderName,
          active: true,
        });
        break;
      }
      case "recording-stop": {
        this.emit("recording-notice", {
          senderId: msg.senderId,
          senderName: "",
          active: false,
        });
        break;
      }
      case "media-state": {
        const entry = this.participants.get(fromId);
        if (!entry) return;
        entry.micOn = msg.micOn;
        entry.camOn = msg.camOn;
        entry.screenSharing = msg.screenSharing;
        this.emitParticipants();
        break;
      }
    }
  }

  private connectToPeer(entry: ParticipantEntry) {
    if (!this.peer || entry.dataConn) return;
    const dataConn = this.peer.connect(entry.id, {
      reliable: true,
      metadata: { name: this.selfName },
    });
    this.wireDataConnection(entry, dataConn);
    const call = this.peer.call(entry.id, this.getOutgoingStream());
    this.wireMediaConnection(entry, call);
  }

  private broadcast(msg: ProtocolMessage) {
    for (const entry of this.participants.values()) {
      if (entry.connected) entry.dataConn?.send(msg);
    }
  }

  // ---------- media ----------

  private async acquireLocalMedia() {
    try {
      this.localStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true,
      });
    } catch {
      try {
        this.localStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        this.camOn = false;
      } catch {
        this.localStream = new MediaStream();
        this.camOn = false;
        this.micOn = false;
      }
    }
    this.emit("local-stream", this.localStream);
  }

  private getOutgoingStream(): MediaStream {
    // While screen sharing, any *new* connection (a peer joining mid-share)
    // must start with the screen track, not the stale camera track — already
    // connected peers get the swap via replaceTrack in startScreenShare().
    if (this.screenSharing && this.screenStream) {
      const outgoing = new MediaStream();
      const screenTrack = this.screenStream.getVideoTracks()[0];
      if (screenTrack) outgoing.addTrack(screenTrack);
      const audioTrack = this.localStream?.getAudioTracks()[0];
      if (audioTrack) outgoing.addTrack(audioTrack);
      return outgoing;
    }
    return this.localStream ?? new MediaStream();
  }

  getLocalStream() {
    return this.localStream;
  }

  toggleMic() {
    if (!this.localStream || this.localStream.getAudioTracks().length === 0) return;
    this.micOn = !this.micOn;
    this.localStream.getAudioTracks().forEach((t) => (t.enabled = this.micOn));
    this.broadcast({
      type: "media-state",
      senderId: this.selfId,
      micOn: this.micOn,
      camOn: this.camOn,
      screenSharing: this.screenSharing,
    });
    this.emitParticipants();
  }

  toggleCam() {
    if (!this.localStream || this.localStream.getVideoTracks().length === 0) return;
    this.camOn = !this.camOn;
    this.localStream.getVideoTracks().forEach((t) => (t.enabled = this.camOn));
    this.broadcast({
      type: "media-state",
      senderId: this.selfId,
      micOn: this.micOn,
      camOn: this.camOn,
      screenSharing: this.screenSharing,
    });
    this.emitParticipants();
  }

  async startScreenShare() {
    if (this.screenSharing) return;
    const screenStream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: false,
    });
    const screenTrack = screenStream.getVideoTracks()[0];
    this.screenStream = screenStream;
    this.originalCamTrack = this.localStream?.getVideoTracks()[0] ?? null;

    for (const entry of this.participants.values()) {
      const sender = entry.mediaConn?.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      sender?.replaceTrack(screenTrack).catch(() => {});
    }

    screenTrack.onended = () => this.stopScreenShare();
    this.screenSharing = true;
    this.broadcast({
      type: "media-state",
      senderId: this.selfId,
      micOn: this.micOn,
      camOn: this.camOn,
      screenSharing: true,
    });
    this.emit("screen-stream", this.screenStream);
    this.emitParticipants();
  }

  stopScreenShare() {
    if (!this.screenSharing) return;
    this.screenStream?.getTracks().forEach((t) => t.stop());
    this.screenStream = null;
    const camTrack = this.originalCamTrack;

    for (const entry of this.participants.values()) {
      const sender = entry.mediaConn?.peerConnection
        ?.getSenders()
        .find((s) => s.track?.kind === "video");
      if (sender && camTrack) sender.replaceTrack(camTrack).catch(() => {});
    }

    this.screenSharing = false;
    this.broadcast({
      type: "media-state",
      senderId: this.selfId,
      micOn: this.micOn,
      camOn: this.camOn,
      screenSharing: false,
    });
    this.emit("screen-stream", null);
    this.emitParticipants();
  }

  // ---------- chat ----------

  sendChat(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return;
    const id = crypto.randomUUID();
    const timestamp = Date.now();
    this.broadcast({
      type: "chat",
      id,
      text: trimmed,
      senderId: this.selfId,
      senderName: this.selfName,
      timestamp,
    });
    this.emit("chat", {
      id,
      senderId: this.selfId,
      senderName: this.selfName,
      text: trimmed,
      timestamp,
      isSelf: true,
    });
  }

  // ---------- file transfer ----------

  async sendFile(file: File) {
    const transferId = crypto.randomUUID();
    const meta = {
      transferId,
      name: file.name,
      size: file.size,
      mime: file.type || "application/octet-stream",
      senderId: this.selfId,
      senderName: this.selfName,
    };
    this.broadcast({ type: "file-meta", ...meta });
    this.emit("file", {
      ...meta,
      progress: 0,
      status: "sending",
      isSelf: true,
      timestamp: Date.now(),
    });

    const buffer = await file.arrayBuffer();
    const total = Math.max(1, Math.ceil(buffer.byteLength / FILE_CHUNK_SIZE));

    for (let i = 0; i < total; i++) {
      const chunk = buffer.slice(i * FILE_CHUNK_SIZE, (i + 1) * FILE_CHUNK_SIZE);
      this.broadcast({ type: "file-chunk", transferId, index: i, total, data: chunk });
      await this.waitForBufferedAmountLow();
      this.emit("file", {
        ...meta,
        progress: (i + 1) / total,
        status: "sending",
        isSelf: true,
        timestamp: Date.now(),
      });
    }

    this.broadcast({ type: "file-done", transferId });
    this.emit("file", {
      ...meta,
      progress: 1,
      status: "done",
      isSelf: true,
      timestamp: Date.now(),
    });
  }

  private async waitForBufferedAmountLow() {
    const THRESHOLD = 2 * 1024 * 1024; // 2MB
    for (const entry of this.participants.values()) {
      const channel = (entry.dataConn as unknown as { dataChannel?: RTCDataChannel })
        ?.dataChannel;
      while (channel && channel.bufferedAmount > THRESHOLD) {
        await new Promise((r) => setTimeout(r, 15));
      }
    }
  }

  // ---------- screen recording ----------

  async startRecording() {
    if (this.recording) return;
    const stream = await navigator.mediaDevices.getDisplayMedia({
      video: true,
      audio: true,
    });
    const mimeType = MediaRecorder.isTypeSupported("video/webm;codecs=vp9,opus")
      ? "video/webm;codecs=vp9,opus"
      : "video/webm";
    const recorder = new MediaRecorder(stream, { mimeType });
    const chunks: Blob[] = [];
    recorder.ondataavailable = (e) => {
      if (e.data.size > 0) chunks.push(e.data);
    };
    recorder.onstop = async () => {
      const blob = new Blob(chunks, { type: mimeType });
      await this.saveRecording(blob);
      stream.getTracks().forEach((t) => t.stop());
    };
    stream.getVideoTracks()[0].onended = () => this.stopRecording();

    recorder.start(1000);
    this.recording = { recorder, stream };
    this.broadcast({
      type: "recording-start",
      senderId: this.selfId,
      senderName: this.selfName,
    });
    this.emit("recording-notice", {
      senderId: this.selfId,
      senderName: this.selfName,
      active: true,
    });
  }

  stopRecording() {
    if (!this.recording) return;
    this.recording.recorder.stop();
    this.recording = null;
    this.broadcast({ type: "recording-stop", senderId: this.selfId });
    this.emit("recording-notice", {
      senderId: this.selfId,
      senderName: this.selfName,
      active: false,
    });
  }

  private async saveRecording(blob: Blob) {
    const filename = `recording-${new Date().toISOString().replace(/[:.]/g, "-")}.webm`;
    const picker = (
      window as unknown as {
        showSaveFilePicker?: (opts: unknown) => Promise<FileSystemFileHandle>;
      }
    ).showSaveFilePicker;

    if (picker) {
      try {
        const handle = await picker({
          suggestedName: filename,
          types: [{ description: "WebM video", accept: { "video/webm": [".webm"] } }],
        });
        const writable = await (
          handle as unknown as {
            createWritable: () => Promise<WritableStream & { write: (b: Blob) => Promise<void> }>;
          }
        ).createWritable();
        await writable.write(blob);
        await writable.close();
        return;
      } catch {
        // user cancelled the save dialog, or API failed — fall back to a download link
      }
    }

    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10_000);
  }

  // ---------- state emission ----------

  private setStatus(status: ConnectionStatus, message?: string) {
    this.status = status;
    this.emit("status", status);
    if (message) this.emit("status-message", message);
  }

  private emitParticipants() {
    const self: ParticipantInfo = {
      id: this.selfId,
      name: this.selfName,
      isSelf: true,
      isHost: this.isHost,
      micOn: this.micOn,
      camOn: this.camOn,
      screenSharing: this.screenSharing,
      speaking: false,
      connected: true,
    };
    const others: ParticipantInfo[] = [...this.participants.values()]
      .filter((p) => p.connected)
      .map((p) => ({
        id: p.id,
        name: p.name,
        isSelf: false,
        isHost: p.isHost,
        micOn: p.micOn,
        camOn: p.camOn,
        screenSharing: p.screenSharing,
        speaking: false,
        connected: p.connected,
      }));
    this.emit("participants", [self, ...others]);
  }

  getParticipantStream(id: string): MediaStream | undefined {
    return this.participants.get(id)?.stream;
  }
}
