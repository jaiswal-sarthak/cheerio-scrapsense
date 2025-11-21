"use client";

import { ReactNode, useEffect, useState } from "react";
import { Sidebar } from "@/components/dashboard/sidebar";
import { TopNav } from "@/components/dashboard/top-nav";
import { MobileSidebar } from "@/components/dashboard/mobile-sidebar";

interface DashboardChromeProps {
  user: {
    name?: string | null;
    email?: string | null;
  };
  children: ReactNode;
}

export const DashboardChrome = ({ user, children }: DashboardChromeProps) => {
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleToggleSidebar = () => {
    console.log('[DashboardChrome] Toggling sidebar, current state:', mobileOpen);
    setMobileOpen(true);
  };

  const handleCloseSidebar = () => {
    console.log('[DashboardChrome] Closing sidebar');
    setMobileOpen(false);
  };

  useEffect(() => {
    console.log('[DashboardChrome] Mobile sidebar state changed:', mobileOpen);
  }, [mobileOpen]);

  useEffect(() => {
    if (!mobileOpen) return;
    const handleKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [mobileOpen]);

  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth >= 768) {
        setMobileOpen(false);
      }
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  return (
    <div className="relative flex min-h-screen w-full">
      <Sidebar />
      <div className="flex flex-1 flex-col min-w-0 md:ml-64">
        <TopNav user={user} onToggleSidebar={handleToggleSidebar} />
        <main className="flex-1 overflow-y-auto bg-gradient-to-b from-transparent to-slate-50/30 dark:to-slate-950/30">
          <div className="mx-auto w-full max-w-6xl space-y-6 px-3 py-4 pb-16 sm:px-4 sm:py-6 md:space-y-8 md:px-8 md:py-10">
            {children}
          </div>
        </main>
      </div>
      <MobileSidebar open={mobileOpen} onClose={handleCloseSidebar} />
    </div>
  );
};
