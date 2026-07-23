import { useEffect, useRef, useState } from "react";
import { AlertTriangle, Loader2, Users as UsersIcon, Disc, Share2, X } from "lucide-react";
import { useMeetingContext } from "@/context/MeetingContext";
import { MeetingProvider } from "@/context/MeetingContext";
import { useMeeting } from "@/hooks/useMeeting";
import { VideoGrid } from "./VideoGrid";
import { ControlBar } from "./ControlBar";
import { ChatPanel } from "./ChatPanel";
import { ParticipantsPanel } from "./ParticipantsPanel";
import { InviteInfo } from "./InviteInfo";
import { Card } from "@/components/ui/Card";
import { Button } from "@/components/ui/Button";
import { IconButton } from "@/components/ui/IconButton";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";

function SelfPreview() {
  const meeting = useMeetingContext();
  const videoRef = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = meeting.localStream ?? null;
  }, [meeting.localStream]);
  const hasVideo = !!meeting.localStream?.getVideoTracks().some((t) => t.enabled);

  return (
    <div className="w-40 sm:w-56 aspect-video rounded-xl overflow-hidden bg-secondary/60 mx-auto">
      {hasVideo ? (
        <video ref={videoRef} autoPlay playsInline muted className="h-full w-full object-cover -scale-x-100" />
      ) : (
        <div className="h-full w-full flex items-center justify-center text-xs text-muted-foreground">
          Camera off
        </div>
      )}
    </div>
  );
}

function CenterState({ children }: { children: React.ReactNode }) {
  return (
    <div className="h-full w-full flex items-center justify-center p-4">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      {children}
    </div>
  );
}

function MeetingRoomInner({
  maxParticipants,
  onExit,
}: {
  maxParticipants?: number;
  onExit: () => void;
}) {
  const meeting = useMeetingContext();
  const [panel, setPanel] = useState<"chat" | "participants" | null>(null);
  const [showInvite, setShowInvite] = useState(false);
  const [seenMessageCount, setSeenMessageCount] = useState(0);
  const [pinnedId, setPinnedId] = useState<string | null>(null);
  const prevSharingIds = useRef<Set<string>>(new Set());

  const togglePanel = (next: "chat" | "participants") =>
    setPanel((p) => (p === next ? null : next));

  const handleLeave = () => {
    meeting.leave();
    onExit();
  };

  useEffect(() => {
    if (panel === "chat") setSeenMessageCount(meeting.messages.length);
  }, [panel, meeting.messages.length]);
  const unreadCount = panel === "chat" ? 0 : meeting.messages.length - seenMessageCount;

  useEffect(() => {
    const sharingNow = new Set(
      meeting.participants.filter((p) => !p.isSelf && p.screenSharing).map((p) => p.id),
    );

    if (pinnedId && !sharingNow.has(pinnedId) && prevSharingIds.current.has(pinnedId)) {
      setPinnedId(null);
    }

    const isMobile = window.matchMedia("(max-width: 639px)").matches;
    if (isMobile) {
      for (const id of sharingNow) {
        if (!prevSharingIds.current.has(id)) {
          setPinnedId(id);
          break;
        }
      }
    }

    prevSharingIds.current = sharingNow;
  }, [meeting.participants, pinnedId]);

  if (meeting.status === "requesting-media" || meeting.status === "connecting") {
    return (
      <CenterState>
        <Card className="p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
          <p className="text-sm text-muted-foreground">{meeting.statusMessage || "Connecting…"}</p>
        </Card>
      </CenterState>
    );
  }

  if (meeting.status === "waiting") {
    return (
      <CenterState>
        <Card className="p-8 flex flex-col items-center gap-5 max-w-sm w-full">
          <SelfPreview />
          <div className="text-center">
            <h1 className="font-semibold text-lg">Waiting for people to join</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {meeting.participants.length}
              {maxParticipants ? `/${maxParticipants}` : ""} joined
            </p>
          </div>
          <InviteInfo code={meeting.meetingCode} />
          <Button variant="outline" className="w-full" onClick={handleLeave}>
            Cancel meeting
          </Button>
        </Card>
      </CenterState>
    );
  }

  if (meeting.status === "room-full") {
    return (
      <CenterState>
        <Card className="p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="font-semibold text-lg">Meeting is full</h1>
            <p className="text-sm text-muted-foreground mt-1">
              This meeting has already reached its participant limit.
            </p>
          </div>
          <Button className="w-full" onClick={onExit}>
            Back to home
          </Button>
        </Card>
      </CenterState>
    );
  }

  if (meeting.status === "error") {
    return (
      <CenterState>
        <Card className="p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <AlertTriangle className="h-8 w-8 text-destructive" />
          <div>
            <h1 className="font-semibold text-lg">Couldn't connect</h1>
            <p className="text-sm text-muted-foreground mt-1">{meeting.statusMessage}</p>
          </div>
          <Button className="w-full" onClick={onExit}>
            Back to home
          </Button>
        </Card>
      </CenterState>
    );
  }

  if (meeting.status === "left") {
    return (
      <CenterState>
        <Card className="p-8 flex flex-col items-center gap-4 max-w-sm text-center">
          <h1 className="font-semibold text-lg">You left the meeting</h1>
          <Button className="w-full" onClick={onExit}>
            Back to home
          </Button>
        </Card>
      </CenterState>
    );
  }

  // connected
  return (
    <div className="h-full w-full flex flex-col">
      <header className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <UsersIcon className="h-4 w-4" />
          {meeting.participants.length}
          {maxParticipants ? `/${maxParticipants}` : ""}
          {meeting.activeRecorderName && (
            <span className="ml-3 inline-flex items-center gap-1.5 text-destructive font-medium">
              <Disc className="h-3.5 w-3.5 animate-pulse" />
              Recording
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <IconButton
            label="Share meeting link"
            variant="ghost"
            size="sm"
            onClick={() => setShowInvite(true)}
          >
            <Share2 className="h-[18px] w-[18px]" />
          </IconButton>
          <ThemeToggle />
        </div>
      </header>

      <div className="flex-1 flex flex-col sm:flex-row min-h-0">
        <main className="flex-1 flex flex-col p-3 sm:p-4 gap-4 min-w-0">
          <div className="flex-1 min-h-0">
            <VideoGrid pinnedId={pinnedId} onPinChange={setPinnedId} />
          </div>
          <ControlBar
            activePanel={panel}
            onTogglePanel={togglePanel}
            onLeave={handleLeave}
            unreadCount={unreadCount}
          />
        </main>

        <aside
          className={cn(
            "fixed inset-0 z-40 bg-card flex flex-col sm:static sm:inset-auto sm:z-auto sm:w-80 sm:border-l sm:border-border shrink-0 overflow-hidden",
            panel ? "flex" : "hidden",
          )}
        >
          {panel === "chat" && <ChatPanel onClose={() => setPanel(null)} />}
          {panel === "participants" && (
            <ParticipantsPanel maxParticipants={maxParticipants} onClose={() => setPanel(null)} />
          )}
        </aside>
      </div>

      {showInvite && (
        <div
          className="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4"
          onClick={() => setShowInvite(false)}
        >
          <Card
            className="w-full max-w-sm p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="font-semibold text-lg">Meeting info</h2>
              <IconButton
                label="Close"
                variant="ghost"
                size="sm"
                onClick={() => setShowInvite(false)}
              >
                <X className="h-4 w-4" />
              </IconButton>
            </div>
            <InviteInfo code={meeting.meetingCode} />
          </Card>
        </div>
      )}
    </div>
  );
}

export type MeetingAction =
  | { type: "start"; maxParticipants: number }
  | { type: "join"; code: string };

export function MeetingRoom({
  name,
  action,
  onExit,
}: {
  name: string;
  action: MeetingAction;
  onExit: () => void;
}) {
  const meeting = useMeeting(name);
  const startedRef = useRef(false);

  useEffect(() => {
    if (startedRef.current) return;
    startedRef.current = true;
    if (action.type === "start") {
      meeting.startMeeting(action.maxParticipants).catch(() => {});
    } else {
      meeting.joinMeeting(action.code).catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <MeetingProvider value={meeting}>
      <MeetingRoomInner
        maxParticipants={action.type === "start" ? action.maxParticipants : undefined}
        onExit={onExit}
      />
    </MeetingProvider>
  );
}
