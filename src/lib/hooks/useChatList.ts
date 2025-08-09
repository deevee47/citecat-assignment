"use client";

import { useCallback } from "react";
import { useChatStore, type ChatListItem } from "@/lib/store/chatStore";

interface ChatResponse {
  chats: ChatListItem[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    hasMore: boolean;
    totalPages: number;
  };
}

export const useChatList = () => {
  const {
    chatList,
    setChatListLoading,
    setChatListLoadingMore,
    setChatList,
    appendToChatList,
    shouldRefreshChatList,
    prependNewChat,
    updateChatInList,
    removeChatFromList,
    updateChatTitle,
  } = useChatStore();

  const fetchChats = useCallback(
    async (pageNum: number, isLoadMore = false) => {
      try {
        if (isLoadMore) {
          setChatListLoadingMore(true);
        } else {
          setChatListLoading(true);
        }

        const response = await fetch(`/api/chats?page=${pageNum}&limit=10`);

        if (!response.ok) {
          throw new Error("Failed to fetch chats");
        }

        const data: ChatResponse = await response.json();

        if (isLoadMore) {
          appendToChatList(data.chats, data.pagination.hasMore, pageNum);
        } else {
          setChatList(data.chats, data.pagination.hasMore, pageNum);
        }
      } catch (err) {
        console.error(err);
      }
    },
    [setChatListLoading, setChatListLoadingMore, setChatList, appendToChatList]
  );

  const loadMore = useCallback(() => {
    const { loadingMore, hasMore, page } = chatList;
    if (!loadingMore && hasMore) {
      const nextPage = page + 1;
      fetchChats(nextPage, true);
    }
  }, [chatList, fetchChats]);

  const initializeChats = useCallback(() => {
    // Only fetch if we don't have data or if it's stale
    if (chatList.chats.length === 0 || shouldRefreshChatList()) {
      fetchChats(1);
    }
  }, [chatList.chats.length, shouldRefreshChatList, fetchChats]);

  const retryFetch = useCallback(() => {
    fetchChats(1);
  }, [fetchChats]);

  const deleteChat = useCallback(
    async (chatId: string) => {
      try {
        const response = await fetch(
          `/api/chats?chatId=${encodeURIComponent(chatId)}`,
          {
            method: "DELETE",
          }
        );

        if (!response.ok) {
          throw new Error("Failed to delete chat");
        }

        removeChatFromList(chatId);
        return { success: true };
      } catch (error) {
        console.error("Error deleting chat:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [removeChatFromList]
  );

  const renameChat = useCallback(
    async (chatId: string, title?: string, autoGenerate = false) => {
      try {
        const response = await fetch("/api/chats", {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            chatId,
            title,
            autoGenerate,
          }),
        });

        if (!response.ok) {
          throw new Error("Failed to rename chat");
        }

        const data = await response.json();
        updateChatTitle(chatId, data.chat.title);
        return { success: true, title: data.chat.title };
      } catch (error) {
        console.error("Error renaming chat:", error);
        return {
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        };
      }
    },
    [updateChatTitle]
  );

  return {
    chatList,
    fetchChats,
    loadMore,
    initializeChats,
    retryFetch,
    prependNewChat,
    updateChatInList,
    deleteChat,
    renameChat,
  };
};
