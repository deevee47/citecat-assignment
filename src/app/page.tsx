"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Textarea } from "@/components/ui/textarea";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import ChatFallback from "@/components/main-chat/ChatFallback";

export default function ChatPage() {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const submitChat = async () => {
    if (!input.trim() || isLoading) return;
    setIsLoading(true); //TODO: better loading state? specific to nextjs
    const conversationId = crypto.randomUUID();
    sessionStorage.setItem(`chat-${conversationId}-initial`, input); //TODO: use zustand
    router.push(`/chat/${conversationId}`); //TODO: use params
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    await submitChat();
  };

  return (
    <div className="min-h-screen flex flex-col justify-between p-4 pb-6">
      <ChatFallback />

      <motion.div
        className="mx-auto max-w-4xl w-full"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay: 1.2, ease: "easeOut" }}
      >
        <form onSubmit={handleSubmit} className="relative group">
          <div className="relative">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  handleSubmit(e);
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
  );
}
