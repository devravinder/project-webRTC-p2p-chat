import { useState } from "react";
import { Copy, Check, Link2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { formatCodeForDisplay } from "@/lib/meeting/shortCode";

export function InviteInfo({ code }: { code: string }) {
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copy = async (value: string, kind: "code" | "link") => {
    try {
      await navigator.clipboard.writeText(value);
    } catch {
      // clipboard API unavailable — the value is still visible to copy manually
    }
    if (kind === "code") {
      setCopiedCode(true);
      setTimeout(() => setCopiedCode(false), 1800);
    } else {
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 1800);
    }
  };

  const inviteLink = `${window.location.origin}${window.location.pathname}?join=${encodeURIComponent(code)}`;

  return (
    <div className="flex flex-col gap-3 w-full">
      <div className="text-center font-mono text-2xl sm:text-3xl tracking-[0.2em] font-semibold bg-secondary/60 rounded-xl py-4">
        {formatCodeForDisplay(code)}
      </div>
      <div className="grid grid-cols-2 gap-2">
        <Button variant="outline" onClick={() => copy(code, "code")}>
          {copiedCode ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
          {copiedCode ? "Copied" : "Copy code"}
        </Button>
        <Button variant="outline" onClick={() => copy(inviteLink, "link")}>
          {copiedLink ? <Check className="h-4 w-4" /> : <Link2 className="h-4 w-4" />}
          {copiedLink ? "Copied" : "Copy link"}
        </Button>
      </div>
      <p className="text-xs text-muted-foreground text-center">
        Share this over WhatsApp, email or SMS. Anyone with it can join until
        the meeting fills up.
      </p>
    </div>
  );
}
