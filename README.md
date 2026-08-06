# LINE Webchat

Webchat dashboard สำหรับตอบกลับข้อความจาก LINE Official Account (LINE OA)  
สร้างด้วย **Next.js 15 + TypeScript** (API Routes ใน Next.js ไม่ต้องมี Node.js server แยก)

## Features

- รับข้อความจาก LINE OA ผ่าน Webhook
- ส่งข้อความตอบกลับ User ผ่าน LINE Push Message API
- แสดงรายชื่อ User ที่ส่งข้อความมา พร้อมเลือกเพื่อตอบกลับ
- Real-time update ผ่าน Server-Sent Events (SSE)

## Architecture

```
LINE User  →  LINE Platform  →  /api/webhook  →  In-memory Store
Webchat UI  →  /api/send      →  LINE Push API →  LINE User
```

## Quick Start (Local)

### 1. สร้าง LINE Messaging API Channel

1. ไปที่ [LINE Developers Console](https://developers.line.biz/console/)
2. สร้าง Provider และ Channel ประเภท **Messaging API**
3. บันทึก **Channel Secret** และ **Channel Access Token**
4. เปิด **Use webhook** และตั้ง Webhook URL (หลัง deploy):
   ```
   https://YOUR-APP.vercel.app/api/webhook
   ```
5. ปิด **Auto-reply messages** และ **Greeting messages** (ถ้าต้องการให้ webchat ตอบเอง)

### 2. ตั้งค่า Environment Variables

```bash
cp .env.example .env.local
```

แก้ไข `.env.local`:

```env
LINE_CHANNEL_ACCESS_TOKEN=your_channel_access_token
LINE_CHANNEL_SECRET=your_channel_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### 3. รันโปรเจกต์

```bash
npm install
npm run dev
```

เปิด http://localhost:3000

### 4. ทดสอบ Webhook ใน Local (ใช้ ngrok)

```bash
npx ngrok http 3000
```

นำ URL จาก ngrok ไปตั้งใน LINE Console:
```
https://xxxx.ngrok.io/api/webhook
```

## Deploy to Vercel

1. Push โค้ดไป GitHub (public repo)
2. Import project ใน [Vercel](https://vercel.com)
3. ตั้ง Environment Variables:
   - `LINE_CHANNEL_ACCESS_TOKEN`
   - `LINE_CHANNEL_SECRET`
   - `NEXT_PUBLIC_APP_URL` = URL ของ Vercel app
4. Deploy แล้วตั้ง Webhook URL ใน LINE Console:
   ```
   https://YOUR-APP.vercel.app/api/webhook
   ```

## API Endpoints

| Method | Path | Description |
|--------|------|-------------|
| POST | `/api/webhook` | รับ event จาก LINE |
| GET | `/api/users` | รายชื่อ users |
| GET | `/api/messages/[userId]` | ข้อความของ user |
| POST | `/api/send` | ส่งข้อความไปหา user |
| GET | `/api/events` | SSE stream สำหรับ real-time |

## ส่งแบบทดสอบ

| รายการ | URL |
|--------|-----|
| LINE OA | `https://line.me/R/ti/p/@YOUR_LINE_ID` |
| Webchat Admin | `https://YOUR-APP.vercel.app` |
| GitHub Repo | `https://github.com/YOUR_USERNAME/line-webchat` |

## หมายเหตุ

- ข้อมูลแชทเก็บใน memory (reset เมื่อ Vercel cold start) เหมาะสำหรับ demo/test
- สำหรับ production ควรใช้ database เช่น Upstash Redis หรือ PostgreSQL
- User ต้อง Add Friend LINE OA ก่อนถึงจะส่งข้อความได้

## Tech Stack

- Next.js 15 (App Router)
- TypeScript
- Tailwind CSS
- @line/bot-sdk
- Vercel (hosting)
