"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useChatStore, type UiMessage } from "@/lib/store/chatStore";
import MessagesList from "@/components/main-chat/MessagesList";
import ChatInput from "@/components/main-chat/ChatInput";

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const conversationId = useMemo(() => params.id as string, [params.id]);

  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const [hasTriggeredInitialResponse, setHasTriggeredInitialResponse] =
    useState(false);

  // Use selective subscriptions to reduce re-renders
  const getMessagesByChatId = useChatStore(
    (state) => state.getMessagesByChatId
  );
  const setMessages = useChatStore((state) => state.setMessages);
  const streamMessage = useChatStore((state) => state.streamMessage);
  const isStreaming = useChatStore((state) => state.isStreaming);

  useEffect(() => {
    let isCancelled = false;

    const initFromStoreOrFetch = async () => {
      try {
        // First, try to fetch from backend
        try {
          const res = await fetch(`/api/chat/${conversationId}`, {
            method: "GET",
            headers: { "Content-Type": "application/json" },
          });

          if (res.ok) {
            const data = await res.json();
            // Convert backend messages to UI format
            const uiMessages: UiMessage[] = data.messages.map((msg: any) => ({
              id: msg._id || crypto.randomUUID(),
              role: msg.sender === "user" ? "user" : "assistant",
              content: msg.text,
            }));

            // Update store with fetched messages
            setMessages(conversationId, uiMessages);
            if (!isCancelled) setIsFetchingMessages(false);
            return;
          } else if (res.status === 404) {
            // Chat doesn't exist in backend, check local store
            const existing = getMessagesByChatId(conversationId);

            if (existing && existing.length > 0) {
              // We have local messages, create chat in backend
              setMessages(conversationId, existing);

              const createResponse = await fetch(`/api/chats`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  chatId: conversationId,
                  firstMessage: existing[0].content,
                  sender: "user",
                }),
              });

              if (createResponse.ok) {
                const createdChat = await createResponse.json();
                // Add the new chat to the sidebar list
                const { prependNewChat } = useChatStore.getState();
                prependNewChat({
                  _id: createdChat.chat._id,
                  chatId: conversationId,
                  title: createdChat.chat.title || "New Chat",
                  createdAt: createdChat.chat.createdAt,
                  updatedAt: createdChat.chat.updatedAt,
                });
              }
            } else {
              // No messages anywhere, redirect to home
              router.replace("/");
              return;
            }
          } else {
            router.replace("/");
            return;
          }
        } catch (fetchError) {
          console.warn(
            "Failed to fetch from backend, checking local store:",
            fetchError
          );
          // Network error, fall back to local store
          const existing = getMessagesByChatId(conversationId);
          if (existing && existing.length > 0) {
            setMessages(conversationId, existing);
          } else {
            router.replace("/");
            return;
          }
        }
      } catch (_err) {
        console.error(_err);
        router.replace("/");
      } finally {
        if (!isCancelled) setIsFetchingMessages(false);
      }
    };

    if (conversationId) initFromStoreOrFetch();
    return () => {
      isCancelled = true;
    };
  }, [conversationId, router]);

  // Effect to trigger AI response for initial message
  useEffect(() => {
    const triggerInitialResponse = async () => {
      if (hasTriggeredInitialResponse || isFetchingMessages || isStreaming) {
        return;
      }

      const messages = getMessagesByChatId(conversationId);
      if (!messages || messages.length === 0) {
        return;
      }

      // Check if we have only one user message and no assistant response
      const userMessages = messages.filter((msg) => msg.role === "user");
      const assistantMessages = messages.filter(
        (msg) => msg.role === "assistant"
      );

      if (userMessages.length === 1 && assistantMessages.length === 0) {
        setHasTriggeredInitialResponse(true);
        const firstUserMessage = userMessages[0];

        try {
          await streamMessage(conversationId, firstUserMessage.content, {
            appendToStore: true,
            saveUserMessage: false,
          });
        } catch (error) {
          console.error("Error in triggerInitialResponse:", error);
          setHasTriggeredInitialResponse(false); // Reset so user can try again
        }
      }
    };

    // Small delay to ensure messages are loaded first
    const timeoutId = setTimeout(triggerInitialResponse, 500);
    return () => clearTimeout(timeoutId);
  }, [
    conversationId,
    isFetchingMessages,
    hasTriggeredInitialResponse,
    isStreaming,
    getMessagesByChatId,
    streamMessage,
  ]);

  return (
    <div className="h-screen flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-4 pt-16 lg:pt-4 pb-32 scroll-smooth scrollbar-pretty">
        <MessagesList
          conversationId={conversationId}
          isFetchingMessages={isFetchingMessages}
        />
      </div>

      {/* Input Area */}
      <ChatInput conversationId={conversationId} />
    </div>
  );
};

export default ChatPage;
