import { createContext, useContext, type ReactNode } from "react";
import type { useMeeting } from "@/hooks/useMeeting";

type MeetingApi = ReturnType<typeof useMeeting>;

const MeetingContext = createContext<MeetingApi | null>(null);

export function MeetingProvider({
  value,
  children,
}: {
  value: MeetingApi;
  children: ReactNode;
}) {
  return <MeetingContext.Provider value={value}>{children}</MeetingContext.Provider>;
}

// eslint-disable-next-line react-refresh/only-export-components
export function useMeetingContext() {
  const ctx = useContext(MeetingContext);
  if (!ctx) throw new Error("useMeetingContext must be used within MeetingProvider");
  return ctx;
}
