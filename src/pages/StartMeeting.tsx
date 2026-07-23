import { useState } from "react";
import { ArrowLeft, Users } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { cn } from "@/lib/utils";
import { MAX_PARTICIPANTS_OPTIONS, DEFAULT_MAX_PARTICIPANTS } from "@/types/meeting";

export function StartMeeting({
  onBack,
  onCreate,
}: {
  onBack: () => void;
  onCreate: (maxParticipants: number) => void;
}) {
  const [max, setMax] = useState<number>(DEFAULT_MAX_PARTICIPANTS);

  return (
    <div className="h-full w-full flex flex-col">
      <header className="px-4 sm:px-6 py-4">
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>
      </header>

      <main className="flex-1 flex items-center justify-center p-4">
        <Card className="w-full max-w-md p-8 flex flex-col gap-6">
          <div className="flex items-center gap-3">
            <div className="h-11 w-11 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <Users className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Start a meeting</h1>
              <p className="text-sm text-muted-foreground">
                Choose how many people can join.
              </p>
            </div>
          </div>

          <div>
            <div className="text-sm font-medium mb-2">Max participants</div>
            <div className="flex gap-2 flex-wrap">
              {MAX_PARTICIPANTS_OPTIONS.map((n) => (
                <button
                  key={n}
                  onClick={() => setMax(n)}
                  className={cn(
                    "h-11 w-11 rounded-xl border text-sm font-semibold transition-colors cursor-pointer",
                    max === n
                      ? "bg-primary text-primary-foreground border-primary"
                      : "border-border hover:bg-accent",
                  )}
                >
                  {n}
                </button>
              ))}
            </div>
            {max > 3 && (
              <p className="text-xs text-muted-foreground mt-3">
                Every extra person adds their own direct video connection to
                everyone else — call quality can drop on slower connections
                above 3–4 people.
              </p>
            )}
          </div>

          <Button size="lg" onClick={() => onCreate(max)}>
            Create meeting
          </Button>
        </Card>
      </main>
    </div>
  );
}
