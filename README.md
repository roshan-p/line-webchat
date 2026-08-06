# LINE Webchat

**English** · [อ่านภาษาไทย](README.th.md)

A webchat dashboard for receiving and replying to messages from a LINE Official
Account. Built with **Next.js 15 + TypeScript**, using API Routes as the backend
so no separate Node.js server is needed.

- **Webchat:** https://line-webchat-one.vercel.app
- **Repo:** https://github.com/roshan-p/line-webchat

## Features

- Receives LINE messages through a signature-verified webhook
- Replies to users through the LINE Push Message API
- Lists everyone who has messaged in, with avatar, last message time and unread count
- Displays image messages sent from LINE
- Realtime updates through Ably when configured, with polling as a fallback
- Persists conversations in Vercel Blob
- Responsive on both desktop and mobile

---

## How it works

### 1. Inbound — a user messages the LINE OA

```
LINE User
   │  sends a message in the LINE app
   ▼
LINE Platform
   │  POST with an x-line-signature header
   ▼
/api/webhook
   │  1. verify HMAC-SHA256 against LINE_CHANNEL_SECRET → 401 on mismatch
   │  2. look up the sender with getUserProfile()
   │  3. turn the event into a message with parseMessageFromEvent()
   ▼
ingestInboundEvents()          ── writes the whole batch to Vercel Blob at once
   │
   ▼
publishRealtimeEvent('inbound')  ── tells the browser something changed
```

The publish deliberately happens **after** the write settles. Otherwise the
browser would refetch before the message reaches storage and get stale data back.

### 2. Outbound — an admin replies

```
Webchat UI
   │  types and hits send
   ▼
/api/send
   │  1. pushTextMessage() → LINE Push API → arrives in the user's LINE app
   │  2. addMessage() writes it to storage
   │  3. publishRealtimeEvent('outbound') so other open tabs see it too
   ▼
returns the message so the UI can render it without waiting for a refetch
```

### 3. Keeping the screen up to date

```
useServerConfig()  ── GET /api/health  → is Ably configured on the server?
        │
        ▼
useChat(realtimeEnabled)
        │
        ├── useRealtime()  ── loads Ably from its CDN
        │                  ── requests a token from /api/ably/auth
        │                  ── subscribes to the "line-webchat" channel
        │                        │
        │                        ▼ on each event
        │                  reload users, and reload messages if that chat is open
        │
        └── setInterval polling  ── Ably connected: every 30s as a safety net
                                 ── not connected or not configured: every 5s
```

Vercel is serverless and cannot hold a WebSocket server open, which rules out
Socket.IO. Ably sits in between: API routes publish to it, and it fans the event
out to every connected browser.

### 4. Images

LINE does not send the image itself, only a `messageId`. The id is stored and the
UI points its `<img src>` at `/api/line-content/[messageId]`, a proxy that fetches
the real file from LINE with the access token attached. That keeps the token on
the server.

### 5. Storage

```
store.ts  ── isPersistenceConfigured() ?
              │
              ├── BLOB_READ_WRITE_TOKEN set → persistent-store.ts → Vercel Blob
              │
              └── not set → in-memory Map (lost on cold start, dev only)
```

Blob keeps everything in a single JSON file at `line-webchat/store.json`. Every
write loads the whole file, edits it and writes it back, so concurrent webhook
events are merged into one batch in `ingestInboundEvents()` to stop them from
overwriting each other.

---

## Project structure

```
src/
├── app/                          pages and API routes (Next.js App Router)
│   ├── api/
│   │   ├── webhook/              receives LINE events, verifies the signature
│   │   ├── send/                 pushes a message to a user
│   │   ├── users/                conversation list, newest first
│   │   ├── messages/[userId]/    messages in a chat, optionally marking them read
│   │   ├── line-content/[messageId]/  proxies images from LINE
│   │   ├── ably/auth/            issues a subscribe-only realtime token
│   │   └── health/               reports the storage backend and realtime status
│   ├── layout.tsx                root layout and viewport config
│   ├── page.tsx                  composes ChatSidebar and ChatPanel
│   └── globals.css               base styles pulled from the Tailwind theme
│
├── components/                   presentation only, no data fetching
│   ├── ChatSidebar.tsx           conversation list and connection status
│   ├── ConversationItem.tsx      a single row in that list
│   ├── SidebarSkeleton.tsx       loading placeholder
│   ├── ChatPanel.tsx             the whole right side, or the empty state
│   ├── ChatHeader.tsx            chat header with a mobile back button
│   ├── MessageList.tsx           the messages, scrolled to the bottom
│   ├── MessageBubble.tsx         one bubble, text or image
│   ├── MessageComposer.tsx       the input, owning its own draft state
│   ├── StorageWarningBanner.tsx  shown when Blob is not configured
│   ├── Avatar.tsx                profile picture, or the first letter of the name
│   ├── Spinner.tsx               spinner and LoadingState
│   └── icons.tsx                 every SVG in one place
│
├── hooks/                        state and side effects
│   ├── useChat.ts                the core: users, messages, polling, sending
│   ├── useRealtime.ts            connects to Ably and subscribes
│   └── useServerConfig.ts        asks the server what it supports
│
├── lib/                          logic with no React dependency
│   ├── line.ts                   talks to LINE (profile, push, parse, content)
│   ├── ably.ts                   publishes events and issues tokens, server side
│   ├── store.ts                  picks between Blob and memory
│   ├── persistent-store.ts       reads and writes the Blob-backed store
│   ├── blob-store.ts             the only place that touches the Vercel Blob SDK
│   ├── store-types.ts            shapes of the stored data
│   ├── api-client.ts             every browser-side fetch
│   ├── constants.ts              poll intervals, channel name, locale
│   ├── i18n.ts                   all Thai UI copy
│   └── format.ts                 time and name formatting
│
└── types/
    └── chat.ts                   client-facing types, derived from store-types
```

### Layering rules

Each layer only knows about the ones below it, never the other way around.

| Layer | Responsibility | Must not |
|---|---|---|
| `components/` | render, taking everything through props | call `fetch` |
| `hooks/` | hold state and call the API | contain JSX |
| `lib/api-client.ts` | every HTTP call in one module | know about React |
| `app/api/` | validate input, call lib, return JSON | hold business logic |
| `lib/` (rest) | talk to external services, shape data | know about HTTP requests |

All Thai UI copy lives in `lib/i18n.ts`, so adding English would mean adding one
more object next to it. Colours are defined as `line-*` tokens in
`tailwind.config.ts`; no component contains a raw hex value.

---

## Environment variables

| Variable | Required | Purpose |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | yes | send messages, fetch profiles and images |
| `LINE_CHANNEL_SECRET` | yes | verify webhook signatures |
| `NEXT_PUBLIC_APP_URL` | yes | shown as the webhook URL in `/api/health` |
| `BLOB_READ_WRITE_TOKEN` | recommended | persist chats; falls back to memory without it |
| `ABLY_API_KEY` | optional | enables realtime instead of polling |

Vercel adds `BLOB_READ_WRITE_TOKEN` automatically when you connect a Blob store.

---

## Quick start (local)

### 1. Create a LINE Messaging API channel

1. Open the [LINE Developers Console](https://developers.line.biz/console/)
2. Create a provider, create a LINE Official Account, then enable the Messaging
   API for it in the [LINE OA Manager](https://manager.line.biz/)
3. Note the **Channel Secret** and issue a long-lived **Channel Access Token**
4. Turn on **Use webhook**
5. Turn off **Auto-reply messages** and **Greeting messages** so the webchat can
   answer instead

### 2. Configure environment variables

```bash
cp .env.example .env.local
```

### 3. Run it

```bash
npm install
npm run dev
```

Open http://localhost:3000

### 4. Test the webhook locally

LINE has to reach your machine, so expose it through a tunnel:

```bash
npx ngrok http 3000
```

Then set the webhook URL in the LINE Console to `https://xxxx.ngrok.io/api/webhook`.

---

## Deploy to Vercel

1. Push to GitHub
2. Import the project in [Vercel](https://vercel.com)
3. Create a Blob store under the Storage tab and connect it to the project
4. Set the environment variables from the table above
5. Deploy, then point the LINE Console webhook at
   `https://YOUR-APP.vercel.app/api/webhook`
6. Confirm everything is wired up with `curl https://YOUR-APP.vercel.app/api/health`

---

## API endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhook` | receives LINE events, 401 on a bad signature |
| GET | `/api/users` | conversation list, sorted by most recent message |
| GET | `/api/messages/[userId]` | messages in a chat; `?markRead=true` clears unread |
| POST | `/api/send` | sends a message, body `{ userId, text }` |
| GET | `/api/line-content/[messageId]` | proxies an image from LINE |
| GET | `/api/ably/auth` | a subscribe-only realtime token |
| GET | `/api/health` | `{ storage, persistent, realtime, userCount }` |

---

## Realtime (optional)

With nothing configured the dashboard polls every 5 seconds. That works, but new
messages take a moment to appear.

Setting `ABLY_API_KEY` switches it to push, so messages show up as soon as they
arrive, and polling drops to every 30 seconds purely as a safety net. A coloured
dot in the top left shows which mode is active.

1. Sign up for [Ably](https://ably.com) — the free tier covers 200 concurrent
   connections and 6 million messages a month, with no credit card
2. Copy the API key from the dashboard
3. Add `ABLY_API_KEY` to both `.env.local` and Vercel

The API key never leaves the server. The browser requests a short-lived token
from `/api/ably/auth` that can only subscribe to one channel, never publish. The
Ably client itself loads from a CDN at runtime, so it adds nothing to the bundle.

---

## Known limitations

- Blob rewrites the entire file on every save, which suits small volumes. Real
  usage should move to a database with atomic writes.
- Without `BLOB_READ_WRITE_TOKEN` the history is lost on every cold start. The UI
  shows an amber banner when that is the case.
- A user has to add the LINE OA as a friend before you can message them.
- Only 1:1 chats are supported, not groups.
- Replies are text only; sending images out is not implemented.

---

## Tech stack

| Area | Technology |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| LINE | @line/bot-sdk (Messaging API) |
| Realtime | Ably (optional) |
| Storage | Vercel Blob |
| Hosting | Vercel |
