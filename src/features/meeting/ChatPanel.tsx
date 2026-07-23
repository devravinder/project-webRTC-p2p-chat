import { useMemo, useRef, useState, type FormEvent } from "react";
import { Paperclip, Send, Download, X, File as FileIcon } from "lucide-react";
import { useMeetingContext } from "@/context/MeetingContext";
import { Input } from "@/components/ui/Input";
import { IconButton } from "@/components/ui/IconButton";
import { cn } from "@/lib/utils";

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type FeedItem =
  | { kind: "message"; timestamp: number; key: string; data: ReturnType<typeof useMeetingContext>["messages"][number] }
  | { kind: "file"; timestamp: number; key: string; data: ReturnType<typeof useMeetingContext>["files"][number] };

export function ChatPanel({ onClose }: { onClose: () => void }) {
  const meeting = useMeetingContext();
  const [text, setText] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  const feed = useMemo<FeedItem[]>(() => {
    const items: FeedItem[] = [
      ...meeting.messages.map((m) => ({
        kind: "message" as const,
        timestamp: m.timestamp,
        key: `m-${m.id}`,
        data: m,
      })),
      ...meeting.files.map((f) => ({
        kind: "file" as const,
        timestamp: f.timestamp,
        key: `f-${f.transferId}`,
        data: f,
      })),
    ];
    return items.sort((a, b) => a.timestamp - b.timestamp);
  }, [meeting.messages, meeting.files]);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = text.trim();
    if (!trimmed) return;
    meeting.sendChat(trimmed);
    setText("");
  };

  const handleFilePick = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) meeting.sendFile(file);
    e.target.value = "";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <span className="font-semibold text-sm">Chat &amp; files</span>
        <IconButton label="Close chat" variant="ghost" size="sm" onClick={onClose}>
          <X className="h-4 w-4" />
        </IconButton>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-3 flex flex-col gap-3">
        {feed.length === 0 && (
          <p className="text-sm text-muted-foreground text-center mt-8">
            No messages yet — say hello.
          </p>
        )}
        {feed.map((item) =>
          item.kind === "message" ? (
            <div
              key={item.key}
              className={cn("flex flex-col max-w-[85%]", item.data.isSelf && "self-end items-end")}
            >
              {!item.data.isSelf && (
                <span className="text-xs text-muted-foreground mb-0.5">{item.data.senderName}</span>
              )}
              <div
                className={cn(
                  "rounded-xl px-3 py-2 text-sm break-words",
                  item.data.isSelf
                    ? "bg-primary text-primary-foreground rounded-br-sm"
                    : "bg-secondary text-secondary-foreground rounded-bl-sm",
                )}
              >
                {item.data.text}
              </div>
            </div>
          ) : (
            <div
              key={item.key}
              className={cn("flex flex-col max-w-[85%]", item.data.isSelf && "self-end items-end")}
            >
              {!item.data.isSelf && (
                <span className="text-xs text-muted-foreground mb-0.5">{item.data.senderName}</span>
              )}
              <div className="rounded-xl px-3 py-2.5 text-sm bg-secondary text-secondary-foreground flex items-center gap-2.5 min-w-[200px]">
                <FileIcon className="h-5 w-5 shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{item.data.name}</div>
                  <div className="text-xs text-muted-foreground">
                    {formatBytes(item.data.size)}
                    {item.data.status !== "done" && ` · ${Math.round(item.data.progress * 100)}%`}
                  </div>
                  {item.data.status !== "done" && (
                    <div className="h-1 bg-border rounded-full mt-1 overflow-hidden">
                      <div
                        className="h-full bg-primary transition-all"
                        style={{ width: `${item.data.progress * 100}%` }}
                      />
                    </div>
                  )}
                </div>
                {item.data.status === "done" && item.data.url && (
                  <a
                    href={item.data.url}
                    download={item.data.name}
                    className="shrink-0 text-primary hover:opacity-80"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                )}
              </div>
            </div>
          ),
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-3 border-t border-border flex items-center gap-2">
        <input ref={fileInputRef} type="file" className="hidden" onChange={handleFilePick} />
        <IconButton
          type="button"
          label="Attach file"
          variant="ghost"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Paperclip className="h-4 w-4" />
        </IconButton>
        <Input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Type a message…"
          className="py-2.5"
        />
        <IconButton type="submit" label="Send" variant="active" size="sm" disabled={!text.trim()}>
          <Send className="h-4 w-4" />
        </IconButton>
      </form>
    </div>
  );
}
