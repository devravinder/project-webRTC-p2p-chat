import { useEffect, useRef } from "react";
import { MicOff, ScreenShare, Crown } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { cn } from "@/lib/utils";
import type { ParticipantInfo } from "@/types/meeting";

export function VideoTile({
  participant,
  stream,
  className,
}: {
  participant: ParticipantInfo;
  stream?: MediaStream | null;
  className?: string;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  const hasVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled);
  const showVideo = hasVideoTrack && (participant.camOn || participant.screenSharing);

  return (
    <div
      className={cn(
        "relative rounded-2xl overflow-hidden bg-secondary/40 flex items-center justify-center aspect-video",
        participant.speaking && "animate-speaking",
        className,
      )}
    >
      {showVideo ? (
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted={participant.isSelf}
          className={cn(
            "h-full w-full object-cover",
            participant.isSelf && !participant.screenSharing && "-scale-x-100",
          )}
        />
      ) : (
        <Avatar name={participant.name} size="xl" />
      )}

      {participant.screenSharing && (
        <div className="absolute top-2 left-2 flex items-center gap-1 bg-primary text-primary-foreground text-xs font-medium px-2 py-1 rounded-lg">
          <ScreenShare className="h-3.5 w-3.5" />
          Presenting
        </div>
      )}

      <div className="absolute bottom-2 left-2 flex items-center gap-1.5 bg-black/55 backdrop-blur px-2 py-1 rounded-lg text-white text-xs max-w-[calc(100%-1rem)]">
        {!participant.micOn && <MicOff className="h-3.5 w-3.5 shrink-0 text-red-400" />}
        {participant.isHost && <Crown className="h-3.5 w-3.5 shrink-0 text-yellow-400" />}
        <span className="truncate">
          {participant.name}
          {participant.isSelf && " (You)"}
        </span>
      </div>

      {!participant.connected && (
        <div className="absolute inset-0 bg-background/60 flex items-center justify-center text-xs text-muted-foreground">
          Connecting…
        </div>
      )}
    </div>
  );
}
