# LINE Webchat

**English** · [อ่านภาษาไทย](README.th.md)

A webchat dashboard for receiving and replying to messages from a LINE Official
Account. Built with **Next.js 15 + TypeScript**, using API Routes as the backend
so no separate Node.js server is needed.

- **Webchat:** https://line-webchat-one.vercel.app
- **LINE OA:** `@343bfaqz` (add as a friend to try the inbound side)
- **Repo:** https://github.com/roshan-p/line-webchat

## Features

- Receives LINE messages through a signature-verified webhook
- Replies to users through the LINE Push Message API
- Lists everyone who has messaged in, with avatar, last message time and unread count
- Displays image messages sent from LINE
- Optimistic sending with a per-message retry button when delivery fails
- Realtime updates through Ably when configured, with polling as a fallback
- Persists conversations in Vercel Blob
- Responsive on both desktop and mobile

---

## How it works

### 1. Inbound: a user messages the LINE OA

1. LINE User sends a message in the LINE app
2. LINE Platform POSTs to `/api/webhook` with an `x-line-signature` header
3. `/api/webhook` verifies HMAC-SHA256 against `LINE_CHANNEL_SECRET` (401 on mismatch), looks up the sender with `getUserProfile()`, and turns the event into a message with `parseMessageFromEvent()`
4. `ingestInboundEvents()` writes the whole batch to Vercel Blob at once
5. `publishRealtimeEvent('inbound')` tells the browser something changed

The publish deliberately happens **after** the write settles. Otherwise the
browser would refetch before the message reaches storage and get stale data back.

### 2. Outbound: an admin replies

1. Webchat UI: user types and hits send
2. `/api/send` calls `pushTextMessage()` (LINE Push API, arrives in the user's LINE app), `addMessage()` writes it to storage, and `publishRealtimeEvent('outbound')` so other open tabs see it too
3. The API returns the message so the UI can swap it in for the optimistic one

The bubble is rendered the moment you hit send, dimmed and labelled "กำลังส่ง".
If the request fails the bubble stays put and grows a small red retry button on
its left, the way the LINE app does it, so nothing typed is ever lost.

### 3. Keeping the screen up to date

1. `useServerConfig()` calls `GET /api/health` to learn whether Ably is configured on the server
2. `useChat(realtimeEnabled)` runs two paths in parallel:
   - `useRealtime()` loads Ably from its CDN, requests a token from `/api/ably/auth`, subscribes to the `line-webchat` channel, and on each event reloads users and reloads messages if that chat is open
   - `setInterval` polling only while Ably is down or unconfigured (5s)
3. On reconnect and when the tab becomes visible again, the hook refetches once

While Ably is connected there is no timer at all. The gaps a push could fall
into (a dropped connection, or a background tab that the browser throttled)
are closed by refetching once on reconnect and once on returning to the tab.

Vercel is serverless and cannot hold a WebSocket server open, which rules out
Socket.IO. Ably sits in between: API routes publish to it, and it fans the event
out to every connected browser.

### 4. Images

LINE does not send the image itself, only a `messageId`. The id is stored and the
UI points its `<img src>` at `/api/line-content/[messageId]`, a proxy that fetches
the real file from LINE with the access token attached. That keeps the token on
the server.

### 5. Storage

`store.ts` checks `isPersistenceConfigured()`:

- `BLOB_READ_WRITE_TOKEN` set: `persistent-store.ts` writes to Vercel Blob
- not set: in-memory `Map` (lost on cold start, dev only)

Blob keeps everything in a single JSON file at `line-webchat/store.json`. Every
write loads the whole file, edits it and writes it back, so concurrent webhook
events are merged into one batch in `ingestInboundEvents()` to stop them from
overwriting each other.

---

## Project structure

- `src/app/` pages and API routes (Next.js App Router)
  - `api/webhook/` receives LINE events, verifies the signature
  - `api/send/` pushes a message to a user
  - `api/users/` conversation list, newest first
  - `api/messages/[userId]/` messages in a chat, optionally marking them read
  - `api/line-content/[messageId]/` proxies images from LINE
  - `api/ably/auth/` issues a subscribe-only realtime token
  - `api/health/` reports the storage backend and realtime status
  - `layout.tsx` root layout and viewport config
  - `page.tsx` composes ChatSidebar and ChatPanel
  - `globals.css` base styles pulled from the Tailwind theme
- `src/components/` presentation only, no data fetching
  - `ChatSidebar.tsx`, `ConversationItem.tsx`, `SidebarSkeleton.tsx`
  - `ChatPanel.tsx`, `ChatHeader.tsx`, `MessageList.tsx`, `MessageBubble.tsx`
  - `MessageComposer.tsx`, `StorageWarningBanner.tsx`, `Avatar.tsx`, `Spinner.tsx`, `icons.tsx`
- `src/hooks/` state and side effects (`useChat.ts`, `useRealtime.ts`, `useServerConfig.ts`)
- `src/lib/` logic with no React dependency (`line.ts`, `ably.ts`, `store.ts`, `persistent-store.ts`, `blob-store.ts`, `store-types.ts`, `api-client.ts`, `constants.ts`, `i18n.ts`, `format.ts`)
- `src/types/chat.ts` client-facing types, derived from store-types
- `src/tests/` mirrors the folders above, one test per file

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
| `LINE_MOCK` | local only | `1` stubs out LINE so the app runs offline |

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

### 4. Get a conversation on screen

Nothing shows up at first, and that is expected: LINE delivers webhooks to the
deployed URL, so a local server never receives one and the sidebar has nobody in
it to reply to. There are two ways around it.

**Offline, no LINE account needed.** Set `LINE_MOCK=1` in `.env.local` and seed a
conversation:

```bash
npm run seed
npm run seed -- --user Ualice --text "hello" --count 3
```

The script signs a webhook with your `LINE_CHANNEL_SECRET` and posts it to
`localhost:3000`, exactly as LINE would. With the mock on, replies are logged to
the terminal instead of being pushed, and profiles are faked, so the entire UI
works without credentials. Storage is in memory, so it all resets on restart.

**Against the real LINE account.** Leave `LINE_MOCK` unset and tunnel to your
machine:

```bash
npx ngrok http 3000
```

Then point the webhook URL in the LINE Console at
`https://xxxx.ngrok.io/api/webhook` and message the OA from your phone.

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
arrive and the polling timer stops entirely. A coloured dot in the top left shows
which mode is active.

1. Sign up for [Ably](https://ably.com) (free tier: 200 concurrent connections
   and 6 million messages a month, no credit card)
2. Copy the API key from the dashboard
3. Add `ABLY_API_KEY` to both `.env.local` and Vercel

The API key never leaves the server. The browser requests a short-lived token
from `/api/ably/auth` that can only subscribe to one channel, never publish. The
Ably client itself loads from a CDN at runtime, so it adds nothing to the bundle.

---

## Tests

```bash
npm test         # once
npm run test:watch
```

Vitest with jsdom, 138 tests. They live in `src/tests/`, which mirrors the
structure of `src/` so a test sits at the same path as the file it covers:
`src/tests/lib/store.test.ts` for `src/lib/store.ts`,
`src/tests/app/api/send/route.test.ts` for `src/app/api/send/route.ts`, and so on.

Test layout under `src/tests/`:

- `app/api/` every API route
- `components/` UI components
- `hooks/` client hooks
- `lib/` server and shared logic
- `helpers.ts` shared fixtures and request builders

They cover the parts where a mistake is quiet rather than loud: the message
store's unread counting and conversation ordering, LINE event parsing including
the types the UI cannot render, webhook signature verification, blob
load/save cycles, Ably publish and token issuance, and the mock that local
development depends on.

The bulk sits on `useChat` and `MessageBubble`, since optimistic sending has
several states that are awkward to reproduce by hand. Ably and the API client
are mocked, which lets the tests force the orderings that cause trouble in
production: a realtime push arriving before the send response, a refetch landing
while a message is still in flight, and a retry that fails a second time.

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
| Tests | Vitest + Testing Library |
| LINE | @line/bot-sdk (Messaging API) |
| Realtime | Ably (optional) |
| Storage | Vercel Blob |
| Hosting | Vercel |
