export const t = {
  app: {
    title: 'LINE Webchat',
  },
  status: {
    realtime: 'Realtime',
    polling: 'Polling',
  },
  storage: {
    warning:
      'แชทเก็บใน memory ชั่วคราว อาจหายเมื่อ server restart ควรตั้ง Vercel Blob หรือ Upstash Redis',
  },
  sidebar: {
    loading: 'กำลังโหลดรายชื่อแชท...',
    emptyTitle: 'ยังไม่มีข้อความ',
    emptyHint: 'ส่งข้อความมาที่ LINE OA เพื่อเริ่มแชท',
    noMessageYet: 'ยังไม่มีข้อความ',
    messagePending: '...',
  },
  chat: {
    back: 'กลับไปรายชื่อแชท',
    loadingMessages: 'กำลังโหลดข้อความ...',
    emptyConversation: 'ยังไม่มีข้อความในแชทนี้',
    imageAlt: 'รูปภาพจาก LINE',
    inputPlaceholder: 'พิมพ์ข้อความ...',
    send: 'ส่งข้อความ',
    selectUser: 'เลือก User เพื่อเริ่มตอบกลับ',
  },
  errors: {
    sendFailed: 'ส่งข้อความไม่สำเร็จ',
  },
} as const;
