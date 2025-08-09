import React from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import BackgroundGradient from "@/components/general/BackgroundGradient";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  return (
    <div className="min-h-screen flex relative">
      <BackgroundGradient />

      {/* Sidebar */}
      <aside className="relative z-10">
        <ChatSidebar />
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10">{children}</main>
    </div>
  );
}
