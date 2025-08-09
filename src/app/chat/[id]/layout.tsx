"use client";

import React, { useState } from "react";
import ChatSidebar from "@/components/chat/ChatSidebar";
import BackgroundGradient from "@/components/general/BackgroundGradient";
import { Menu, X } from "lucide-react";

interface ChatLayoutProps {
  children: React.ReactNode;
}

export default function ChatLayout({ children }: ChatLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="min-h-screen flex relative">
      <BackgroundGradient />

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={`z-50 lg:z-10 transform transition-transform duration-300 ease-in-out lg:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        } fixed lg:relative h-full lg:h-auto w-80 top-0 left-0`}
      >
        <ChatSidebar onClose={() => setSidebarOpen(false)} />
      </aside>

      {/* Main Content */}
      <main className="flex-1 relative z-10 w-full lg:w-auto lg:ml-0">
        {/* Mobile menu button */}
        <button
          onClick={() => setSidebarOpen(true)}
          className="lg:hidden fixed top-4 left-4 z-30 p-2 bg-white/10 backdrop-blur-xl border border-white/20 text-white rounded-lg hover:bg-white/20 transition-all duration-300"
        >
          <Menu size={20} />
        </button>

        <div className="w-full h-full">{children}</div>
      </main>
    </div>
  );
}
