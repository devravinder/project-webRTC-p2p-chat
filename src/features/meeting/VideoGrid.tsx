import { VideoTile } from "./VideoTile";
import { useMeetingContext } from "@/context/MeetingContext";
import { cn } from "@/lib/utils";

export function VideoGrid() {
  const meeting = useMeetingContext();
  const count = meeting.participants.length;

  return (
    <div
      className={cn(
        "grid gap-3 w-full h-full auto-rows-fr",
        count <= 1 && "grid-cols-1",
        count === 2 && "grid-cols-1 sm:grid-cols-2",
        count >= 3 && count <= 4 && "grid-cols-1 sm:grid-cols-2",
        count > 4 && "grid-cols-2 lg:grid-cols-3",
      )}
    >
      {meeting.participants.map((p) => (
        <VideoTile
          key={p.id}
          participant={p}
          stream={p.isSelf ? meeting.screenStream ?? meeting.localStream : meeting.getParticipantStream(p.id)}
        />
      ))}
    </div>
  );
}
