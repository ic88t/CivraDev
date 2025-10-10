"use client";

import { Settings, ExternalLink, ChevronDown } from "lucide-react";
import Link from "next/link";

// Simple GitHub SVG icon component
const GitHubIcon = ({ className }: { className?: string }) => (
  <svg
    className={className}
    viewBox="0 0 24 24"
    fill="currentColor"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
  </svg>
);

interface TopNavbarProps {
  projectName: string;
  onShare?: () => void;
  onPublish?: () => void;
  previewUrl?: string | null;
}

export function TopNavbar({ projectName, onShare, onPublish, previewUrl }: TopNavbarProps) {
  return (
    <div className="h-12 bg-white border-b border-gray-200 px-4 flex items-center justify-between">
      {/* Left Side - Logo + Project Info */}
      <div className="flex items-center gap-4">
        {/* Civra Logo */}
        <Link href="/" className="flex items-center gap-2 z-20">
          <img
            src="/CivraBlack.png"
            alt="Civra Logo"
            className="w-10 h-6"
          />
          {/* <ChevronDown className="w-4 h-4 text-gray-400" /> */}
        </Link>

        {/* Project Name */}
        <div className="flex items-center gap-2">
          <span className="text-sm font-medium text-gray-900">{projectName}</span>
          <div className="w-1 h-1 rounded-full bg-gray-300"></div>
        </div>

        {/* View Project Link */}
        {previewUrl && (
          <a
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 text-xs text-gray-600 hover:text-gray-900 transition-colors"
          >
            <span>View Project</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        )}
      </div>

      {/* Right Side - Actions */}
      <div className="flex items-center gap-3">
        {/* Settings */}
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
          <Settings className="w-4 h-4" />
        </button>

        {/* GitHub */}
        <button className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-600 hover:text-gray-900 hover:bg-gray-100 transition-all">
          <GitHubIcon className="w-4 h-4" />
        </button>

        {/* Share */}
        <button
          onClick={onShare}
          className="px-4 h-8 rounded-lg text-sm font-medium bg-white text-gray-900 border border-gray-300 hover:bg-gray-50 transition-all"
        >
          Share
        </button>

        {/* Publish */}
        <button
          onClick={onPublish}
          className="px-4 h-8 rounded-lg text-sm font-medium bg-black text-white hover:bg-gray-900 transition-all flex items-center gap-2"
        >
          <span>Publish</span>
        </button>

        {/* User Avatar */}
        <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
          <span className="text-white text-xs font-medium">U</span>
        </div>
      </div>
    </div>
  );
}
