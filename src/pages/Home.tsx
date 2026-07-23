import { Video, PlusCircle, LogIn } from "lucide-react";
import { Card } from "@/components/ui/Card";
import { Avatar } from "@/components/ui/Avatar";
import { ThemeToggle } from "@/components/ThemeToggle";

export function Home({
  name,
  onStart,
  onJoin,
  onChangeName,
}: {
  name: string;
  onStart: () => void;
  onJoin: () => void;
  onChangeName: () => void;
}) {
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
            Video calls, without the server
          </h1>
          <p className="text-muted-foreground mt-3 max-w-md mx-auto">
            Peer-to-peer meetings — chat, calls, screen share and file
            transfer happen directly between browsers.
          </p>

          <div className="grid sm:grid-cols-2 gap-4 mt-10">
            <button onClick={onStart} className="text-left cursor-pointer group">
              <Card className="p-6 h-full flex flex-col gap-3 group-hover:border-primary/50 transition-colors">
                <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
                  <PlusCircle className="h-5 w-5" />
                </div>
                <div>
                  <div className="font-semibold">Start Meeting</div>
                  <div className="text-sm text-muted-foreground mt-1">
                    Create a meeting and invite others with a code.
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
                  <div className="font-semibold">Join Meeting</div>
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
