"use client";

import React, { useEffect, useRef, useCallback, memo, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { MessageSquare, Plus, Trash2, Edit3, Wand2, X } from "lucide-react";
import { motion } from "framer-motion";
import { useChatList } from "@/lib/hooks/useChatList";

interface ChatSidebarProps {
  onClose?: () => void;
}

const ChatSidebar = memo(({ onClose }: ChatSidebarProps) => {
  const router = useRouter();
  const params = useParams();
  const currentChatId = params.id as string;

  // Use custom hook for chat list management
  const {
    chatList,
    loadMore,
    initializeChats,
    retryFetch,
    deleteChat,
    renameChat,
  } = useChatList();
  const { chats, loading, loadingMore, hasMore, error } = chatList;

  // State for managing rename functionality
  const [editingChatId, setEditingChatId] = useState<string | null>(null);
  const [editingTitle, setEditingTitle] = useState("");
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [isRenaming, setIsRenaming] = useState<string | null>(null);

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
      // Close sidebar on mobile after navigation
      if (onClose) {
        onClose();
      }
    },
    [router, onClose]
  );

  const handleNewChat = useCallback(() => {
    router.push("/");
    // Close sidebar on mobile after navigation
    if (onClose) {
      onClose();
    }
  }, [router, onClose]);

  const handleRetry = useCallback(() => {
    retryFetch();
  }, [retryFetch]);

  const handleDeleteChat = useCallback(
    async (chatId: string) => {
      if (window.confirm("Are you sure you want to delete this chat?")) {
        setIsDeleting(chatId);
        const result = await deleteChat(chatId);
        setIsDeleting(null);

        if (result.success && currentChatId === chatId) {
          router.push("/");
        }
      }
    },
    [deleteChat, currentChatId]
  );

  const handleStartRename = useCallback(
    (chatId: string, currentTitle: string) => {
      setEditingChatId(chatId);
      setEditingTitle(currentTitle);
    },
    []
  );

  const handleCancelRename = useCallback(() => {
    setEditingChatId(null);
    setEditingTitle("");
  }, []);

  const handleSubmitRename = useCallback(
    async (chatId: string) => {
      if (editingTitle.trim()) {
        setIsRenaming(chatId);
        const result = await renameChat(chatId, editingTitle.trim());
        setIsRenaming(null);

        if (result.success) {
          setEditingChatId(null);
          setEditingTitle("");
        }
      }
    },
    [editingTitle, renameChat]
  );

  const handleAutoRename = useCallback(
    async (chatId: string) => {
      setIsRenaming(chatId);
      const result = await renameChat(chatId, undefined, true);
      setIsRenaming(null);
    },
    [renameChat]
  );

  if (loading) {
    return (
      <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
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
      <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col">
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
    <div className="w-80 bg-black/20 backdrop-blur-xl border-r border-white/10 flex flex-col h-screen relative">
      {/* Mobile close button */}
      {onClose && (
        <button
          onClick={onClose}
          className="lg:hidden absolute top-4 right-4 z-10 p-2 text-white/60 hover:text-white hover:bg-white/20 rounded-lg transition-colors"
        >
          <X size={20} />
        </button>
      )}
      {/* Header */}
      <div className="p-4 border-b border-white/10 pr-16 lg:pr-4">
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
        className="flex-1 overflow-y-auto p-4 space-y-2 scrollbar-pretty relative"
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
                className={`group relative rounded-md p-3 lg:p-2 transition-all duration-200 ${
                  currentChatId === chat.chatId
                    ? "bg-white/20 border border-white/30"
                    : "bg-white/5 hover:bg-white/10 border border-transparent hover:border-white/20"
                }`}
              >
                <div className="flex items-start justify-between">
                  <div
                    className="flex-1 min-w-0 cursor-pointer"
                    onClick={(e) => {
                      // Only trigger chat click if not clicking on button area
                      if (!(e.target as HTMLElement).closest("button")) {
                        handleChatClick(chat.chatId);
                      }
                    }}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      {editingChatId === chat.chatId ? (
                        <div className="flex items-center gap-2 flex-1">
                          <input
                            type="text"
                            value={editingTitle}
                            onChange={(e) => setEditingTitle(e.target.value)}
                            className="flex-1 bg-white/10 text-white text-sm px-2 py-1 rounded border border-white/20 focus:border-white/40 focus:outline-none"
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                handleSubmitRename(chat.chatId);
                              } else if (e.key === "Escape") {
                                handleCancelRename();
                              }
                            }}
                            autoFocus
                            onBlur={() => handleSubmitRename(chat.chatId)}
                          />
                          <button
                            onClick={handleCancelRename}
                            className="text-white/60 hover:text-white p-1"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      ) : (
                        <>
                          <h3 className="text-sm font-medium text-white truncate">
                            {isRenaming === chat.chatId ? (
                              <span className="flex items-center gap-2">
                                <span className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                                Generating...
                              </span>
                            ) : chat.title && chat.title.trim() !== "" ? (
                              chat.title
                            ) : (
                              "New Chat"
                            )}
                          </h3>
                        </>
                      )}
                    </div>
                  </div>

                  {editingChatId !== chat.chatId && (
                    <div className="flex items-center gap-1 opacity-100 lg:opacity-0 lg:group-hover:opacity-100 transition-opacity">
                      {/* Edit/Rename Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleStartRename(
                            chat.chatId,
                            chat.title || "New Chat"
                          );
                        }}
                        className="p-1 rounded text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                        disabled={
                          isRenaming === chat.chatId ||
                          isDeleting === chat.chatId
                        }
                        type="button"
                        title="Rename chat"
                      >
                        {isRenaming === chat.chatId ? (
                          <div className="w-3 h-3 border border-white/40 border-t-white rounded-full animate-spin" />
                        ) : (
                          <Edit3 size={14} />
                        )}
                      </button>

                      {/* Auto-rename Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleAutoRename(chat.chatId);
                        }}
                        className="p-1 rounded text-white/60 hover:text-white hover:bg-white/20 transition-colors"
                        disabled={
                          isRenaming === chat.chatId ||
                          isDeleting === chat.chatId
                        }
                        type="button"
                        title="Auto-generate name with AI"
                      >
                        <Wand2 size={14} />
                      </button>

                      {/* Delete Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDeleteChat(chat.chatId);
                        }}
                        className="p-1 rounded text-red-400/60 hover:text-red-400 hover:bg-red-500/20 transition-colors"
                        disabled={
                          isRenaming === chat.chatId ||
                          isDeleting === chat.chatId
                        }
                        type="button"
                        title="Delete chat"
                      >
                        {isDeleting === chat.chatId ? (
                          <div className="w-3 h-3 border border-red-400/60 border-t-red-400 rounded-full animate-spin" />
                        ) : (
                          <Trash2 size={14} />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}

            {/* Load more trigger */}
            {hasMore && (
              <div
                ref={loadMoreRef}
                className="h-10 flex items-center justify-center mb-4"
              >
                {loadingMore && (
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                )}
              </div>
            )}

            {!hasMore && chats.length > 0 && (
              <div className="text-center py-4 pb-8">
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
