"use client";

import { ArrowUp, Bot } from "lucide-react";
import React, {
  useEffect,
  useMemo,
  useState,
  useRef,
  useCallback,
} from "react";
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
  const [streamingMessage, setStreamingMessage] = useState<string>("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [hasTriggeredInitialResponse, setHasTriggeredInitialResponse] =
    useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
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
      if (
        hasTriggeredInitialResponse ||
        isFetchingMessages ||
        isLoading ||
        isStreaming
      ) {
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
          setIsStreaming(true);
          setStreamingMessage("");

          // Send message and start streaming response
          const response = await fetch(`/api/chat/${conversationId}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              sender: "user",
              text: firstUserMessage.content,
              saveUserMessage: false,
            }),
          });

          if (!response.ok) {
            throw new Error("Failed to send message");
          }

          // Handle streaming response
          const reader = response.body?.getReader();
          if (!reader) {
            throw new Error("No response body");
          }

          const decoder = new TextDecoder();
          let accumulatedMessage = "";

          try {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;

              const chunk = decoder.decode(value, { stream: true });
              const lines = chunk.split("\n");

              for (const line of lines) {
                if (line.startsWith("data: ")) {
                  try {
                    const data = JSON.parse(line.slice(6));

                    if (data.type === "chunk") {
                      accumulatedMessage += data.content;
                      setStreamingMessage(accumulatedMessage);
                    } else if (data.type === "complete") {
                      // Add the complete AI message to the store
                      const aiMessage: UiMessage = {
                        id: crypto.randomUUID(),
                        role: "assistant",
                        content: data.content,
                      };

                      const currentMessages =
                        getMessagesByChatId(conversationId) ?? [];
                      setMessages(conversationId, [
                        ...currentMessages,
                        aiMessage,
                      ]);
                      setStreamingMessage("");
                      break;
                    } else if (data.type === "error") {
                      console.error("Streaming error:", data.error);
                      break;
                    }
                  } catch (parseError) {
                    console.error("Failed to parse SSE data:", parseError);
                  }
                }
              }
            }
          } finally {
            reader.releaseLock();
          }
        } catch (error) {
          console.error("Error in triggerInitialResponse:", error);
          setHasTriggeredInitialResponse(false); // Reset so user can try again
        } finally {
          setIsStreaming(false);
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
    isLoading,
    isStreaming,
    getMessagesByChatId,
    setMessages,
  ]);

  // Auto-scroll to bottom when new messages arrive or when streaming
  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [chatIdToMessages[conversationId], streamingMessage, scrollToBottom]);
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isStreaming) return;

    setIsLoading(true);
    const content = input.trim();
    if (!content) {
      setIsLoading(false);
      return;
    }

    const newMsg: UiMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content,
    };

    const existingMessages = getMessagesByChatId(conversationId) ?? [];

    addMessage(conversationId, newMsg);
    setMessages(conversationId, [...existingMessages, newMsg]);
    setInput("");

    try {
      setIsStreaming(true);
      setStreamingMessage("");

      // Send message and start streaming response
      const response = await fetch(`/api/chat/${conversationId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sender: "user", text: content }),
      });

      if (!response.ok) {
        throw new Error("Failed to send message");
      }

      // Handle streaming response
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error("No response body");
      }

      const decoder = new TextDecoder();
      let accumulatedMessage = "";

      try {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          const lines = chunk.split("\n");

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              try {
                const data = JSON.parse(line.slice(6));

                if (data.type === "chunk") {
                  accumulatedMessage += data.content;
                  setStreamingMessage(accumulatedMessage);
                } else if (data.type === "complete") {
                  // Add the complete AI message to the store
                  const aiMessage: UiMessage = {
                    id: crypto.randomUUID(),
                    role: "assistant",
                    content: data.content,
                  };

                  const currentMessages =
                    getMessagesByChatId(conversationId) ?? [];
                  setMessages(conversationId, [...currentMessages, aiMessage]);
                  setStreamingMessage("");
                  break;
                } else if (data.type === "error") {
                  console.error("Streaming error:", data.error);
                  break;
                }
              } catch (parseError) {
                console.error("Failed to parse SSE data:", parseError);
              }
            }
          }
        }
      } finally {
        reader.releaseLock();
      }
    } catch (error) {
      console.error("Error in handleSubmit:", error);
    } finally {
      setIsLoading(false);
      setIsStreaming(false);
    }
  };
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value);
  };
  return (
    <div className="h-screen flex flex-col">
      {/* Messages Area */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-4 pt-16 lg:pt-4 pb-32 scroll-smooth scrollbar-pretty"
      >
        <div className="w-full max-w-4xl mx-auto space-y-4">
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
          {isLoading && !isStreaming && (
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

          {/* Input Area */}
          <motion.div
            className="fixed bottom-0 left-0 lg:left-80 right-0 mx-auto max-w-4xl px-4 sm:px-0  w-full pb-6"
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
                  disabled={isLoading || isStreaming}
                  autoFocus
                />
              </div>
              <motion.button
                type="submit"
                className="absolute right-2 top-1/2 transform -translate-y-1/2 p-2 text-white transition-all duration-300 rounded-lg bg-white/10 hover:bg-white/20 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white/10"
                disabled={isLoading || isStreaming || !input.trim()}
              >
                <ArrowUp
                  size={16}
                  className="sm:w-[18px] sm:h-[18px] transition-transform duration-300 group-hover:translate-y-[-2px]"
                />
              </motion.button>
              {(isLoading || isStreaming) && (
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
      </div>
    </div>
  );
};

export default ChatPage;
