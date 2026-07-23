import { LayoutGrid } from "lucide-react";
import { VideoTile } from "./VideoTile";
import { IconButton } from "@/components/ui/IconButton";
import { useMeetingContext } from "@/context/MeetingContext";
import { cn } from "@/lib/utils";

export function VideoGrid({
  pinnedId,
  onPinChange,
}: {
  pinnedId?: string | null;
  onPinChange?: (id: string | null) => void;
}) {
  const meeting = useMeetingContext();
  const count = meeting.participants.length;

  const getStream = (id: string, isSelf: boolean) =>
    isSelf ? (meeting.screenStream ?? meeting.localStream) : meeting.getParticipantStream(id);

  const pinned = pinnedId ? meeting.participants.find((p) => p.id === pinnedId) : undefined;

  if (pinned) {
    const others = meeting.participants.filter((p) => p.id !== pinned.id);
    return (
      <div className="flex flex-col w-full h-full gap-3 min-h-0">
        <div className="relative flex-1 min-h-0">
          <VideoTile
            participant={pinned}
            stream={getStream(pinned.id, pinned.isSelf)}
            className="h-full w-full"
          />
          <IconButton
            label="Back to grid"
            variant="ghost"
            size="sm"
            className="absolute top-2 right-14 bg-black/40 text-white hover:bg-black/60"
            onClick={() => onPinChange?.(null)}
          >
            <LayoutGrid className="h-4 w-4" />
          </IconButton>
        </div>
        {others.length > 0 && (
          <div className="flex gap-3 overflow-x-auto shrink-0 pb-1">
            {others.map((p) => (
              <VideoTile
                key={p.id}
                participant={p}
                stream={getStream(p.id, p.isSelf)}
                onClick={() => onPinChange?.(p.id)}
                className="w-32 sm:w-40 shrink-0"
              />
            ))}
          </div>
        )}
      </div>
    );
  }

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
          stream={getStream(p.id, p.isSelf)}
          onClick={onPinChange ? () => onPinChange(p.id) : undefined}
        />
      ))}
    </div>
  );
}
