"use client";

import React, { memo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowUp } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { useChatStore } from "@/lib/store/chatStore";

type ChatInputProps = {
  conversationId: string;
  onSubmit?: () => void;
};

const ChatInput = memo(({ conversationId, onSubmit }: ChatInputProps) => {
  const [input, setInput] = useState("");

  // Use selectors to only subscribe to specific state
  const isStreaming = useChatStore((state) => state.isStreaming);
  const streamMessage = useChatStore((state) => state.streamMessage);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isStreaming) return;

    const content = input.trim();
    if (!content) return;

    setInput("");

    try {
      await streamMessage(conversationId, content, {
        appendToStore: true,
        saveUserMessage: true,
      });

      onSubmit?.();
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };

  return (
    <motion.div
      className="fixed bottom-0 left-0 lg:left-80 right-0 mx-auto max-w-4xl px-4 sm:px-0 w-full pb-6"
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
            className="w-full text-sm h-20 sm:h-24 pl-4 pr-16 sm:pr-24 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30 transition-all duration-300 group-hover:border-white/30 resize-none"
            disabled={isStreaming}
            autoFocus
          />
        </div>
        <motion.button
          type="submit"
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-white transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
          disabled={isStreaming || !input.trim()}
        >
          <ArrowUp
            size={16}
            className="sm:w-[18px] sm:h-[18px] transition-transform duration-300 group-hover:translate-y-[-2px]"
          />
        </motion.button>
        {isStreaming && (
          <div className="absolute right-12 sm:right-14 top-1/2 transform -translate-y-1/2">
            <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
          </div>
        )}
      </form>
      <p className="text-xs sm:text-xs text-gray-400 mt-2 text-center px-2">
        Press Enter to send, Shift + Enter for new line
      </p>
    </motion.div>
  );
});

ChatInput.displayName = "ChatInput";

export default ChatInput;
