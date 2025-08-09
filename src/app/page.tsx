"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import ChatFallback from "@/components/main-chat/ChatFallback";
import { useChatStore } from "@/lib/store/chatStore";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setInitialMessage } = useChatStore();

  const submitChat = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true);
    const conversationId = crypto.randomUUID();
    // Store first message in Zustand for instant render on chat page
    setInitialMessage(conversationId, input);
    router.push(`/chat/${conversationId}`);
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 pb-6 px-4 sm:px-6 lg:px-8">
      <ChatFallback />

      <motion.div
        className="mx-auto max-w-4xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
      >
        <form
          onSubmit={(e) => {
            e.preventDefault();
            submitChat();
          }}
          className="relative group"
        >
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  submitChat();
                }
              }}
              placeholder="Ask me anything..."
              className="w-full text-sm h-24 sm:h-20 lg:h-24 pl-4 pr-16 sm:pr-24 bg-white/10 backdrop-blur-xl border-white/20 text-white placeholder:text-gray-400 focus:bg-white/15 focus:border-white/30 transition-all duration-300 group-hover:border-white/30 resize-none"
              disabled={isLoading}
              autoFocus
            />
          </div>
          <motion.button
            type="submit"
            onClick={(e) => {
              e.preventDefault();
              submitChat();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 sm:p-2 text-white transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10 touch-manipulation"
            disabled={isLoading || !input.trim()}
          >
            <ArrowUp
              size={16}
              className="sm:w-[18px] sm:h-[18px] transition-transform duration-300 group-hover:translate-y-[-2px]"
            />
          </motion.button>
          {isLoading && (
            <div className="absolute right-12 sm:right-14 top-1/2 transform -translate-y-1/2">
              <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            </div>
          )}
        </form>
        <p className="text-xs sm:text-xs text-gray-400 mt-2 text-center px-2">
          Press Enter to send, Shift + Enter for new line
        </p>
      </motion.div>
    </div>
  );
}
