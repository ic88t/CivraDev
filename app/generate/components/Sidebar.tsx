"use client";

import { MessageSquare, Palette, FileCode, Link2, Variable, Settings, ChevronLeft } from "lucide-react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Sidebar({ activeTab = "chat", onTabChange }: SidebarProps) {
  const router = useRouter();

  const tabs = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "design", icon: Palette, label: "Design" },
    { id: "rules", icon: FileCode, label: "Rules" },
    { id: "connect", icon: Link2, label: "Connect" },
    { id: "vars", icon: Variable, label: "Vars" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-4 gap-6">
      {/* Logo / Back */}
      <button
        onClick={() => router.push("/")}
        className="w-10 h-10 rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white hover:opacity-80 transition-opacity"
      >
        <ChevronLeft className="w-5 h-5" />
      </button>

      {/* Tabs */}
      <div className="flex-1 flex flex-col gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? "bg-gray-900 text-white"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
              title={tab.label}
            >
              <Icon className="w-5 h-5" />
            </button>
          );
        })}
      </div>

      {/* Help */}
      <button
        className="w-10 h-10 rounded-lg flex items-center justify-center text-gray-500 hover:text-gray-900 hover:bg-gray-100 transition-all border border-gray-200"
        title="Help"
      >
        <span className="text-lg font-medium">?</span>
      </button>
    </div>
  );
}
