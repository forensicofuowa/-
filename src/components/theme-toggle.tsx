"use client";

import React, { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const isDark = document.documentElement.classList.contains("dark");
    setDark(isDark);
  }, []);

  function toggleTheme() {
    const next = !dark;
    setDark(next);
    if (next) {
      document.documentElement.classList.add("dark");
      localStorage.setItem("flp_theme", "dark");
    } else {
      document.documentElement.classList.remove("dark");
      localStorage.setItem("flp_theme", "light");
    }
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="w-full flex items-center justify-center gap-2 rounded-lg border border-slate-700 bg-slate-800/80 hover:bg-slate-700 text-slate-200 px-3 py-2 text-xs font-medium transition-colors"
      title={dark ? "التبديل إلى الوضع النهاري" : "التبديل إلى الوضع الليلي"}
    >
      {dark ? (
        <>
          <Sun className="h-4 w-4 text-amber-400" />
          <span>الوضع النهاري</span>
        </>
      ) : (
        <>
          <Moon className="h-4 w-4 text-indigo-300" />
          <span>الوضع الليلي</span>
        </>
      )}
    </button>
  );
}
