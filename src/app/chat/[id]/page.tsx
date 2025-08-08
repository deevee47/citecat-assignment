"use client";

import { ArrowUp, Bot } from "lucide-react";
import React, { useEffect, useMemo, useState } from "react";
import { Avatar } from "@/components/ui/avatar";
import { motion } from "framer-motion";
import { Textarea } from "@/components/ui/textarea";
import { useParams, useRouter } from "next/navigation";
type UiMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const ChatPage = () => {
  const params = useParams();
  const router = useRouter();
  const conversationId = useMemo(() => params.id as string, [params.id]);

  const [messages, setMessages] = useState<UiMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isFetchingMessages, setIsFetchingMessages] = useState(true);

  useEffect(() => {
    let isCancelled = false;

    const fetchMessages = async () => {
      try {
        const res = await fetch(`/api/chat/${conversationId}`, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
          cache: "no-store",
        });

        //TODO: but if the first msg is in zustand memory, then we can just fetch the messages from zustand memory, also then create a new chat through api with the first msg and then fetch the messages from the api.
        if (res.status === 404) {
          router.replace("/");
          return;
        }

        if (!res.ok) {
          throw new Error("Failed to fetch messages");
        }

        const data = await res.json();
        if (isCancelled) return;
        const mapped: UiMessage[] = (data.messages ?? []).map((m: any) => ({
          id: m._id as string,
          role: m.sender === "ai" ? "assistant" : "user",
          content: m.text as string,
        }));
        setMessages(mapped);
      } catch (_err) {
        router.replace("/");
      } finally {
        if (!isCancelled) setIsFetchingMessages(false);
      }
    };

    if (conversationId) fetchMessages();
    return () => {
      isCancelled = true;
    };
  }, [conversationId, router]); //TODO: why is router needed here?
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
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
            messages.map((msg, index) => {
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
