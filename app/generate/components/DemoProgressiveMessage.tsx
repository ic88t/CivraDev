"use client";

import { useEffect, useState } from "react";
import { ProgressiveMessage, ProgressiveMessageData } from "./ProgressiveMessage";
import { Task } from "./TaskList";

/**
 * Demo component that shows the progressive UI in action
 * Use this to test the UI without needing backend integration
 */
export function DemoProgressiveMessage() {
  const [data, setData] = useState<ProgressiveMessageData>({
    phase: "thinking",
    thinkingStart: Date.now(),
    thinkingActive: true,
    tasks: [],
    files: [],
  });

  useEffect(() => {
    const runDemo = async () => {
      // Phase 1: Thinking (3 seconds)
      await new Promise((resolve) => setTimeout(resolve, 3000));

      // Phase 2: Planning statement
      setData({
        phase: "planning",
        thinkingStart: Date.now() - 3000,
        thinkingActive: false,
        planningStatement:
          "I'll help you build a web3 DeFi dashboard! Let me generate a design brief and explore the codebase...",
        tasks: [],
        files: [],
      });

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Phase 3: Tasks
      const tasks: Task[] = [
        { id: "1", name: "Generated design brief", status: "completed" },
        { id: "2", name: "Explored codebase", status: "completed" },
        { id: "3", name: "Thought for 6s", status: "completed" },
        { id: "4", name: "Analyzed requirements", status: "completed" },
        { id: "5", name: "Setting up project structure", status: "active" },
      ];

      // Add tasks one by one
      for (let i = 0; i < tasks.length; i++) {
        await new Promise((resolve) => setTimeout(resolve, 800));

        const currentTasks = tasks.slice(0, i + 1);
        setData((prev) => ({
          ...prev,
          phase: "tasks",
          tasks: currentTasks,
        }));
      }

      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Phase 4: Building
      setData((prev) => ({
        ...prev,
        phase: "building",
        projectName: "DeFi Dashboard",
        tasks: tasks.map((t) => ({ ...t, status: "completed" as const })),
      }));

      await new Promise((resolve) => setTimeout(resolve, 500));

      // Phase 5: Files
      const files = [
        "globals.css",
        "page.tsx",
        "components/dashboard-header.tsx",
        "components/portfolio-overview.tsx",
        "components/transaction-history.tsx",
        "components/price-chart.tsx",
        "lib/web3-utils.ts",
        "hooks/useWallet.ts",
      ];

      setData((prev) => ({
        ...prev,
        phase: "files",
        files: files,
      }));

      await new Promise((resolve) => setTimeout(resolve, files.length * 300 + 500));

      // Phase 6: Complete
      setData((prev) => ({
        ...prev,
        phase: "complete",
        summary:
          "Your web3 DeFi dashboard is ready! I've created a modern, dark-themed interface featuring:\n\n• Real-time portfolio tracking\n• Live price charts with TradingView integration\n• Transaction history with filtering\n• Multi-wallet support (MetaMask, WalletConnect)\n• Responsive design for mobile and desktop",
        issues: 0,
      }));
    };

    runDemo();
  }, []);

  return (
    <div className="p-6 bg-[#0a0a0a] text-white">
      <div className="max-w-2xl mx-auto">
        <h2 className="text-xl font-bold mb-4">Progressive UI Demo</h2>
        <p className="text-gray-400 text-sm mb-6">
          This demonstrates the v0-style progressive chat flow. Watch how each phase appears
          sequentially with smooth animations.
        </p>
        <div className="bg-gray-900 rounded-lg p-4 border border-gray-800">
          <ProgressiveMessage data={data} />
        </div>
      </div>
    </div>
  );
}
