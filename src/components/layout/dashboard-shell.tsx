"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  Award,
  BookOpen,
  CalendarDays,
  FileText,
  GraduationCap,
  Heart,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Timer,
  Users,
  X,
} from "lucide-react";
import { signOutAction } from "@/app/(auth)/actions";
import { ThemeToggle } from "@/components/theme-toggle";
import { cn, roleLabel } from "@/lib/utils";
import type { Profile } from "@/types/database";

export type NavIconKey =
  | "dashboard"
  | "users"
  | "academic"
  | "lectures"
  | "announcements"
  | "favorites"
  | "activity"
  | "schedule"
  | "timer"
  | "summary";

interface NavItem {
  href: string;
  label: string;
  icon: NavIconKey;
}

const ICONS: Record<NavIconKey, React.ComponentType<{ className?: string }>> = {
  dashboard: LayoutDashboard,
  users: Users,
  academic: BookOpen,
  lectures: FileText,
  announcements: Megaphone,
  favorites: Heart,
  activity: Activity,
  schedule: CalendarDays,
  timer: Timer,
  summary: Award,
};

export function DashboardShell({
  profile,
  navItems,
  children,
}: {
  profile: Profile;
  navItems: NavItem[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-950 text-slate-900 dark:text-slate-100 flex flex-col md:flex-row transition-colors">
      <div className="md:hidden flex items-center justify-between bg-slate-900 text-white px-4 py-3 border-b border-slate-800">
        <div className="flex items-center gap-2 font-bold">
          <GraduationCap className="h-6 w-6 text-indigo-400" />
          <span>قسم الادلة الجنائية </span>
        </div>
        <button onClick={() => setOpen(!open)} className="p-1.5 rounded-lg hover:bg-slate-800">
          {open ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 right-0 z-40 w-64 bg-slate-900 text-slate-100 border-l border-slate-800 flex flex-col transition-transform md:static md:translate-x-0",
          open ? "translate-x-0" : "translate-x-full"
        )}
      >
        <div className="hidden md:flex items-center gap-3 px-6 py-5 border-b border-slate-800">
          <div className="p-2 rounded-xl bg-indigo-600/20 text-indigo-400">
            <GraduationCap className="h-6 w-6" />
          </div>
          <div>
            <h1 className="font-bold text-lg leading-tight">قسم الادلة الجنائية </h1>
            <p className="text-xs text-slate-400">منصة المحاضرات الجامعية</p>
          </div>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = ICONS[item.icon];
            const active = pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3.5 py-2.5 text-sm font-medium transition-colors",
                  active
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "text-slate-300 hover:bg-slate-800 hover:text-white"
                )}
              >
                <Icon className="h-4 w-4 shrink-0" />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-slate-800 p-4 space-y-2.5">
          <div className="px-2">
            <p className="text-sm font-semibold text-white truncate">{profile.full_name}</p>
            <p className="text-xs text-indigo-300">{roleLabel(profile.role)}</p>
          </div>
          <ThemeToggle />
          <form action={signOutAction}>
            <button
              type="submit"
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-slate-800 hover:bg-red-600/90 text-slate-200 hover:text-white px-3 py-2 text-xs font-medium transition-colors"
            >
              <LogOut className="h-4 w-4" />
              <span>تسجيل الخروج</span>
            </button>
          </form>
        </div>
      </aside>

      {open && (
        <div
          onClick={() => setOpen(false)}
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
        />
      )}

      <main className="flex-1 min-w-0 p-4 md:p-8 max-w-6xl mx-auto w-full">{children}</main>
    </div>
  );
}
