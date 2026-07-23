import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  ScreenShare,
  ScreenShareOff,
  Disc,
  PhoneOff,
  MessageSquare,
  Users,
} from "lucide-react";
import { IconButton } from "@/components/ui/IconButton";
import { useMeetingContext } from "@/context/MeetingContext";

export function ControlBar({
  activePanel,
  onTogglePanel,
  onLeave,
  unreadCount = 0,
}: {
  activePanel: "chat" | "participants" | null;
  onTogglePanel: (panel: "chat" | "participants") => void;
  onLeave: () => void;
  unreadCount?: number;
}) {
  const meeting = useMeetingContext();
  const self = meeting.participants.find((p) => p.isSelf);
  const screenShareSupported = typeof navigator.mediaDevices?.getDisplayMedia === "function";

  return (
    <div className="glass flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-4 py-3 rounded-2xl mx-auto">
      <IconButton
        label={self?.micOn ? "Mute microphone" : "Unmute microphone"}
        variant={self?.micOn ? "default" : "danger"}
        onClick={meeting.toggleMic}
      >
        {self?.micOn ? <Mic className="h-5 w-5" /> : <MicOff className="h-5 w-5" />}
      </IconButton>

      <IconButton
        label={self?.camOn ? "Turn off camera" : "Turn on camera"}
        variant={self?.camOn ? "default" : "danger"}
        onClick={meeting.toggleCam}
      >
        {self?.camOn ? <Video className="h-5 w-5" /> : <VideoOff className="h-5 w-5" />}
      </IconButton>

      <IconButton
        label={
          screenShareSupported
            ? meeting.isScreenSharing
              ? "Stop screen share"
              : "Share screen"
            : "Screen share isn't supported on this browser"
        }
        variant={meeting.isScreenSharing ? "active" : "default"}
        onClick={meeting.toggleScreenShare}
        disabled={!screenShareSupported}
      >
        {meeting.isScreenSharing ? (
          <ScreenShareOff className="h-5 w-5" />
        ) : (
          <ScreenShare className="h-5 w-5" />
        )}
      </IconButton>

      <IconButton
        label={meeting.isRecording ? "Stop recording" : "Record screen"}
        variant={meeting.isRecording ? "danger" : "default"}
        onClick={meeting.toggleRecording}
        className="hidden sm:inline-flex"
      >
        <Disc className={meeting.isRecording ? "h-5 w-5 animate-pulse" : "h-5 w-5"} />
      </IconButton>

      <div className="w-px h-8 bg-border mx-1 hidden sm:block" />

      <IconButton
        label="Chat"
        variant={activePanel === "chat" ? "active" : "default"}
        onClick={() => onTogglePanel("chat")}
      >
        <MessageSquare className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[16px] h-4 rounded-full bg-destructive text-white text-[10px] leading-none flex items-center justify-center px-1">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </IconButton>

      <IconButton
        label="Participants"
        variant={activePanel === "participants" ? "active" : "default"}
        onClick={() => onTogglePanel("participants")}
      >
        <Users className="h-5 w-5" />
      </IconButton>

      <div className="w-px h-8 bg-border mx-1" />

      <IconButton label="Leave meeting" variant="danger" onClick={onLeave}>
        <PhoneOff className="h-5 w-5" />
      </IconButton>
    </div>
  );
}
