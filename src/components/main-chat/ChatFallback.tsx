"use client";
import { ArrowUp } from "lucide-react";
import { motion } from "framer-motion";
import { BookOpenIcon, Mail } from "lucide-react";
import { useRouter } from "next/navigation";
import { useChatStore } from "@/lib/store/chatStore";

import React, { useEffect, useState } from "react";

const ChatFallback = () => {
  const appConnections = [
    {
      icon: <BookOpenIcon size={14} />,
      name: "Notion",
      description: "to read documents",
      action: "Coming Soon",
    },
    {
      icon: <Mail size={14} />,
      name: "Gmail",
      description: "to read, draft, and summarize emails",
      action: "Coming Soon",
    },
  ];

  const askMeSuggestions = [
    "Summarize this PDF for me: https://ai.com/report.pdf",
    "Draft a polite reply to reschedule my meeting for tomorrow",
    "Generate 5 blog post ideas about AI in education",
  ];

  const greetings = [
    "Hey Anon! Let's dive in!",
    "Anon, what's the question?",
    "Ready Anon? Ask me anything!",
    "Go ahead Anon, I'm listening!",
    "Hey Anon, fire away!",
    "What's cooking, Anon?",
    "Anon, let's explore together!",
    "Hit me with your query Anon!",
    "Anon, what's the mystery?",
    "Shoot Anon, what's up?",
    "Anon, let's make some magic happen!",
    "Time to shine, Anon! What's on your mind?",
    "Anon, ready to crack some codes?",
    "Let's get this party started, Anon!",
    "Anon, what's the next big idea?",
    "Time to level up, Anon! What's the plan?",
    "Anon, let's turn your ideas into reality!",
    "Ready to rock, Anon?",
    "Anon, what's the challenge today?",
    "Let's make it happen, Anon!",
  ];
  const [greeting, setGreeting] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const { setInitialMessage } = useChatStore();
  useEffect(() => {
    const randomGreeting =
      greetings[Math.floor(Math.random() * greetings.length)];
    setGreeting(randomGreeting);
  }, []);

  const submitChat = async (text: string) => {
    if (isLoading) return;
    setIsLoading(true);
    const conversationId = crypto.randomUUID();
    // Store first message in Zustand for instant render on chat page
    setInitialMessage(conversationId, text);
    router.push(`/chat/${conversationId}`);
  };

  return (
    <motion.div
      className="flex-1 flex items-center justify-center px-4 sm:px-6 lg:px-8"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.8, ease: "easeOut" }}
    >
      <div className="w-full max-w-4xl mx-auto">
        {/* Welcome Greeting */}
        <motion.div
          className="mb-6 sm:mb-8 text-center sm:text-left"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.3, ease: "easeOut" }}
        >
          <h1 className="text-2xl sm:text-3xl lg:text-3xl font-bold text-white mb-2">
            {greeting}
          </h1>
        </motion.div>

        {/* Task Suggestions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Column 1: Seamlessly perform tasks */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.5, ease: "easeOut" }}
          >
            <h3 className="text-white text-sm sm:text-base font-medium mb-4">
              Seamlessly perform tasks across your favourite apps
            </h3>

            {appConnections.map((app, index) => (
              <motion.div
                key={index}
                className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-black/30 transition-all duration-200 cursor-pointer group"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.6 + index * 0.1,
                  ease: "easeOut",
                }}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/10 rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="text-white">{app.icon}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-white text-sm sm:text-base font-medium">
                        {app.name}{" "}
                        <span className="text-gray-400 text-xs sm:text-sm block sm:inline">
                          {app.description}
                        </span>
                      </div>
                    </div>
                  </div>
                  {app.action && (
                    <div className="bg-white/10 text-white text-xs sm:text-sm px-2 py-1 rounded-full border border-white/10 flex-shrink-0">
                      {app.action}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </motion.div>

          {/* Column 2: Things you can ask me */}
          <motion.div
            className="space-y-3"
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.8, delay: 0.7, ease: "easeOut" }}
          >
            <h3 className="text-white text-sm sm:text-base font-medium mb-4">
              Things you can ask me
            </h3>

            {askMeSuggestions.map((task, index) => (
              <motion.div
                key={index}
                className="bg-black/20 backdrop-blur-xl border border-white/10 rounded-xl p-3 sm:p-4 hover:bg-black/30 transition-all duration-200 cursor-pointer group"
                onClick={() => submitChat(task)}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: 0.5,
                  delay: 0.8 + index * 0.1,
                  ease: "easeOut",
                }}
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="text-white text-sm sm:text-base flex-1 min-w-0">
                    {task}
                  </div>
                  <div className="w-5 h-5 sm:w-6 sm:h-6 bg-white/10 rounded-full flex items-center justify-center opacity-100 sm:opacity-0 group-hover:opacity-100 transition-all duration-200 flex-shrink-0">
                    <ArrowUp size={12} className="sm:w-3 sm:h-3 text-white" />
                  </div>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </div>
    </motion.div>
  );
};

export default ChatFallback;
