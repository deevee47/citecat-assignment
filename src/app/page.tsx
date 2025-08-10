"use client";

import ChatFallback from "@/components/main-chat/ChatFallback";
import HomeInput from "@/components/main-chat/HomeInput";

export default function ChatPage() {
  return (
    <div className="min-h-screen flex flex-col justify-between p-4 pb-6 px-4 sm:px-6 lg:px-8">
      <ChatFallback />
      <HomeInput />
    </div>
  );
}
