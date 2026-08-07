'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useRealtime } from './useRealtime';
import * as api from '@/lib/api-client';
import { POLL_INTERVAL_MS } from '@/lib/constants';
import type { ChatMessage, ChatUser } from '@/types/chat';

export interface UseChatResult {
  users: ChatUser[];
  usersLoading: boolean;
  selectedUser: ChatUser | null;
  selectedUserId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  unreadOnOpen: number;
  isLive: boolean;
  selectUser: (userId: string | null) => void;
  send: (text: string) => void;
  retry: (messageId: string) => void;
}

let optimisticCounter = 0;

function nextOptimisticId(): string {
  optimisticCounter += 1;
  return `pending-${Date.now()}-${optimisticCounter}`;
}

/**
 * Owns the conversation state: which chat is open, its messages, and keeping
 * both fresh through realtime pushes with polling as a fallback.
 */
export function useChat(realtimeEnabled: boolean): UseChatResult {
  const [users, setUsers] = useState<ChatUser[]>([]);
  const [usersLoading, setUsersLoading] = useState(true);
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [unreadOnOpen, setUnreadOnOpen] = useState(0);
  const selectedUserIdRef = useRef<string | null>(null);

  const loadUsers = useCallback(async () => {
    try {
      setUsers(await api.fetchUsers());
    } catch {
      // A failed refresh is harmless; the next tick will try again.
    } finally {
      setUsersLoading(false);
    }
  }, []);

  const loadMessages = useCallback(async (userId: string, silent = false) => {
    if (!silent) setMessagesLoading(true);
    try {
      const stored = await api.fetchMessages(userId);
      // Optimistic messages are not on the server yet, so a refresh would drop
      // them unless they are carried over.
      setMessages((prev) => [...stored, ...prev.filter((message) => message.deliveryStatus)]);
    } catch {
      // Keep whatever is already on screen rather than blanking the chat.
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const refresh = useCallback(() => {
    loadUsers();
    if (selectedUserId) loadMessages(selectedUserId, true);
  }, [loadUsers, loadMessages, selectedUserId]);

  const realtimeStatus = useRealtime(realtimeEnabled, (event) => {
    loadUsers();
    if (event.userId === selectedUserId) loadMessages(event.userId, true);
  });

  const isLive = realtimeStatus === 'connected';

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadMessages(selectedUserId);
  }, [selectedUserId, loadMessages]);

  // Realtime pushes make polling redundant, so it only runs when the socket is
  // down. Reconnecting fills the gap through the refresh below.
  useEffect(() => {
    if (isLive) return;
    const timer = setInterval(refresh, POLL_INTERVAL_MS);
    return () => clearInterval(timer);
  }, [isLive, refresh]);

  const refreshRef = useRef(refresh);
  refreshRef.current = refresh;

  useEffect(() => {
    if (!isLive) return;
    refreshRef.current();
  }, [isLive]);

  // Background tabs get throttled, so anything pushed while hidden is caught up
  // on return.
  useEffect(() => {
    const onVisible = () => {
      if (document.visibilityState === 'visible') refreshRef.current();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const selectUser = useCallback(
    (userId: string | null) => {
      if (selectedUserIdRef.current === userId) return;

      selectedUserIdRef.current = userId;
      setSelectedUserId(userId);
      setMessages([]);
      setUnreadOnOpen(
        userId ? (users.find((user) => user.userId === userId)?.unreadCount ?? 0) : 0,
      );
    },
    [users],
  );

  const deliver = useCallback(async (userId: string, id: string, text: string) => {
    try {
      const sent = await api.sendMessage(userId, text);
      setMessages((prev) =>
        // The realtime push can land before this response, in which case the
        // stored copy is already here and swapping in would duplicate it.
        prev
          .filter((message) => message.id !== sent.id)
          .map((message) => (message.id === id ? sent : message)),
      );
    } catch {
      setMessages((prev) =>
        prev.map((message) =>
          message.id === id ? { ...message, deliveryStatus: 'failed' as const } : message,
        ),
      );
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      if (!selectedUserId) return;
      const pending: ChatMessage = {
        id: nextOptimisticId(),
        userId: selectedUserId,
        direction: 'outbound',
        messageType: 'text',
        text,
        timestamp: Date.now(),
        deliveryStatus: 'sending',
      };
      setMessages((prev) => [...prev, pending]);
      deliver(selectedUserId, pending.id, text);
    },
    [selectedUserId, deliver],
  );

  const retry = useCallback(
    (messageId: string) => {
      const target = messages.find((message) => message.id === messageId);
      if (!target?.text || target.deliveryStatus !== 'failed') return;
      setMessages((prev) =>
        prev.map((message) =>
          message.id === messageId ? { ...message, deliveryStatus: 'sending' as const } : message,
        ),
      );
      deliver(target.userId, messageId, target.text);
    },
    [messages, deliver],
  );

  return {
    users,
    usersLoading,
    selectedUser: users.find((user) => user.userId === selectedUserId) ?? null,
    selectedUserId,
    messages,
    messagesLoading,
    unreadOnOpen,
    isLive,
    selectUser,
    send,
    retry,
  };
}
