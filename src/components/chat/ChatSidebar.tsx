"use client";

import React, { useEffect, useRef, useCallback, memo } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, Plus, MoreHorizontal } from "lucide-react";
import { motion } from "framer-motion";
import { useChatList } from "@/lib/hooks/useChatList";

const ChatSidebar = memo(() => {
  const router = useRouter();
  const params = useParams();
  const currentChatId = params.id as string;

  // Use custom hook for chat list management
  const { chatList, loadMore, initializeChats, retryFetch } = useChatList();
  const { chats, loading, loadingMore, hasMore, error } = chatList;

  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const loadMoreRef = useRef<HTMLDivElement>(null);

  // Initial load with caching
  useEffect(() => {
    initializeChats();
  }, [initializeChats]);

  // Intersection Observer for infinite scroll
  useEffect(() => {
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasMore && !loadingMore) {
          loadMore();
        }
      },
      { threshold: 0.1 }
    );

    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }

    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, loadingMore, loadMore]);

  const handleChatClick = useCallback(
    (chatId: string) => {
      router.push(`/chat/${chatId}`);
    },
    [router]
  );

  const handleNewChat = useCallback(() => {
    router.push("/");
  }, [router]);

  const handleRetry = useCallback(() => {
    retryFetch();
  }, [retryFetch]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 1) return "Today";
    if (diffDays === 2) return "Yesterday";
    if (diffDays <= 7) return `${diffDays - 1} days ago`;
    return date.toLocaleDateString();
  };

  if (loading) {
    return (
      <div className="w-60 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="w-full h-10 bg-white/10 rounded-lg animate-pulse" />
        </div>
        <div className="flex-1 p-4 space-y-3">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="h-16 bg-white/5 rounded-lg animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="w-60 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <button
            onClick={handleNewChat}
            className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200"
          >
            <Plus className="text-white" size={18} />
            <span className="text-sm text-white font-medium">New Chat</span>
          </button>
        </div>
        <div className="flex-1 flex items-center justify-center p-4">
          <div className="text-center">
            <p className="text-red-400 text-sm mb-2">Failed to load chats</p>
            <button
              onClick={handleRetry}
              className="text-xs text-white/60 hover:text-white transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="w-60 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col h-screen">
      {/* Header */}
      <div className="p-4 border-b border-white/10">
        <button
          onClick={handleNewChat}
          className="w-full flex items-center gap-2 px-3 py-2 bg-white/10 hover:bg-white/20 rounded-lg transition-all duration-200 group"
        >
          <Plus
            size={18}
            className=" text-white transition-transform group-hover:scale-110"
          />
          <span className="text-sm font-medium text-white">New Chat</span>
        </button>
      </div>

      {/* Chat List */}
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-pretty"
      >
        {chats.length === 0 ? (
          <div className="text-center py-8">
            <MessageSquare size={48} className="mx-auto mb-3 text-white/20" />
            <p className="text-white/60 text-sm">No chats yet</p>
            <p className="text-white/40 text-xs mt-1">
              Start a new conversation
            </p>
          </div>
        ) : (
          <>
            {chats.map((chat, index) => (
              <div
                key={chat.chatId}
                className={`group cursor-pointer rounded-md p-2 transition-all duration-200 ${
                  currentChatId === chat.chatId
                    ? "bg-white/20 border border-white/30"
                    : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20"
                }`}
                onClick={() => handleChatClick(chat.chatId)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <h3 className="text-sm font-medium text-white truncate">
                        {chat.title && chat.title.trim() !== ""
                          ? chat.title
                          : "New Chat"}
                      </h3>
                      <p className="text-right text-xs text-white/50">
                        {formatDate(chat.updatedAt)}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Load more trigger */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="h-10 flex items-center justify-center"
              >
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
              </div>
            )}

            {!hasMore && chats.length > 0 && (
              <div className="text-center py-4">
                <p className="text-white/40 italic text-xs">
                  That's all your chats, qt :P
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
});

ChatSidebar.displayName = "ChatSidebar";

export default ChatSidebar;
