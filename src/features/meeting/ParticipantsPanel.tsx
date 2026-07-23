import { Mic, MicOff, Video, VideoOff, Crown, X } from "lucide-react";
import { useMeetingContext } from "@/context/MeetingContext";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { Badge } from "@/components/ui/Badge";

export function ParticipantsPanel({
  maxParticipants,
  onClose,
}: {
  maxParticipants?: number;
  onClose: () => void;
}) {
  const meeting = useMeetingContext();

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">
          Participants ({meeting.participants.length}
          {maxParticipants ? `/${maxParticipants}` : ""})
        </span>
        <IconButton label="Close participants" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-3 flex flex-col gap-1">
        {meeting.participants.map((p) => (
          <div key={p.id} className="flex items-center gap-3 px-2 py-2 rounded-xl hover:bg-accent/50">
            <Avatar name={p.name} size="sm" />
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate flex items-center gap-1.5">
                {p.name}
                {p.isSelf && <span className="text-muted-foreground font-normal">(You)</span>}
                {p.isHost && <Crown className="h-3.5 w-3.5 text-yellow-500" />}
              </div>
            </div>
            {p.screenSharing && <Badge>Presenting</Badge>}
            {p.micOn ? (
              <Mic className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <MicOff className="h-4 w-4 text-destructive shrink-0" />
            )}
            {p.camOn ? (
              <Video className="h-4 w-4 text-muted-foreground shrink-0" />
            ) : (
              <VideoOff className="h-4 w-4 text-destructive shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
