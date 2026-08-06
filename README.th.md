# LINE Webchat

**ภาษาไทย** · [Read in English](README.md)

Webchat dashboard สำหรับรับและตอบข้อความจาก LINE Official Account (LINE OA)
สร้างด้วย **Next.js 15 + TypeScript** โดยใช้ API Routes เป็น backend ในตัว
ไม่ต้องมี Node.js server แยก

- **Webchat:** https://line-webchat-one.vercel.app
- **Repo:** https://github.com/roshan-p/line-webchat

## Features

- รับข้อความจาก LINE OA ผ่าน Webhook พร้อมตรวจสอบลายเซ็น
- ตอบกลับ User ผ่าน LINE Push Message API
- แสดงรายชื่อ User ที่ทักเข้ามา พร้อมรูปโปรไฟล์ เวลาล่าสุด และจำนวนข้อความที่ยังไม่อ่าน
- รองรับข้อความรูปภาพจาก LINE
- อัปเดตแบบ realtime ผ่าน Ably (ถ้าตั้งค่าไว้) โดยมี polling เป็น fallback
- เก็บข้อมูลถาวรใน Vercel Blob
- Responsive ใช้งานได้ทั้งเดสก์ท็อปและมือถือ

---

## Flow การทำงาน

### 1. ขาเข้า — User ทักมาที่ LINE OA

```
LINE User
   │  พิมพ์ข้อความในแอป LINE
   ▼
LINE Platform
   │  POST พร้อม header x-line-signature
   ▼
/api/webhook
   │  1. ตรวจ HMAC-SHA256 ด้วย LINE_CHANNEL_SECRET  → ไม่ตรง ตอบ 401
   │  2. ดึงโปรไฟล์ผู้ส่งด้วย getUserProfile()
   │  3. แปลง event เป็นข้อความด้วย parseMessageFromEvent()
   ▼
ingestInboundEvents()          ── บันทึกลง Vercel Blob รอบเดียวทั้ง batch
   │
   ▼
publishRealtimeEvent('inbound')  ── ยิง event บอก browser ว่ามีของใหม่
```

จุดสำคัญคือ **publish หลังบันทึกเสร็จเท่านั้น** ไม่งั้น browser จะรีบมาดึงข้อมูล
ก่อนที่ข้อความจะถูกเขียนลง storage แล้วได้ข้อมูลเก่ากลับไป

### 2. ขาออก — Admin ตอบกลับ

```
Webchat UI
   │  พิมพ์แล้วกดส่ง
   ▼
/api/send
   │  1. pushTextMessage() → LINE Push API → เด้งเข้าแอป LINE ของ User
   │  2. addMessage() บันทึกลง storage
   │  3. publishRealtimeEvent('outbound') ให้แท็บอื่นเห็นด้วย
   ▼
ตอบ message กลับไปให้ UI แสดงผลทันทีโดยไม่ต้องรอ refetch
```

### 3. การอัปเดตหน้าจอ

```
useServerConfig()  ── GET /api/health  → รู้ว่า server เปิด Ably ไว้หรือไม่
        │
        ▼
useChat(realtimeEnabled)
        │
        ├── useRealtime()  ── โหลด Ably จาก CDN
        │                  ── ขอ token จาก /api/ably/auth
        │                  ── subscribe channel "line-webchat"
        │                        │
        │                        ▼ เมื่อมี event เข้ามา
        │                  โหลด users ใหม่ + โหลด messages ถ้าเป็นแชทที่เปิดอยู่
        │
        └── setInterval polling  ── ต่อ Ably ติด: ทุก 30 วินาที (safety net)
                                 ── ต่อไม่ติด/ไม่ได้ตั้งค่า: ทุก 5 วินาที
```

Vercel เป็น serverless จึงเปิด WebSocket server ค้างไว้เองไม่ได้ (Socket.IO ใช้ไม่ได้)
Ably ทำหน้าที่เป็นตัวกลางรับ publish จาก API route แล้วกระจายต่อให้ browser

### 4. รูปภาพ

LINE ไม่ได้ส่งไฟล์รูปมาให้ตรงๆ ส่งมาแค่ `messageId` เราจึงเก็บ id ไว้แล้วให้ UI
ชี้ `<img src>` มาที่ `/api/line-content/[messageId]` ซึ่งเป็น proxy ที่ไปดึงไฟล์จริง
จาก LINE โดยแนบ access token ให้ วิธีนี้ทำให้ token ไม่หลุดไปฝั่ง browser

### 5. Storage

```
store.ts  ── isPersistenceConfigured() ?
              │
              ├── มี BLOB_READ_WRITE_TOKEN → persistent-store.ts → Vercel Blob
              │
              └── ไม่มี → in-memory Map (หายเมื่อ cold start, ใช้ตอน dev)
```

Blob เก็บทุกอย่างเป็นไฟล์ JSON ไฟล์เดียวที่ `line-webchat/store.json` การเขียนแต่ละครั้ง
คือการโหลดทั้งไฟล์มาแก้แล้วเขียนทับทั้งไฟล์ ด้วยเหตุนี้ webhook ที่เข้ามาพร้อมกันหลาย event
จึงถูกรวมเป็น batch เดียวใน `ingestInboundEvents()` เพื่อไม่ให้เขียนทับกันเอง

---

## โครงสร้างโปรเจกต์

```
src/
├── app/                          หน้าเว็บและ API routes (Next.js App Router)
│   ├── api/
│   │   ├── webhook/              รับ event จาก LINE + ตรวจลายเซ็น
│   │   ├── send/                 ส่งข้อความออกไปหา User
│   │   ├── users/                รายชื่อคู่สนทนา เรียงตามเวลาล่าสุด
│   │   ├── messages/[userId]/    ข้อความในแชท + mark ว่าอ่านแล้ว
│   │   ├── line-content/[messageId]/  proxy ดึงรูปจาก LINE
│   │   ├── ably/auth/            ออก token ให้ browser subscribe
│   │   └── health/               บอกว่าใช้ storage อะไร เปิด realtime ไหม
│   ├── layout.tsx                root layout + viewport config
│   ├── page.tsx                  ประกอบ ChatSidebar กับ ChatPanel เข้าด้วยกัน
│   └── globals.css               base styles ที่ดึงสีจาก Tailwind theme
│
├── components/                   UI ล้วนๆ ไม่มี logic การดึงข้อมูล
│   ├── ChatSidebar.tsx           รายชื่อแชทฝั่งซ้าย + สถานะการเชื่อมต่อ
│   ├── ConversationItem.tsx      หนึ่งแถวในรายชื่อ
│   ├── SidebarSkeleton.tsx       placeholder ตอนโหลด
│   ├── ChatPanel.tsx             ฝั่งขวาทั้งหมด หรือ empty state
│   ├── ChatHeader.tsx            หัวแชท + ปุ่มย้อนกลับบนมือถือ
│   ├── MessageList.tsx           รายการข้อความ + auto scroll ลงล่าง
│   ├── MessageBubble.tsx         bubble เดียว รองรับทั้งข้อความและรูป
│   ├── MessageComposer.tsx       ช่องพิมพ์ (ถือ state ของ draft เอง)
│   ├── StorageWarningBanner.tsx  เตือนเมื่อยังไม่ได้ตั้ง Blob
│   ├── Avatar.tsx                รูปโปรไฟล์ หรือตัวอักษรแรกของชื่อ
│   ├── Spinner.tsx               spinner + LoadingState
│   └── icons.tsx                 SVG ทั้งหมดรวมไว้ที่เดียว
│
├── hooks/                        state และ side effects
│   ├── useChat.ts                หัวใจหลัก: users, messages, polling, ส่งข้อความ
│   ├── useRealtime.ts            เชื่อมต่อ Ably และ subscribe
│   └── useServerConfig.ts        เช็คว่า server รองรับอะไรบ้าง
│
├── lib/                          logic ที่ไม่ผูกกับ React
│   ├── line.ts                   คุยกับ LINE API (profile, push, parse, content)
│   ├── ably.ts                   publish event และออก token (ฝั่ง server)
│   ├── store.ts                  เลือกใช้ Blob หรือ memory
│   ├── persistent-store.ts       อ่าน/เขียนข้อมูลบน Blob
│   ├── blob-store.ts             ติดต่อ Vercel Blob SDK โดยตรง
│   ├── store-types.ts            type ของข้อมูลที่เก็บ
│   ├── api-client.ts             fetch ทุกเส้นจากฝั่ง browser
│   ├── constants.ts              ค่าคงที่ เช่นช่วง polling ชื่อ channel
│   ├── i18n.ts                   ข้อความภาษาไทยทั้งหมด
│   └── format.ts                 จัดรูปแบบเวลาและชื่อ
│
└── types/
    └── chat.ts                   type ฝั่ง client (derive จาก store-types)
```

### หลักการแบ่งชั้น

แต่ละชั้นรู้จักแค่ชั้นที่อยู่ต่ำกว่าตัวเอง ไม่ย้อนกลับขึ้นไป

| ชั้น | หน้าที่ | ห้ามทำ |
|---|---|---|
| `components/` | แสดงผลอย่างเดียว รับข้อมูลผ่าน props | เรียก `fetch` เอง |
| `hooks/` | ถือ state และเรียก API | เขียน JSX |
| `lib/api-client.ts` | รวม `fetch` ทุกเส้นไว้ที่เดียว | รู้จัก React |
| `app/api/` | ตรวจ input, เรียก lib, ตอบ JSON | มี business logic เยอะ |
| `lib/` (ที่เหลือ) | คุยกับบริการภายนอกและจัดการข้อมูล | รู้จัก HTTP request |

ข้อความภาษาไทยทั้งหมดอยู่ใน `lib/i18n.ts` ไฟล์เดียว ถ้าจะเพิ่มภาษาอังกฤษก็แค่เพิ่ม
object ข้างๆ กัน ส่วนสีทั้งหมดนิยามใน `tailwind.config.ts` เป็น token ชื่อ `line-*`
ไม่มีค่า hex ดิบอยู่ใน component ไหนเลย

---

## Environment Variables

| ตัวแปร | จำเป็น | ใช้ทำอะไร |
|---|---|---|
| `LINE_CHANNEL_ACCESS_TOKEN` | ใช่ | ส่งข้อความและดึงโปรไฟล์/รูปจาก LINE |
| `LINE_CHANNEL_SECRET` | ใช่ | ตรวจลายเซ็น webhook |
| `NEXT_PUBLIC_APP_URL` | ใช่ | แสดง webhook URL ใน `/api/health` |
| `BLOB_READ_WRITE_TOKEN` | แนะนำ | เก็บแชทถาวร ถ้าไม่มีจะใช้ memory |
| `ABLY_API_KEY` | ทางเลือก | เปิด realtime แทน polling |

`BLOB_READ_WRITE_TOKEN` จะถูกเพิ่มให้อัตโนมัติเมื่อ connect Blob store ใน Vercel

---

## Quick Start (Local)

### 1. สร้าง LINE Messaging API Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider แล้วสร้าง LINE Official Account จากนั้นเปิด Messaging API
   ให้กับ OA นั้นใน [LINE OA Manager](https://manager.line.biz/)
3. บันทึก **Channel Secret** และออก **Channel Access Token** (long-lived)
4. เปิด **Use webhook**
5. ปิด **Auto-reply messages** และ **Greeting messages** เพื่อให้ webchat ตอบเอง

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

### 3. รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

### 4. ทดสอบ Webhook ใน Local

LINE ต้องยิง webhook มาหาเครื่องเราได้ จึงต้องเปิด tunnel

```bash
npx ngrok http 3000
```

แล้วเอา URL ที่ได้ไปตั้งใน LINE Console เป็น `https://xxxx.ngrok.io/api/webhook`

---

## Deploy to Vercel

1. Push โค้ดขึ้น GitHub
2. Import project ใน [Vercel](https://vercel.com)
3. สร้าง Blob store ใน Storage tab แล้ว connect เข้ากับ project
4. ตั้ง environment variables ตามตารางด้านบน
5. Deploy แล้วตั้ง Webhook URL ใน LINE Console เป็น
   `https://YOUR-APP.vercel.app/api/webhook`
6. เช็คว่าทุกอย่างพร้อมด้วย `curl https://YOUR-APP.vercel.app/api/health`

---

## API Endpoints

| Method | Path | คำอธิบาย |
|--------|------|----------|
| POST | `/api/webhook` | รับ event จาก LINE ตอบ 401 ถ้าลายเซ็นไม่ถูก |
| GET | `/api/users` | รายชื่อคู่สนทนา เรียงตามข้อความล่าสุด |
| GET | `/api/messages/[userId]` | ข้อความในแชท ใส่ `?markRead=true` เพื่อล้าง unread |
| POST | `/api/send` | ส่งข้อความ body: `{ userId, text }` |
| GET | `/api/line-content/[messageId]` | proxy ดึงรูปจาก LINE |
| GET | `/api/ably/auth` | token ที่มีสิทธิ์ subscribe อย่างเดียว |
| GET | `/api/health` | `{ storage, persistent, realtime, userCount }` |

---

## Realtime (ทางเลือก)

ถ้าไม่ตั้งค่าอะไรเพิ่ม หน้าเว็บจะ poll ทุก 5 วินาที ใช้งานได้แต่มีดีเลย์

ถ้าตั้ง `ABLY_API_KEY` ระบบจะ push ทันทีที่มีคนทักเข้ามา และลด polling
เหลือทุก 30 วินาทีไว้เป็น safety net เฉยๆ มุมบนซ้ายจะมีจุดสีบอกสถานะว่า
กำลังใช้โหมดไหนอยู่

1. สมัคร [Ably](https://ably.com) — free tier ให้ 200 concurrent connections
   และ 6 ล้าน messages ต่อเดือน ไม่ต้องใช้บัตรเครดิต
2. คัดลอก API key จาก dashboard
3. เพิ่ม env var `ABLY_API_KEY` ทั้งใน `.env.local` และ Vercel

API key อยู่ฝั่ง server เท่านั้น browser จะขอ token ชั่วคราวผ่าน `/api/ably/auth`
ซึ่งให้สิทธิ์แค่ subscribe บน channel เดียว publish ไม่ได้ ส่วน Ably client
โหลดจาก CDN ตอน runtime จึงไม่กินขนาด bundle

---

## ข้อจำกัดที่ควรรู้

- Blob เขียนทับทั้งไฟล์ทุกครั้ง เหมาะกับสเกลเล็ก ถ้าใช้งานจริงควรย้ายไป database
  ที่รองรับ atomic write
- ถ้าไม่ตั้ง `BLOB_READ_WRITE_TOKEN` ข้อมูลจะหายทุกครั้งที่ Vercel cold start
  หน้าเว็บจะขึ้นแถบเตือนสีเหลืองให้
- User ต้อง Add Friend LINE OA ก่อน ถึงจะส่งข้อความหาได้
- รองรับเฉพาะแชทแบบ 1:1 ยังไม่รองรับกลุ่ม
- ตอบกลับได้เฉพาะข้อความตัวอักษร ยังส่งรูปออกไม่ได้

---

## Tech Stack

| ส่วน | เทคโนโลยี |
|---|---|
| Framework | Next.js 15 (App Router) + TypeScript |
| Styling | Tailwind CSS |
| LINE | @line/bot-sdk (Messaging API) |
| Realtime | Ably (ทางเลือก) |
| Storage | Vercel Blob |
| Hosting | Vercel |
