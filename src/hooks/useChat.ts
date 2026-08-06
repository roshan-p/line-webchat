'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRealtime } from './useRealtime';
import * as api from '@/lib/api-client';
import { POLL_INTERVAL_MS } from '@/lib/constants';
import { t } from '@/lib/i18n';
import type { ChatMessage, ChatUser } from '@/types/chat';

export interface UseChatResult {
  users: ChatUser[];
  usersLoading: boolean;
  selectedUser: ChatUser | null;
  selectedUserId: string | null;
  messages: ChatMessage[];
  messagesLoading: boolean;
  sending: boolean;
  error: string | null;
  isLive: boolean;
  selectUser: (userId: string | null) => void;
  send: (text: string) => Promise<boolean>;
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
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);

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
      setMessages(await api.fetchMessages(userId));
    } catch {
      // Keep whatever is already on screen rather than blanking the chat.
    } finally {
      setMessagesLoading(false);
    }
  }, []);

  const realtimeStatus = useRealtime(realtimeEnabled, (event) => {
    loadUsers();
    if (event.userId === selectedUserId) loadMessages(event.userId, true);
  });

  const isLive = realtimeStatus === 'connected';
  const pollInterval = isLive ? POLL_INTERVAL_MS.live : POLL_INTERVAL_MS.fallback;

  useEffect(() => {
    loadUsers();
    const timer = setInterval(loadUsers, pollInterval);
    return () => clearInterval(timer);
  }, [loadUsers, pollInterval]);

  useEffect(() => {
    if (!selectedUserId) return;
    loadMessages(selectedUserId);
    const timer = setInterval(() => loadMessages(selectedUserId, true), pollInterval);
    return () => clearInterval(timer);
  }, [selectedUserId, loadMessages, pollInterval]);

  const selectUser = useCallback((userId: string | null) => {
    setSelectedUserId(userId);
    setMessages([]);
    setError(null);
  }, []);

  const send = useCallback(
    async (text: string) => {
      if (!selectedUserId || sending) return false;
      setSending(true);
      setError(null);
      try {
        const message = await api.sendMessage(selectedUserId, text);
        setMessages((prev) => [...prev, message]);
        return true;
      } catch (err) {
        setError(err instanceof Error ? err.message : t.errors.sendFailed);
        return false;
      } finally {
        setSending(false);
      }
    },
    [selectedUserId, sending],
  );

  return {
    users,
    usersLoading,
    selectedUser: users.find((user) => user.userId === selectedUserId) ?? null,
    selectedUserId,
    messages,
    messagesLoading,
    sending,
    error,
    isLive,
    selectUser,
    send,
  };
}
