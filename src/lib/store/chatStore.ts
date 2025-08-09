"use client";

import { create } from "zustand";

export type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

export type ChatListItem = {
  _id: string;
  chatId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
};

export type ChatListState = {
  chats: ChatListItem[];
  loading: boolean;
  loadingMore: boolean;
  hasMore: boolean;
  page: number;
  error: string | null;
  lastFetchTime: number;
};

type ChatStore = {
  // Messages state
  chatIdToMessages: Record<string, UiMessage[]>;
  getMessagesByChatId: (chatId: string) => UiMessage[] | undefined;
  setInitialMessage: (chatId: string, content: string) => void;
  setMessages: (chatId: string, messages: UiMessage[]) => void;
  addMessage: (chatId: string, message: UiMessage) => void;
  clearChat: (chatId: string) => void;

  // Chat list state
  chatList: ChatListState;

  // Chat list actions
  setChatListLoading: (loading: boolean) => void;
  setChatListLoadingMore: (loadingMore: boolean) => void;
  setChatList: (chats: ChatListItem[], hasMore: boolean, page: number) => void;
  appendToChatList: (
    chats: ChatListItem[],
    hasMore: boolean,
    page: number
  ) => void;
  prependNewChat: (chat: ChatListItem) => void;
  updateChatInList: (chatId: string, updates: Partial<ChatListItem>) => void;
  updateChatTitle: (chatId: string, title: string) => void;
  removeChatFromList: (chatId: string) => void;
  shouldRefreshChatList: () => boolean;
  resetChatList: () => void;
};

const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes

export const useChatStore = create<ChatStore>((set, get) => ({
  // Messages state
  chatIdToMessages: {},

  // Chat list initial state
  chatList: {
    chats: [],
    loading: false,
    loadingMore: false,
    hasMore: true,
    page: 1,
    error: null,
    lastFetchTime: 0,
  },

  // Message actions
  getMessagesByChatId: (chatId: string) => get().chatIdToMessages[chatId],

  setInitialMessage: (chatId: string, content: string) =>
    set((state) => ({
      chatIdToMessages: {
        ...state.chatIdToMessages,
        [chatId]: [
          {
            id: crypto.randomUUID(),
            role: "user",
            content,
          },
        ],
      },
    })),

  setMessages: (chatId: string, messages: UiMessage[]) =>
    set((state) => ({
      chatIdToMessages: {
        ...state.chatIdToMessages,
        [chatId]: messages,
      },
    })),

  addMessage: (chatId: string, message: UiMessage) =>
    set((state) => ({
      chatIdToMessages: {
        ...state.chatIdToMessages,
        [chatId]: [...(state.chatIdToMessages[chatId] ?? []), message],
      },
    })),

  clearChat: (chatId: string) =>
    set((state) => {
      const clone = { ...state.chatIdToMessages };
      delete clone[chatId];
      return { chatIdToMessages: clone };
    }),

  // Chat list actions
  setChatListLoading: (loading: boolean) =>
    set((state) => ({
      chatList: { ...state.chatList, loading },
    })),

  setChatListLoadingMore: (loadingMore: boolean) =>
    set((state) => ({
      chatList: { ...state.chatList, loadingMore },
    })),

  setChatList: (chats: ChatListItem[], hasMore: boolean, page: number) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats,
        hasMore,
        page,
        loading: false,
        loadingMore: false,
        error: null,
        lastFetchTime: Date.now(),
      },
    })),

  appendToChatList: (chats: ChatListItem[], hasMore: boolean, page: number) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats: [...state.chatList.chats, ...chats],
        hasMore,
        page,
        loadingMore: false,
        error: null,
        lastFetchTime: Date.now(),
      },
    })),

  prependNewChat: (chat: ChatListItem) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats: [chat, ...state.chatList.chats],
      },
    })),

  updateChatInList: (chatId: string, updates: Partial<ChatListItem>) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats: state.chatList.chats.map((chat) =>
          chat.chatId === chatId ? { ...chat, ...updates } : chat
        ),
      },
    })),

  updateChatTitle: (chatId: string, title: string) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats: state.chatList.chats.map((chat) =>
          chat.chatId === chatId ? { ...chat, title } : chat
        ),
      },
    })),

  removeChatFromList: (chatId: string) =>
    set((state) => ({
      chatList: {
        ...state.chatList,
        chats: state.chatList.chats.filter((chat) => chat.chatId !== chatId),
      },
    })),

  shouldRefreshChatList: () => {
    const { lastFetchTime } = get().chatList;
    return Date.now() - lastFetchTime > CACHE_DURATION;
  },

  resetChatList: () =>
    set((state) => ({
      chatList: {
        chats: [],
        loading: false,
        loadingMore: false,
        hasMore: true,
        page: 1,
        error: null,
        lastFetchTime: 0,
      },
    })),
}));
