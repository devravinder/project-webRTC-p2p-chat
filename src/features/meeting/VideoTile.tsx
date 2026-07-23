import { useEffect, useRef, useState } from "react";
import { MicOff, ScreenShare, Crown, Maximize2, Minimize2 } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";
import type { ParticipantInfo } from "@/types/meeting";

export function VideoTile({
  participant,
  stream,
  className,
  onClick,
}: {
  participant: ParticipantInfo;
  stream?: MediaStream | null;
  className?: string;
  onClick?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    if (videoRef.current) videoRef.current.srcObject = stream ?? null;
  }, [stream]);

  useEffect(() => {
    const onFullscreenChange = () => {
      setIsFullscreen(document.fullscreenElement === containerRef.current);
    };
    document.addEventListener("fullscreenchange", onFullscreenChange);
    return () => document.removeEventListener("fullscreenchange", onFullscreenChange);
  }, []);

  // Fullscreening your own screen-share preview creates a hall-of-mirrors
  // feedback loop, so the presenter can't enter (or stay in) fullscreen on it.
  const blockFullscreen = participant.isSelf && participant.screenSharing;

  useEffect(() => {
    if (blockFullscreen && document.fullscreenElement === containerRef.current) {
      document.exitFullscreen().catch(() => {});
    }
  }, [blockFullscreen]);

  const toggleFullscreen = () => {
    const container = containerRef.current;
    if (!container) return;

    if (document.fullscreenElement === container) {
      document.exitFullscreen().catch(() => {});
      return;
    }
    if (typeof container.requestFullscreen === "function") {
      container.requestFullscreen().catch(() => {});
      return;
    }
    // iOS Safari/Chrome (WebKit) has no generic Element Fullscreen API —
    // fall back to the video element's native fullscreen player.
    const iosVideo = videoRef.current as
      | (HTMLVideoElement & { webkitEnterFullscreen?: () => void })
      | null;
    iosVideo?.webkitEnterFullscreen?.();
  };

  const hasVideoTrack = !!stream?.getVideoTracks().some((t) => t.enabled);
  const showVideo = hasVideoTrack && (participant.camOn || participant.screenSharing);

  return (
    <div
      ref={containerRef}
      onClick={onClick}
      className={cn(
        "relative rounded-2xl overflow-hidden bg-secondary/40 flex items-center justify-center aspect-video",
        participant.speaking && "animate-speaking",
        onClick && "cursor-pointer",
        isFullscreen && "bg-black",
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

      {!blockFullscreen && (
        <IconButton
          label={isFullscreen ? "Exit full screen" : "Full screen"}
          variant="ghost"
          size="sm"
          className="absolute top-2 right-2 bg-black/40 text-white hover:bg-black/60"
          onClick={(e) => {
            e.stopPropagation();
            toggleFullscreen();
          }}
        >
          {isFullscreen ? <Minimize2 className="h-4 w-4" /> : <Maximize2 className="h-4 w-4" />}
        </IconButton>
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
