import { useState, type FormEvent } from "react";
import { Video } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { Card } from "@/components/ui/Card";
import { ThemeToggle } from "@/components/ThemeToggle";

export function NameGate({ onSubmit }: { onSubmit: (name: string) => void }) {
  const [value, setValue] = useState("");

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = value.trim();
    if (trimmed) onSubmit(trimmed);
  };

  return (
    <div className="h-full w-full flex items-center justify-center p-4 bg-linear-to-br from-background via-background to-primary/5">
      <div className="absolute top-4 right-4">
        <ThemeToggle />
      </div>
      <Card className="w-full max-w-sm p-8 flex flex-col items-center gap-6">
        <div className="h-14 w-14 rounded-2xl bg-primary text-primary-foreground flex items-center justify-center">
          <Video className="h-7 w-7" />
        </div>
        <div className="text-center">
          <h1 className="text-xl font-semibold">Welcome</h1>
          <p className="text-sm text-muted-foreground mt-1">
            What should other people call you on this device?
          </p>
        </div>
        <form onSubmit={handleSubmit} className="w-full flex flex-col gap-4">
          <Input
            autoFocus
            placeholder="Your name"
            value={value}
            maxLength={40}
            onChange={(e) => setValue(e.target.value)}
          />
          <Button type="submit" size="lg" disabled={!value.trim()}>
            Continue
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center">
          Saved only on this device — nothing is sent anywhere.
        </p>
      </Card>
    </div>
  );
}
