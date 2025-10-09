"use client"

import React, { useState, useEffect } from "react";
import { User } from "@supabase/supabase-js";
import Link from "next/link";
import { supabase } from "@/lib/supabase-client";
import CreditDisplay from "./CreditDisplay";

export default function Navbar() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showResourcesMenu, setShowResourcesMenu] = useState(false);

  useEffect(() => {
    // Get initial session
    const getSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user ?? null);
      setLoading(false);
      console.log('Initial session:', session?.user);
    };

    getSession();

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change:', event, session?.user);
        setUser(session?.user ?? null);
        setLoading(false);
      }
    );

    return () => subscription.unsubscribe();
  }, []);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    setShowUserMenu(false);
  };

  return (
    <nav className="absolute top-0 left-0 right-0 z-20 flex items-center justify-between px-6 py-4">
      {/* Logo & main navigation */}
      <div className="flex items-center gap-10">
        <Link
          href="/"
          className="flex items-center gap-2 text-2xl font-semibold text-white hover:opacity-90 transition-opacity"
        >
          <img 
            src="/CivraLogoBig.png" 
            alt="Civra Logo" 
            className="w-24 h-14"
          />
          Civra
        </Link>

        <div className="hidden md:flex items-center gap-8 text-sm text-gray-300">
          <Link href="/pricing" className="hover:text-white transition-colors">
            Pricing
          </Link>
          {user ? (
            <Link href="/workspaces" className="hover:text-white transition-colors">
              Workspaces
            </Link>
          ) : (
            <Link href="/community" className="hover:text-white transition-colors">
              Community
            </Link>
          )}
          <div
            className="relative"
            onMouseEnter={() => setShowResourcesMenu(true)}
            onMouseLeave={() => setShowResourcesMenu(false)}
          >
            <button
              className="flex items-center gap-1 hover:text-white transition-colors"
            >
              Resources
              <svg
                className={`w-4 h-4 transition-transform ${
                  showResourcesMenu ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showResourcesMenu && (
              <div className="absolute left-0 top-full pt-2 w-40 z-50">
                <div className="bg-gray-900 border border-gray-700 rounded-lg shadow-xl">
                  <div className="py-1">
                    <a
                      href="https://docs.civra.dev"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      Docs
                    </a>
                    <Link
                      href="/community"
                      className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    >
                      Community
                    </Link>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Auth buttons */}
      <div className="flex items-center gap-4 text-sm">
        {user && <CreditDisplay />}
        {loading ? (
          <div className="w-8 h-8 rounded-full bg-gray-800 animate-pulse"></div>
        ) : user ? (
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-2 p-2 rounded-lg hover:bg-gray-800/50 transition-colors"
            >
              {user.user_metadata?.avatar_url ? (
                <img
                  src={user.user_metadata.avatar_url}
                  alt={user.user_metadata?.full_name || "User"}
                  className="w-8 h-8 rounded-full"
                />
              ) : (
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center">
                  <span className="text-white text-sm font-medium">
                    {user.user_metadata?.full_name?.[0] || user.email?.[0] || "U"}
                  </span>
                </div>
              )}
              <span className="text-white font-medium hidden sm:block">
                {user.user_metadata?.full_name || user.email?.split("@")[0]}
              </span>
              <svg
                className={`w-4 h-4 text-gray-400 transition-transform ${
                  showUserMenu ? "rotate-180" : ""
                }`}
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </button>

            {showUserMenu && (
              <div className="absolute right-0 mt-2 w-48 bg-gray-900 border border-gray-700 rounded-lg shadow-xl z-50">
                <div className="px-4 py-3 border-b border-gray-700">
                  <p className="text-white font-medium">{user?.user_metadata?.full_name || user?.email?.split("@")[0]}</p>
                  <p className="text-gray-400 text-sm">{user?.email}</p>
                </div>
                <div className="py-1">
                  <Link
                    href="/dashboard"
                    className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Dashboard
                  </Link>
                  <button
                    onClick={() => {
                      fetch('/api/debug-user')
                        .then(res => res.json())
                        .then(data => {
                          console.log('User Debug Info:', data);
                          alert(`Debug info logged to console.\n\nCurrent User: ${data.currentUser?.email}\nProjects: ${data.projects?.userProjectsCount}\nProvider: ${data.currentUser?.provider}`);
                        })
                        .catch(err => {
                          console.error('Debug failed:', err);
                          alert('Debug failed - check console');
                        });
                      setShowUserMenu(false);
                    }}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    Debug User Info
                  </button>
                  <Link
                    href="/settings"
                    className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Settings
                  </Link>
                  <Link
                    href="/usage"
                    className="block px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                    onClick={() => setShowUserMenu(false)}
                  >
                    Usage & Billing
                  </Link>
                  <hr className="border-gray-700 my-1" />
                  <button
                    onClick={handleSignOut}
                    className="block w-full text-left px-4 py-2 text-gray-300 hover:bg-gray-800 hover:text-white transition-colors"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : (
          <>
            <Link
              href="/auth/signin"
              className="text-gray-300 hover:text-white transition-colors"
            >
              Log in
            </Link>
            <Link
              href="/auth/signin"
              className="px-4 py-2 bg-white text-black rounded-lg font-semibold hover:bg-gray-100 transition-colors"
            >
              Get started
            </Link>
          </>
        )}
      </div>
    </nav>
  );
}
