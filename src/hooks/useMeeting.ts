import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { PeerMeetingClient } from "@/lib/meeting/PeerMeetingClient";
import type {
  ChatMessage,
  ConnectionStatus,
  FileTransferState,
  ParticipantInfo,
} from "@/types/meeting";

export function useMeeting(selfName: string) {
  const clientRef = useRef<PeerMeetingClient | null>(null);
  const [status, setStatus] = useState<ConnectionStatus>("idle");
  const [statusMessage, setStatusMessage] = useState("");
  const [meetingCode, setMeetingCode] = useState("");
  const [participants, setParticipants] = useState<ParticipantInfo[]>([]);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [files, setFiles] = useState<FileTransferState[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [screenStream, setScreenStream] = useState<MediaStream | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isScreenSharing, setIsScreenSharing] = useState(false);
  const [activeRecorderName, setActiveRecorderName] = useState<string | null>(null);

  const getClient = useCallback(() => {
    if (!clientRef.current) {
      clientRef.current = new PeerMeetingClient(selfName);
    }
    return clientRef.current;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    const client = getClient();
    const unsubs = [
      client.on("status", setStatus),
      client.on("status-message", setStatusMessage),
      client.on("notice", (msg) => toast.warning(msg, { duration: 8000 })),
      client.on("meeting-code", setMeetingCode),
      client.on("participants", setParticipants),
      client.on("local-stream", setLocalStream),
      client.on("screen-stream", (s) => {
        setScreenStream(s);
        setIsScreenSharing(!!s);
      }),
      client.on("chat", (msg) => setMessages((prev) => [...prev, msg])),
      client.on("file", (file) =>
        setFiles((prev) => {
          const idx = prev.findIndex((f) => f.transferId === file.transferId);
          if (idx === -1) return [...prev, file];
          const next = [...prev];
          next[idx] = file;
          return next;
        }),
      ),
      client.on("recording-notice", (notice) => {
        const isSelf = notice.senderId === client.getSelfId();
        if (isSelf) setIsRecording(notice.active);
        setActiveRecorderName(notice.active ? notice.senderName || "Someone" : null);
        if (!isSelf) {
          toast(
            notice.active
              ? `${notice.senderName} started recording the screen`
              : "Screen recording stopped",
            { duration: 5000 },
          );
        }
      }),
    ];
    return () => unsubs.forEach((u) => u());
  }, [getClient]);

  const startMeeting = useCallback(
    async (maxParticipants: number) => {
      try {
        return await getClient().startMeeting(maxParticipants);
      } catch {
        toast.error("Could not start the meeting. Please try again.");
        throw new Error("start-failed");
      }
    },
    [getClient],
  );

  const joinMeeting = useCallback(
    async (code: string) => {
      try {
        await getClient().joinMeeting(code);
      } catch {
        throw new Error("join-failed");
      }
    },
    [getClient],
  );

  const leave = useCallback(() => {
    clientRef.current?.leave();
  }, []);

  const sendChat = useCallback((text: string) => getClient().sendChat(text), [getClient]);

  const sendFile = useCallback(
    (file: File) => {
      getClient()
        .sendFile(file)
        .catch(() => toast.error(`Couldn't send ${file.name}`));
    },
    [getClient],
  );

  const toggleMic = useCallback(() => getClient().toggleMic(), [getClient]);
  const toggleCam = useCallback(() => getClient().toggleCam(), [getClient]);

  const toggleScreenShare = useCallback(async () => {
    const client = getClient();
    try {
      if (client.isScreenSharing()) {
        client.stopScreenShare();
      } else {
        await client.startScreenShare();
      }
    } catch {
      toast.error("Screen share was cancelled or is not available.");
    }
  }, [getClient]);

  const toggleRecording = useCallback(async () => {
    const client = getClient();
    try {
      if (client.isRecording()) {
        client.stopRecording();
      } else {
        await client.startRecording();
      }
    } catch {
      toast.error("Screen recording was cancelled or is not available.");
    }
  }, [getClient]);

  const getParticipantStream = useCallback(
    (id: string) => clientRef.current?.getParticipantStream(id),
    [],
  );

  return {
    status,
    statusMessage,
    meetingCode,
    participants,
    messages,
    files,
    localStream,
    screenStream,
    isRecording,
    isScreenSharing,
    activeRecorderName,
    startMeeting,
    joinMeeting,
    leave,
    sendChat,
    sendFile,
    toggleMic,
    toggleCam,
    toggleScreenShare,
    toggleRecording,
    getParticipantStream,
  };
}
