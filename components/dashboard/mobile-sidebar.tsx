"use client";

import Link from "next/link";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import { Bot, LogOut, X } from "lucide-react";
import { sidebarNavItems } from "@/components/dashboard/sidebar";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface MobileSidebarProps {
  open: boolean;
  onClose: () => void;
}

export const MobileSidebar = ({ open, onClose }: MobileSidebarProps) => {
  const pathname = usePathname();
  const prevPathnameRef = useRef(pathname);

  useEffect(() => {
    console.log('[MobileSidebar] Open state changed:', open);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [open]);

  // Close sidebar when route changes (but not on initial mount)
  useEffect(() => {
    if (open && prevPathnameRef.current !== pathname) {
      console.log('[MobileSidebar] Route changed, closing sidebar');
      onClose();
    }
    prevPathnameRef.current = pathname;
  }, [pathname, open, onClose]);

  return (
    <div
      className={cn(
        "fixed inset-0 z-[60] w-full md:hidden",
        open ? "pointer-events-auto" : "pointer-events-none",
      )}
    >
      <div
        className={cn(
          "absolute inset-0 bg-slate-900/80 backdrop-blur-md transition-opacity duration-300",
          open ? "opacity-100" : "opacity-0",
        )}
        onClick={onClose}
      />
      <div
        className={cn(
          "ml-auto flex h-full w-[20rem] max-w-[85vw] flex-col border-l-4 border-l-red-500 border-slate-200 bg-white p-4 text-slate-900 shadow-2xl transition-transform duration-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100",
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={{ border: open ? '4px solid red' : undefined }}
      >
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-2">
            <div className="flex h-8 w-8 items-center justify-center">
              <Bot className="h-5 w-5 text-sky-500 dark:text-sky-400" />
            </div>
            <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              AI Monitor
            </span>
          </div>
          <button
            onClick={onClose}
            className="flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            aria-label="Close navigation"
          >
            <X className="h-4 w-4" />
          </button>
        </div>
        <nav className="flex flex-1 flex-col gap-2 overflow-y-auto">
          {sidebarNavItems.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={cn(
                  "flex items-center gap-3 rounded-xl border px-3 py-3 text-sm font-medium transition",
                  active
                    ? "border-sky-200 bg-sky-50 text-sky-700 shadow-md dark:border-sky-800 dark:bg-sky-950 dark:text-sky-200"
                    : "border-slate-200 bg-white text-slate-700 hover:border-sky-200 hover:bg-sky-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:border-sky-800 dark:hover:bg-sky-950",
                )}
              >
                <span className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-200",
                  active && "bg-sky-100 text-sky-600 dark:bg-sky-900 dark:text-sky-300"
                )}>
                  <Icon className="h-4 w-4" />
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="truncate font-semibold">{item.label}</p>
                    {item.badge === "action" && (
                      <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-sky-500/20 text-sky-600 dark:bg-sky-500/30 dark:text-sky-300">
                        NEW
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">{item.helper}</p>
                </div>
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 space-y-2 border-t border-slate-200 pt-4 dark:border-slate-700">
          <Button
            variant="outline"
            size="sm"
            className="w-full rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-200 dark:hover:bg-slate-700"
            onClick={() => signOut({ callbackUrl: "/" })}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Sign out
          </Button>
        </div>
      </div>
    </div>
  );
};

