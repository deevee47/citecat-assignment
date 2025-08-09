"use client";

import { ArrowUp, Bot } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
import { useChatStore, type UiMessage } from "@/lib/store/chatStore";

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const conversationId = useMemo(() => params.id as string, [params.id]);

  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);
  const { getMessagesByChatId, setMessages, addMessage, chatIdToMessages } =
    useChatStore();

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
            // Other error, check local store as fallback
            const existing = getMessagesByChatId(conversationId);
            if (existing && existing.length > 0) {
              setMessages(conversationId, existing);
            } else {
              router.replace("/");
              return;
            }
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
      isCancelled = true; //TODO: what is isCancelled
    };
  }, [conversationId, router]); //TODO: why is router needed here?
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    const content = input.trim();
    if (!content) return;

    const newMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const existingMessages = getMessagesByChatId(conversationId) ?? [];

    addMessage(conversationId, newMsg);
    setMessages(conversationId, [...existingMessages, newMsg]);
    setInput("");

    // Persist to backend
    try {
      // Add message to existing chat
      await fetch(`/api/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "user", text: content }),
      });
    } catch (_) {
      // ignore for now
    } finally {
      setIsLoading(false);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  return (
    <div className="h-screen flex flex-col">
      {/* Messages Area */}
      <div className="flex-1 overflow-y-auto px-4 pt-4 pb-32">
        <div className="w-full max-w-4xl mx-auto">
          {isFetchingMessages && (
            <div className="w-full py-6 flex justify-center">
              <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}

          {!isFetchingMessages &&
            chatIdToMessages[conversationId]?.map((msg, index) => {
              let mainContent = msg.content;

              return (
                <motion.div
                  key={msg.id}
                  className={`mb-3 flex flex-col ${
                    msg.role === "user" ? "items-end" : "items-start"
                  }`}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {msg.role === "assistant" ? (
                      <Avatar>
                        <Bot size={14} className="text-white" />
                      </Avatar>
                    ) : (
                      <></>
                    )}
                    <span className="text-xs text-gray-400">
                      {msg.role === "user" ? "" : "Assistant"}
                    </span>
                  </div>

                  <div
                    className={` ${
                      msg.role === "user" ? "flex flex-col items-end" : ""
                    }`}
                  >
                    {/* Assistant/User message content - appears below */}
                    {msg.role && (
                      <div
                        className={`p-3 rounded-xl ${
                          msg.role === "user"
                            ? "bg-white/10 rounded-tr-none w-full"
                            : "bg-black/20 rounded-tl-none w-full"
                        }`}
                      >
                        <p className="text-white text-sm leading-relaxed">
                          {mainContent}
                        </p>
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}

          {/* Input Area */}
          <motion.div
            className="fixed bottom-0 left-0 right-0 mx-auto max-w-4xl px-4 md:px-0 w-full pb-6"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2, ease: "easeOut" }}
          >
            <form onSubmit={handleSubmit} className="relative group">
              <div className="relative">
                <Textarea
                  value={input}
                  onChange={handleInputChange}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSubmit(e as unknown as React.FormEvent);
                    }
                  }}
                  placeholder="Ask me anything..."
                  className="w-full text-sm h-24 pl-4 pr-24 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30 transition-all duration-300 group-hover:border-white/30"
                  disabled={isLoading}
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-white transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                disabled={isLoading || !input.trim()}
              >
                <ArrowUp
                  size={18}
                  className="transition-transform duration-300 group-hover:translate-y-[-2px]"
                />
              </motion.button>
              {isLoading && (
                <div className="absolute right-14 top-1/2 transform -translate-y-1/2">
                  <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                </div>
              )}
            </form>
            <p className="text-xs text-gray-400 mt-2 text-center">
              Press Enter to send, Shift + Enter for new line
            </p>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ChatPage;
