"use client";

import React, { memo, useRef, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { Bot } from "lucide-react";
import { Avatar } from "@/components/ui/avatar";
import { useChatStore, type UiMessage } from "@/lib/store/chatStore";

type MessagesListProps = {
  conversationId: string;
  isFetchingMessages: boolean;
};

const MessagesList = memo(
  ({ conversationId, isFetchingMessages }: MessagesListProps) => {
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Use selectors to only subscribe to specific state
    const messages = useChatStore(
      (state) => state.chatIdToMessages[conversationId]
    );
    const streamingMessage = useChatStore((state) => state.streamingMessage);
    const isStreaming = useChatStore((state) => state.isStreaming);
    const isLoading = useChatStore(
      (state) => state.isStreaming && !state.streamingMessage
    );

    // Auto-scroll to bottom when new messages arrive or when streaming
    const scrollToBottom = useCallback(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, []);

    useEffect(() => {
      scrollToBottom();
    }, [messages, streamingMessage, scrollToBottom]);

    return (
      <div className="w-full max-w-4xl mx-auto space-y-4">
        {isFetchingMessages && (
          <div className="w-full py-6 flex justify-center">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}

        {!isFetchingMessages &&
          messages?.map((msg, index) => {
            let mainContent = msg.content;

            return (
              <motion.div
                key={msg.id}
                className={`flex flex-col ${
                  msg.role === "user" ? "items-end" : "items-start"
                } w-full`}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              >
                <div
                  className={`flex items-center gap-2 mb-1 ${
                    msg.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
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
                  className={`w-full ${
                    msg.role === "user"
                      ? "flex justify-end"
                      : "flex justify-start"
                  }`}
                >
                  {/* Assistant/User message content - appears below */}
                  {msg.role && (
                    <div
                      className={`p-3 sm:p-4 rounded-xl break-words max-w-[85%] sm:max-w-[80%] ${
                        msg.role === "user"
                          ? "bg-white/10 rounded-tr-none"
                          : "bg-black/20 rounded-tl-none"
                      }`}
                    >
                      <p className="text-white text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                        {mainContent}
                      </p>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}

        {/* Streaming Message */}
        {isStreaming && streamingMessage && (
          <motion.div
            className="flex flex-col items-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Avatar>
                <Bot size={14} className="text-white" />
              </Avatar>
              <span className="text-xs text-gray-400">Assistant</span>
              <div className="flex space-x-1">
                <div className="w-1 h-1 bg-white rounded-full animate-pulse"></div>
                <div
                  className="w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: "0.2s" }}
                ></div>
                <div
                  className="w-1 h-1 bg-white rounded-full animate-pulse"
                  style={{ animationDelay: "0.4s" }}
                ></div>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl rounded-tl-none p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]">
              <p className="text-white text-sm sm:text-base leading-relaxed whitespace-pre-wrap break-words">
                {streamingMessage}
                <span className="inline-block w-2 h-5 bg-white animate-pulse ml-1"></span>
              </p>
            </div>
          </motion.div>
        )}

        {/* Loading indicator when waiting for stream to start */}
        {isLoading && (
          <motion.div
            className="flex flex-col items-start"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <div className="flex items-center gap-2 mb-1">
              <Avatar>
                <Bot size={14} className="text-white" />
              </Avatar>
              <span className="text-xs text-gray-400">Assistant</span>
            </div>
            <div className="bg-black/20 rounded-xl rounded-tl-none p-3 sm:p-4 max-w-[85%] sm:max-w-[80%]">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
                <div
                  className="w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.1s" }}
                ></div>
                <div
                  className="w-2 h-2 bg-white rounded-full animate-bounce"
                  style={{ animationDelay: "0.2s" }}
                ></div>
              </div>
            </div>
          </motion.div>
        )}

        {/* Scroll anchor */}
        <div className="h-10" ref={messagesEndRef} />
      </div>
    );
  }
);

MessagesList.displayName = "MessagesList";

export default MessagesList;
