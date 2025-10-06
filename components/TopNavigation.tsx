"use client";

import { Menu } from "lucide-react";

interface TopNavigationProps {
  sidebarOpen: boolean;
  setSidebarOpen: (open: boolean) => void;
}

export default function TopNavigation({
  sidebarOpen,
  setSidebarOpen,
}: TopNavigationProps) {
  return (
    <div className="h-16 border-b border-gray-800 flex items-center px-4 bg-gray-950">
      <button
        onClick={() => setSidebarOpen(!sidebarOpen)}
        className="p-2 hover:bg-gray-800 rounded-lg transition-colors mr-4"
      >
        <Menu className="w-5 h-5 text-gray-400" />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
          <span className="text-white font-bold text-sm">C</span>
        </div>
        <h1 className="text-white font-semibold">Civra</h1>
      </div>
    </div>
  );
}
