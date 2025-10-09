"use client";

import { Settings, Github, ExternalLink, ChevronDown } from "lucide-react";
import Image from "next/image";

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
        <div className="flex items-center gap-2">
          <Image
            src="/CivraLogo.png"
            alt="Civra Logo"
            width={24}
            height={24}
            className="rounded-full"
          />
          <ChevronDown className="w-4 h-4 text-gray-400" />
        </div>

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
          <Github className="w-4 h-4" />
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
