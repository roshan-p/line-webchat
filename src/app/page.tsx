'use client';

import { useCallback, useEffect, useRef, useState } from 'react';

interface ChatUser {
  userId: string;
  displayName: string;
  pictureUrl?: string;
  lastMessage?: string;
  lastMessageAt: number;
  unreadCount: number;
}

interface ChatMessage {
  id: string;
  userId: string;
  direction: 'inbound' | 'outbound';
  messageType?: 'text' | 'image';
  text: string;
  lineMessageId?: string;
  timestamp: number;
}

function formatTime(ts: number) {
  return new Date(ts).toLocaleTimeString('th-TH', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Spinner({ className = 'h-6 w-6' }: { className?: string }) {
  return (
    <svg
      className={`animate-spin text-line-green ${className}`}
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        className="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="4"
      />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

function SidebarSkeleton() {
  return (
    <div className="space-y-1 px-2 py-2">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="flex animate-pulse items-center gap-3 rounded-lg px-2 py-3">
          <div className="h-10 w-10 shrink-0 rounded-full bg-white/10" />
          <div className="min-w-0 flex-1 space-y-2">
            <div className="h-3 w-24 rounded bg-white/10" />
            <div className="h-2 w-32 rounded bg-white/5" />
          </div>
        </div>
      ))}
    </div>
  );
}

function Avatar({ user }: { user: ChatUser }) {
  if (user.pictureUrl) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={user.pictureUrl}
      alt={user.displayName}
      className="h-10 w-10 rounded-full object-cover"
    />
  );
  }
  return (
    <div className="flex h-10 w-10 items-center justify-center rounded-full bg-line-green text-sm font-bold text-white">
      {user.displayName.charAt(0).toUpperCase()}
    </div>
  );
}

export default function WebchatPage() {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [storageWarning, setStorageWarning] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const selectedUser = users.find((u) => u.userId === selectedUserId) ?? null;

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data.users ?? []);
    } catch {
      /* ignore */
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const fetchMessages = useCallback(async (userId: string) => {
    try {
      const res = await fetch(
        `/api/messages/${encodeURIComponent(userId)}?markRead=true`,
      );
      const data = await res.json();
      setMessages(data.messages ?? []);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    let fallbackPoll: ReturnType<typeof setInterval> | null = null;

    fetchUsers();

    fetch('/api/health')
      .then((res) => res.json())
      .then((data) => setStorageWarning(!data.persistent))
      .catch(() => setStorageWarning(true));

    const es = new EventSource('/api/events');
    es.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        setUsers(data.users ?? []);
        setUsersLoading(false);
        if (fallbackPoll) {
          clearInterval(fallbackPoll);
          fallbackPoll = null;
        }
      } catch {
        /* ignore */
      }
    };
    es.onerror = () => {
      es.close();
      if (!fallbackPoll) {
        fallbackPoll = setInterval(fetchUsers, 15000);
      }
    };

    return () => {
      es.close();
      if (fallbackPoll) clearInterval(fallbackPoll);
    };
  }, [fetchUsers]);

  useEffect(() => {
    if (!selectedUserId) return;
    fetchMessages(selectedUserId);
    pollRef.current = setInterval(() => fetchMessages(selectedUserId), 5000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [selectedUserId, fetchMessages]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSelectUser = (userId: string) => {
    setSelectedUserId(userId);
    setError(null);
  };

  const handleSend = async () => {
    if (!selectedUserId || !input.trim() || sending) return;
    setSending(true);
    setError(null);
    try {
      const res = await fetch('/api/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: selectedUserId, text: input.trim() }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? 'Send failed');
      setMessages((prev) => [...prev, data.message]);
      setInput('');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send');
    } finally {
      setSending(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-screen flex-col overflow-hidden">
      {storageWarning && (
        <div className="shrink-0 border-b border-amber-500/30 bg-amber-500/10 px-4 py-2 text-center text-xs text-amber-200">
          แชทเก็บใน memory ชั่วคราว อาจหายเมื่อ server restart ควรตั้ง Vercel Blob หรือ Upstash Redis
        </div>
      )}
    <div className="flex min-h-0 flex-1 overflow-hidden">
      {/* Sidebar */}
      <aside className="flex w-80 shrink-0 flex-col border-r border-line-border bg-line-panel">
        <div className="border-b border-line-border px-4 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-line-green">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-white">
                <path d="M19.365 9.863c.349 0 .63.285.63.631 0 .345-.281.63-.63.63H17.61v1.125h1.755c.349 0 .63.283.63.63 0 .344-.281.629-.63.629h-2.386c-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63h2.386c.349 0 .63.285.63.63 0 .349-.281.63-.63.63H17.61v1.125h1.755zm-3.855 3.016c0 .27-.174.51-.432.596-.064.021-.133.031-.199.031-.211 0-.391-.09-.51-.25l-2.443-3.317v2.94c0 .344-.279.629-.631.629-.346 0-.626-.285-.626-.629V8.108c0-.27.173-.51.43-.595.06-.023.136-.033.194-.033.195 0 .375.104.495.254l2.462 3.33V8.108c0-.345.282-.63.63-.63.345 0 .63.285.63.63v4.771zm-5.741 0c0 .344-.282.629-.631.629-.345 0-.627-.285-.627-.629V8.108c0-.345.282-.63.63-.63.346 0 .628.285.628.63v4.771zm-2.466.629H4.917c-.345 0-.63-.285-.63-.629V8.108c0-.345.285-.63.63-.63.348 0 .63.285.63.63v4.141h1.756c.348 0 .629.283.629.63 0 .344-.282.629-.629.629M24 10.314C24 4.943 18.615.572 12 .572S0 4.943 0 10.314c0 4.811 4.27 8.842 10.035 9.608.391.082.923.258 1.058.59.12.301.079.766.038 1.08l-.164 1.02c-.045.301-.24 1.186 1.049.645 1.291-.539 6.916-4.078 9.436-6.975C23.176 14.393 24 12.458 24 10.314" />
              </svg>
            </div>
            <div>
              <h1 className="text-sm font-semibold">LINE Webchat</h1>
              <p className="text-xs text-gray-400">Admin Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto">
          {usersLoading ? (
            <div className="flex flex-col">
              <div className="flex flex-col items-center gap-3 px-4 py-8">
                <Spinner />
                <p className="text-xs text-gray-500">กำลังโหลดรายชื่อแชท...</p>
              </div>
              <SidebarSkeleton />
            </div>
          ) : users.length === 0 ? (
            <div className="px-4 py-8 text-center text-sm text-gray-500">
              <p>ยังไม่มีข้อความ</p>
              <p className="mt-1 text-xs">ส่งข้อความมาที่ LINE OA เพื่อเริ่มแชท</p>
            </div>
          ) : (
            users.map((user) => (
              <button
                key={user.userId}
                onClick={() => handleSelectUser(user.userId)}
                className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-white/5 ${
                  selectedUserId === user.userId ? 'bg-white/10' : ''
                }`}
              >
                <Avatar user={user} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <span className="truncate text-sm font-medium">
                      {user.displayName}
                    </span>
                    {user.lastMessageAt > 0 && (
                      <span className="ml-1 shrink-0 text-xs text-gray-500">
                        {formatTime(user.lastMessageAt)}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center justify-between">
                    <p className="truncate text-xs text-gray-400">
                      {user.lastMessage ?? '...'}
                    </p>
                    {user.unreadCount > 0 && (
                      <span className="ml-1 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-line-green text-xs font-bold text-white">
                        {user.unreadCount}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </aside>

      {/* Chat area */}
      <main className="flex flex-1 flex-col">
        {selectedUser ? (
          <>
            <header className="flex items-center gap-3 border-b border-line-border bg-line-panel px-6 py-3">
              <Avatar user={selectedUser} />
              <div>
                <h2 className="font-semibold">{selectedUser.displayName}</h2>
                <p className="text-xs text-gray-400">
                  ID: {selectedUser.userId.slice(0, 12)}...
                </p>
              </div>
            </header>

            <div className="flex-1 overflow-y-auto px-6 py-4">
              {messages.length === 0 ? (
                <p className="text-center text-sm text-gray-500">
                  ยังไม่มีข้อความในแชทนี้
                </p>
              ) : (
                messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`mb-3 flex ${
                      msg.direction === 'outbound' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    <div
                      className={`max-w-xs rounded-2xl text-sm lg:max-w-md ${
                        msg.direction === 'outbound'
                          ? 'rounded-br-sm bg-line-green text-white'
                          : 'rounded-bl-sm bg-line-panel text-gray-100'
                      } ${msg.messageType === 'image' ? 'overflow-hidden p-1' : 'px-4 py-2'}`}
                    >
                      {msg.messageType === 'image' && msg.lineMessageId ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={`/api/line-content/${msg.lineMessageId}`}
                          alt="รูปภาพจาก LINE"
                          className="max-h-64 w-full rounded-xl object-cover"
                        />
                      ) : (
                        <p className="whitespace-pre-wrap break-words px-3 py-1">{msg.text}</p>
                      )}
                      <p
                        className={`mt-1 px-3 pb-1 text-right text-xs ${
                          msg.direction === 'outbound'
                            ? 'text-green-100'
                            : 'text-gray-500'
                        }`}
                      >
                        {formatTime(msg.timestamp)}
                      </p>
                    </div>
                  </div>
                ))
              )}
              <div ref={messagesEndRef} />
            </div>

            {error && (
              <div className="mx-6 mb-2 rounded-lg bg-red-900/40 px-4 py-2 text-sm text-red-300">
                {error}
              </div>
            )}

            <div className="border-t border-line-border bg-line-panel px-6 py-4">
              <div className="flex gap-3">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="พิมพ์ข้อความ..."
                  rows={1}
                  className="flex-1 resize-none rounded-xl border border-line-border bg-[#0f0f1a] px-4 py-3 text-sm text-white placeholder-gray-500 outline-none focus:border-line-green"
                />
                <button
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                  className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-line-green text-white transition-opacity hover:opacity-90 disabled:opacity-40"
                >
                  {sending ? (
                    <span className="text-xs">...</span>
                  ) : (
                    <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current">
                      <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 text-gray-500">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-line-panel">
              <svg viewBox="0 0 24 24" className="h-10 w-10 fill-line-green">
                <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2zm0 14H5.17L4 17.17V4h16v12z" />
              </svg>
            </div>
            <p className="text-sm">เลือก User เพื่อเริ่มตอบกลับ</p>
          </div>
        )}
      </main>
    </div>
    </div>
  );
}
