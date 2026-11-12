import { Video, PlusCircle, LogIn, MessageSquare } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { cn } from "@/lib/utils";
import type { RoomMode } from "@/types/meeting";

const MODES = [
  { id: "call", label: "Call", icon: Video },
  { id: "chat", label: "Chat", icon: MessageSquare },
] as const;

export function Home({
  name,
  mode,
  onModeChange,
  onStart,
  onJoin,
  onChangeName,
}: {
  name: string;
  mode: RoomMode;
  onModeChange: (mode: RoomMode) => void;
  onStart: () => void;
  onJoin: () => void;
  onChangeName: () => void;
}) {
  const isChat = mode === "chat";
  const noun = isChat ? "Chat" : "Meeting";
  return (
    <div className="h-full w-full flex flex-col">
      <header className="flex items-center justify-between px-4 sm:px-6 py-4">
        <div className="flex items-center gap-2 font-semibold">
          <div className="h-8 w-8 rounded-lg bg-primary text-primary-foreground flex items-center justify-center">
            <Video className="h-4 w-4" />
          </div>
          Meet
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={onChangeName}
            className="flex items-center gap-2 cursor-pointer rounded-full pr-3 hover:bg-accent transition-colors py-1"
          >
            <Avatar name={name} size="sm" />
            <span className="text-sm hidden sm:inline">{name}</span>
          </button>
          <ThemeToggle />
        </div>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl text-center">
          <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
            {isChat ? "Chat, without the server" : "Video calls, without the server"}
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            {isChat
              ? "Peer-to-peer text chat and file transfer, directly between browsers — no camera or microphone needed."
              : "Peer-to-peer meetings — chat, calls, screen share and file transfer happen directly between browsers."}
          </p>

          <div
            role="radiogroup"
            aria-label="Call or chat"
            className="inline-flex gap-1 p-1 mt-8 rounded-xl bg-secondary/60"
          >
            {MODES.map(({ id, label, icon: Icon }) => (
              <button
                key={id}
                role="radio"
                aria-checked={mode === id}
                onClick={() => onModeChange(id)}
                className={cn(
                  "inline-flex items-center gap-2 h-9 px-5 rounded-lg text-sm font-medium transition-colors cursor-pointer",
                  mode === id
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                <Icon className="h-4 w-4" />
                {label}
              </button>
            ))}
          </div>

          <div className="grid sm:grid-cols-2 gap-4 mt-6">
            <button onClick={onStart} className="text-left cursor-pointer group">
              <Card className="p-6 h-full flex flex-col gap-3 group-hover:border-primary/50 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Start {noun}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Create a {noun.toLowerCase()} and invite others with a code.
                  </div>
                </div>
              </Card>
            </button>

            <button onClick={onJoin} className="text-left cursor-pointer group">
              <Card className="p-6 h-full flex flex-col gap-3 group-hover:border-primary/50 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
                  <LogIn className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Join {noun}</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Have a code from someone? Paste it to join.
                  </div>
                </div>
              </Card>
            </button>
          </div>
        </div>
      </main>
    </div>
  );
}
