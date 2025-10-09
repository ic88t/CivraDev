"use client";

import { MessageSquare, Sparkles, FileCode, DollarSign, Upload, Settings } from "lucide-react";
import { useRouter } from "next/navigation";

interface SidebarProps {
  activeTab?: string;
  onTabChange?: (tab: string) => void;
}

export function Sidebar({ activeTab = "chat", onTabChange }: SidebarProps) {
  const router = useRouter();

  const tabs = [
    { id: "chat", icon: MessageSquare, label: "Chat" },
    { id: "web3ify", icon: Sparkles, label: "Web3ify" },
    { id: "contract", icon: FileCode, label: "Contract" },
    { id: "monetize", icon: DollarSign, label: "Monetize" },
    { id: "export", icon: Upload, label: "Export" },
    { id: "settings", icon: Settings, label: "Settings" },
  ];

  return (
    <div className="w-16 bg-white border-r border-gray-200 flex flex-col items-center py-6 gap-2">
      {/* Tabs */}
      <div className="flex-1 flex flex-col gap-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;

          return (
            <button
              key={tab.id}
              onClick={() => onTabChange?.(tab.id)}
              className={`flex flex-col items-center gap-1 transition-all group ${
                isActive
                  ? "text-gray-900"
                  : "text-gray-400 hover:text-gray-900"
              }`}
              title={tab.label}
            >
              <div className={`w-10 h-10 rounded-lg flex items-center justify-center transition-all ${
                isActive
                  ? "bg-gray-100"
                  : "group-hover:bg-gray-50"
              }`}>
                <Icon className="w-5 h-5" />
              </div>
              <span className="text-[10px] font-medium">{tab.label}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
