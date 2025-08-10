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

  // Streaming state
  streamingMessage: string;
  isStreaming: boolean;
  setStreamingMessage: (message: string) => void;
  setIsStreaming: (isStreaming: boolean) => void;

  // Streaming actions
  streamMessage: (
    chatId: string,
    text: string,
    options?: { appendToStore?: boolean; saveUserMessage?: boolean }
  ) => Promise<void>;

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

  // Streaming state
  streamingMessage: "",
  isStreaming: false,

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

  // Streaming actions
  setStreamingMessage: (message: string) => set({ streamingMessage: message }),

  setIsStreaming: (isStreaming: boolean) => set({ isStreaming }),

  streamMessage: async (
    chatId: string,
    text: string,
    options: { appendToStore?: boolean; saveUserMessage?: boolean } = {}
  ) => {
    const { appendToStore = true, saveUserMessage = true } = options;

    try {
      // Add user message to store if requested
      if (appendToStore && saveUserMessage) {
        const userMessage: UiMessage = {
          id: crypto.randomUUID(),
          role: "user",
          content: text,
        };
        get().addMessage(chatId, userMessage);
      }

      // Start streaming
      set({ isStreaming: true, streamingMessage: "" });

      // Send message and start streaming response
      const response = await fetch(`/api/chat/${chatId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sender: "user",
          text: text,
          saveUserMessage: saveUserMessage,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let accumulatedMessage = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "chunk") {
                  accumulatedMessage += data.content;
                  set({ streamingMessage: accumulatedMessage });
                } else if (data.type === "complete") {
                  // Add the complete AI message to the store
                  if (appendToStore) {
                    const aiMessage: UiMessage = {
                      id: crypto.randomUUID(),
                      role: "assistant",
                      content: data.content,
                    };
                    get().addMessage(chatId, aiMessage);
                  }
                  set({ streamingMessage: "" });
                  break;
                } else if (data.type === "error") {
                  console.error("Streaming error:", data.error);
                  break;
                }
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Error in streamMessage:", error);
      throw error;
    } finally {
      set({ isStreaming: false });
    }
  },

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
