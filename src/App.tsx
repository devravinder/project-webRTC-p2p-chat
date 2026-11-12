import { useEffect, useState } from "react";
import { useLocalStorage } from "@/hooks/useLocalStorage";
import { NameGate } from "@/pages/NameGate";
import { Home } from "@/pages/Home";
import { StartMeeting } from "@/pages/StartMeeting";
import { JoinMeeting } from "@/pages/JoinMeeting";
import { MeetingRoom, type MeetingAction } from "@/features/meeting/MeetingRoom";
import type { RoomMode } from "@/types/meeting";

type View = "home" | "start" | "join" | "room";

function App() {
  const [name, setName] = useLocalStorage<string>("meet:name", "");
  const [mode, setMode] = useLocalStorage<RoomMode>("meet:mode", "call");
  const [view, setView] = useState<View>("home");
  const [action, setAction] = useState<MeetingAction | null>(null);
  const [joinPrefill, setJoinPrefill] = useState("");
  const [roomKey, setRoomKey] = useState(0);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const code = params.get("join");
    if (code) {
      // Invite links for chat rooms carry `mode=chat`; plain links are calls.
      setMode(params.get("mode") === "chat" ? "chat" : "call");
      setJoinPrefill(code);
      setView("join");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!name) {
    return <NameGate onSubmit={setName} />;
  }

  if (view === "start") {
    return (
      <StartMeeting
        mode={mode}
        onBack={() => setView("home")}
        onCreate={(maxParticipants) => {
          setAction({ type: "start", maxParticipants });
          setRoomKey((k) => k + 1);
          setView("room");
        }}
      />
    );
  }

  if (view === "join") {
    return (
      <JoinMeeting
        mode={mode}
        initialCode={joinPrefill}
        onBack={() => setView("home")}
        onJoin={(code) => {
          setAction({ type: "join", code });
          setRoomKey((k) => k + 1);
          setView("room");
        }}
      />
    );
  }

  if (view === "room" && action) {
    return (
      <MeetingRoom
        key={roomKey}
        name={name}
        mode={mode}
        action={action}
        onExit={() => {
          setAction(null);
          setView("home");
        }}
      />
    );
  }

  return (
    <Home
      name={name}
      mode={mode}
      onModeChange={setMode}
      onStart={() => setView("start")}
      onJoin={() => setView("join")}
      onChangeName={() => setName("")}
    />
  );
}

export default App;
