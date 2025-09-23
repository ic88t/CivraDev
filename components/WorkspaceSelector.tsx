"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase-client";

interface Workspace {
  id: string;
  name: string;
  description?: string;
  userRole: string;
}

interface WorkspaceSelectorProps {
  selectedWorkspaceId: string | null;
  onWorkspaceChange: (workspaceId: string | null) => void;
  disabled?: boolean;
}

export default function WorkspaceSelector({
  selectedWorkspaceId,
  onWorkspaceChange,
  disabled = false,
}: WorkspaceSelectorProps) {
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchWorkspaces();
  }, []);

  const fetchWorkspaces = async () => {
    try {
      setLoading(true);
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.access_token) {
        setLoading(false);
        return;
      }

      const response = await fetch('/api/workspaces', {
        headers: {
          Authorization: `Bearer ${session.access_token}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch workspaces');
      }

      const data = await response.json();
      setWorkspaces(data.workspaces || []);
    } catch (err: any) {
      console.error('Error fetching workspaces:', err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Workspace
        </label>
        <div className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg">
          <div className="animate-pulse bg-gray-600 h-4 rounded"></div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-300">
          Workspace
        </label>
        <div className="w-full px-3 py-2 bg-red-900/20 border border-red-700 rounded-lg text-red-300 text-sm">
          Failed to load workspaces
        </div>
      </div>
    );
  }

  // Filter workspaces where user can create projects (OWNER, ADMIN, EDITOR)
  const editableWorkspaces = workspaces.filter(ws => 
    ['OWNER', 'ADMIN', 'EDITOR'].includes(ws.userRole)
  );

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-300">
        Workspace
        <span className="text-gray-500 text-xs ml-2">(Optional)</span>
      </label>
      <select
        value={selectedWorkspaceId || ""}
        onChange={(e) => onWorkspaceChange(e.target.value || null)}
        disabled={disabled}
        className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg focus:outline-none focus:ring-2 focus:ring-white focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed text-white"
      >
        <option value="">Personal Project</option>
        {editableWorkspaces.map((workspace) => (
          <option key={workspace.id} value={workspace.id}>
            {workspace.name} ({workspace.userRole})
          </option>
        ))}
      </select>
      
      {editableWorkspaces.length === 0 && (
        <p className="text-xs text-gray-500">
          No workspaces available. Projects will be created as personal projects.
        </p>
      )}
      
      {selectedWorkspaceId && (
        <p className="text-xs text-gray-400">
          Project will be shared with workspace members
        </p>
      )}
    </div>
  );
}
