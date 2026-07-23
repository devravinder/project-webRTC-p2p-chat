# WebRTC Chat -  Serverless P2P video/chat

## About

A Zoom/Teams-style video meeting app (chat, audio/video calls, screen share, screen recording, file sharing) that runs as a **static site on GitHub Pages with no custom backend**. Meetings are peer-to-peer between browsers; the only external dependency is **PeerJS's free public broker**, used solely to bootstrap the initial connection (host shares a short ID, joiner pastes it, connection completes automatically). All media, chat, files, and screen share travel directly between browsers after that — nothing routes through PeerJS or any other server. Group meetings use a full mesh topology (every participant connected directly to every other participant), capped at 4–6 people by design. There is no TURN relay, no admit/approval step, no reconnect-on-refresh, and no data persistence — these are deliberate, explicitly accepted tradeoffs in exchange for staying free and infrastructure-free, not oversights. Full rationale for every decision is below.

## Requirements

WebRTC application for Chat, Video Calls, Audio Calls, Screen Share, Screen Recording, and File Sharing.

- Client-to-client only — no custom backend to build/host/maintain. Served as a static site from GitHub Pages.
- Interface styled like Zoom/Teams.
- User A visits the app.
  - First visit: prompt for a display name, store in `localStorage`.
  - Home screen: **Start Meeting** or **Join Meeting**.
- **Start Meeting**:
  - Host picks max participants for the room (default **2**, recommended cap **4–6**).
  - App generates a short connection code, host shares it once via email/WhatsApp/SMS.
  - Host sees "Waiting for people to join" until the room fills.
- **Join Meeting**:
  - User B enters their name (first visit only), pastes the code, joins.
  - No admin admit/approve step — joining completes automatically as long as the room isn't full.
- Once connected: chat, audio, video, file sharing, screen share, screen recording between all participants.
- Screen recording:
  - Broadcast a notification to all participants when someone starts recording.
  - Recording is saved to the recording user's local filesystem only.
- Supports multiple participants (group chat), not just 1:1.

## How it Works

1. **First visit** — app prompts for a display name, saved to `localStorage`. Skipped on later visits.
2. **Start Meeting** — host picks a max participant count (default 2, cap recommended 4–6). App creates a `Peer()` via PeerJS's public broker, gets a short peer ID, shows it with a Copy button. Host shares it once (WhatsApp/email/SMS). UI shows "Waiting for people to join (0/N)".
3. **Join Meeting** — joiner enters/confirms their name, pastes the host's peer ID, app calls `peer.connect(hostId)`. PeerJS's broker handles the SDP/ICE handshake invisibly — no manual round trip. Connection completes automatically; no admit step.
4. **Room fills up to N** — host's app relays each new joiner's connection info to already-connected participants over the data channels that are already open, so every additional participant only ever talks to the PeerJS broker once (to reach the host) — the rest of the mesh forms automatically without further manual sharing. See *Race Conditions & Relay Protocol* below for how this is kept safe.
5. **Room full** — host stops accepting new connections; UI shows "Meeting full."
6. **In-call** — chat, audio, video, file transfer, and screen share all run over direct peer-to-peer connections (mesh: every participant connected to every other participant). No server is involved in any of this traffic.
7. **Screen recording** — `getDisplayMedia` + `MediaRecorder` capture locally; a small message broadcasts "X started recording" to all peers over the data channel; the recording is saved to the recording user's own device only (never transmitted).
8. **Leaving** — closing a tab drops that participant; others stay connected to each other. If the host leaves, the meeting keeps running for existing participants but can no longer accept new joins (see Accepted Limitations).

## Final Decisions

| Area | Decision |
| --- | --- |
| Signaling | PeerJS public cloud broker (free, no signup/API key). Host gets a short peer ID to share once; joiner connects with `peer.connect(hostId)`. |
| NAT traversal | Public STUN only (`stun.l.google.com:19302` + 1–2 fallbacks). No TURN. |
| Admission | No admit/approve step. Joining auto-completes if the room has an open slot. |
| Capacity | Host sets max participants at meeting start (default 2, recommended cap 4–6). Once full, no further joins accepted; UI notes quality degrades as count grows. |
| Group join (>2) | Only the joiner↔host leg touches the PeerJS broker. Host auto-relays new-peer signaling to existing participants over already-open data channels (mesh bootstrap). |
| Media/data topology | Full mesh — every participant connects directly to every other participant. |
| File sharing | Same mesh data channels, relayed the same way as chat once connected. |
| Screen share/recording | `getDisplayMedia` + `MediaRecorder`, entirely client-side. Recording-start event broadcast over data channel. Saved via File System Access API where supported, blob-download fallback otherwise. |
| Identity | `localStorage` for display name, prompted on first visit only. |
| Persistence | None — no chat history, no session/reconnect state. Everything lives only in each open tab's memory. |
| Hosting | Static site on GitHub Pages. No backend code of our own, anywhere. |
| Browser support | Chrome-first. Other browsers not a priority beyond the File System Access API fallback noted above. |
| Encryption | Native to WebRTC (DTLS-SRTP) — all media/data is end-to-end encrypted by default. |

## Why PeerJS

- Removes the manual "share info → paste → generate answer → send answer back → paste" round trip that a fully manual signaling approach requires (see *Without PeerJS* below) — host shares one short ID, joiner pastes it once, done.
- Free, public cloud broker with no signup, no API key, no cost — fits the zero-cost/zero-setup requirement.
- Only handles the initial offer/answer/ICE handshake; it does not relay media, chat, files, or screen share afterward — those all stay strictly peer-to-peer, so the "client to client" requirement holds for everything that actually matters.
- Small library, minimal integration work, well-documented `connect()`/`call()` API that maps directly onto our "host shares ID, joiner connects" flow.
- Tradeoff accepted: introduces a dependency on a third party's free-tier infrastructure (no SLA, not intended for heavy production traffic, outside our own GitHub repo's control) purely for the bootstrap handshake.

## Without PeerJS

Kept as reference in case the PeerJS dependency ever needs to be dropped (e.g. broker goes down, rate-limited, or a stricter "zero third-party" requirement returns):

- Fully manual signaling: host generates one SDP offer blob (bundled, non-trickle ICE so it's a single static string), shares it once via WhatsApp/email/SMS.
- Each joiner pastes it, generates an answer blob, and must send that answer **back** to the host through the same out-of-band channel (this return trip is unavoidable — WebRTC's offer/answer model is inherently bidirectional at the protocol level, not a design choice).
- Host pastes each incoming answer into a "paste participant response" box; app matches it to an open slot and completes the connection.
- For groups beyond 2, the same host-relay-over-existing-data-channels trick from the PeerJS design still applies — only the first joiner↔host exchange is manual, the rest self-negotiate automatically.
- Pure zero-third-party (nothing outside our own GitHub Pages code is ever involved), at the cost of one extra manual copy/paste/reply step per participant compared to the PeerJS flow.

## Tech Stack

- **Signaling**: [PeerJS](https://peerjs.com/) (public cloud broker)
- **NAT traversal**: Public STUN (`stun.l.google.com:19302` + fallbacks); no TURN
- **Media**: `getUserMedia` (camera/mic), `getDisplayMedia` (screen share)
- **Recording**: `MediaRecorder` API; `showSaveFilePicker` (File System Access API, Chromium) with blob-download fallback
- **Data/chat/files**: `RTCDataChannel` (via PeerJS `DataConnection`), mesh topology
- **Identity/state**: `localStorage` only — no persistence layer, no database
- **Hosting**: Static site on GitHub Pages — plain HTML/CSS/JS or a lightweight frontend framework (React/Preact/Svelte), framework choice still open and not load-bearing for any decision above
- **Backend**: None

## Race Conditions & Relay Protocol

Once past the initial host↔joiner PeerJS handshake, all further mesh-bootstrap signaling travels over data channels using these safeguards:

- **Structured message envelope** for all relay messages: `{ type, sessionId, fromId, toId, payload }`. Every peer ignores messages not addressed to it.
- **Rely on `RTCDataChannel`'s built-in ordered+reliable delivery** (default, like TCP) — no custom sequencing needed within a single channel. Risk is only across concurrent joins happening on different channels at once.
- **Synchronous slot assignment on the host** — no `await` between "check open slot" and "decrement/assign," so two near-simultaneous joins can't interleave (JS run-to-completion semantics make this race-free for free).
- **Per-attempt state machine**: `idle → offer-sent → answer-received → connecting → connected/failed`. Discard any message that doesn't match the expected next state for its `sessionId` — guards against duplicates and stale/late messages.
- **Timeouts for half-open attempts** (~20–30s): if a relayed negotiation doesn't complete, close the half-built `RTCPeerConnection`, free the slot, notify the stuck peer.
- **Idempotent relay by `sessionId`** — host checks "already relayed this session?" before re-relaying, guards against accidental retries/double actions.
- **Room-full cutoff is synchronous and host-local** — once slot count hits max, host simply stops accepting new connections; no coordination needed since it's a local check.

## Implementation Notes

- **Short connection codes**: PeerJS's default broker assigns a long auto-generated ID (UUID-like) when you call `new Peer()`. To match the "short connection code" UX in the Requirements, the host should instead create the peer with an explicit short, easy-to-share ID — e.g. `new Peer(generatedShortCode)` where `generatedShortCode` is something like a random 5–6 character alphanumeric string generated client-side. The joiner pastes that exact string into `peer.connect(shortCode)`.
- **Collision risk**: because PeerJS's broker is a shared public namespace, a short/random ID could theoretically collide with someone else's in-flight meeting elsewhere in the world. Mitigate by using a long-enough random alphabet/length (e.g. 6+ alphanumeric characters) to keep collision probability negligible, and by having `new Peer(id)` failure (ID already taken) trigger an automatic retry with a freshly generated code.
- **Room state lives entirely on the host's client** — participant count, slot assignment, and relay bookkeeping are all in host-side JS memory, not anywhere external. This is consistent with "host as single point of failure" in Accepted Limitations.

## Accepted Limitations

Explicitly discussed and agreed tradeoffs — not oversights:

- **No TURN relay** — connections that can't establish directly (corporate NAT, some carrier networks, symmetric NATs) will simply fail, with no fallback.
- **Host is a structural single point of failure** — host isn't just "first participant," it's the relay hub for new joins. If host leaves mid-meeting, existing participants stay connected to each other (mesh persists), but no new participants can join afterward. No host-failover planned.
- **No reconnect on refresh/drop** — closing a tab or losing connection ends that participant's session permanently; full rejoin required.
- **Meeting code has no revocation/passcode** — reusable by anyone who has it until the room fills. Acceptable for now; an optional passcode could be added cheaply later (pure client-side check).
- **Mesh bandwidth multiplies with participant count** — video and file transfer bandwidth scale ~linearly per participant. Expected to matter most around 4–6 participants; UI should note degraded quality at higher counts.
- **Browser support: Chrome-first** — File System Access API (native save dialog for recordings) is Chromium-only; Firefox/Safari fall back to a blob-download link. No further compatibility work planned.
- **Nothing is persisted** — no chat history, no session state, anywhere, by design.
- **Dependency on PeerJS's free public broker** — no SLA, not intended for heavy production traffic, outside our own GitHub repo's control. Only the initial signaling handshake depends on it; all media/chat/files/screen share remain fully peer-to-peer once connected.

## Glossary

- **SDP (Session Description Protocol)** — text format describing a peer's media capabilities, codecs, and network info; exchanged as the "offer" and "answer" during connection setup.
- **ICE (Interactive Connectivity Establishment)** — the process of finding a viable network path (candidate) between two peers, often across NATs.
- **STUN (Session Traversal Utilities for NAT)** — a lightweight, free service that tells a peer its own public IP/port so it can share that info with the other side. Does not relay any actual traffic.
- **TURN (Traversal Using Relays around NAT)** — a fallback relay server used when a direct connection isn't possible; relays actual media/data through itself, and therefore costs bandwidth/hosting. Not used in this project.
- **DTLS-SRTP** — the encryption WebRTC uses by default for all media and data channels; peer-to-peer traffic is end-to-end encrypted without any extra setup.
- **Mesh topology** — every participant connects directly to every other participant (as opposed to routing through a central media server/SFU). Used here; bandwidth cost scales with participant count.
- **Signaling** — the out-of-band exchange of SDP/ICE info needed before a WebRTC connection can be established. WebRTC itself has no built-in signaling channel — the app must provide one (here: PeerJS's broker).
