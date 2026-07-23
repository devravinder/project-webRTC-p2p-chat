import { useState, type FormEvent } from "react";
import { ArrowLeft, LogIn } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Input } from "@/components/ui/Input";
import { normalizeEnteredCode } from "@/lib/meeting/shortCode";

export function JoinMeeting({
  onBack,
  onJoin,
  initialCode = "",
}: {
  onBack: () => void;
  onJoin: (code: string) => void;
  initialCode?: string;
}) {
  const [code, setCode] = useState(initialCode);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = code.trim();
    if (trimmed) onJoin(normalizeEnteredCode(trimmed));
  };

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
            <div className="h-11 w-11 rounded-xl bg-secondary text-secondary-foreground flex items-center justify-center">
              <LogIn className="h-5 w-5" />
            </div>
            <div>
              <h1 className="font-semibold text-lg">Join a meeting</h1>
              <p className="text-sm text-muted-foreground">
                Paste the code the host shared with you.
              </p>
            </div>
          </div>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <Input
              autoFocus
              placeholder="e.g. AB2-3CD"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              className="text-center tracking-widest font-mono text-base uppercase"
            />
            <Button type="submit" size="lg" disabled={!code.trim()}>
              Join meeting
            </Button>
          </form>
        </Card>
      </main>
    </div>
  );
}
