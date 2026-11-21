"use client";

import React, { useEffect, useState } from "react";
import { Clock } from "lucide-react";

export function ExamCountdown({ targetIso, title }: { targetIso: string; title: string }) {
  const [now, setNow] = useState<number>(() => Date.now());

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(t);
  }, []);

  const target = new Date(targetIso).getTime();
  const diff = Math.max(0, target - now);

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
  const minutes = Math.floor((diff / (1000 * 60)) % 60);
  const seconds = Math.floor((diff / 1000) % 60);

  return (
    <div className="rounded-2xl bg-gradient-to-l from-indigo-600 to-slate-900 text-white p-6 shadow-lg">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold bg-white/15 px-3 py-1 rounded-full mb-2">
            <Clock className="h-3.5 w-3.5" />
            <span>العدّاد التنازلي لأقرب امتحان</span>
          </div>
          <h2 className="text-xl font-bold">{title}</h2>
          <p className="text-xs text-indigo-200 mt-1">
            الموعد: {new Date(targetIso).toLocaleString("ar-IQ", { dateStyle: "full", timeStyle: "short" })}
          </p>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center" dir="ltr">
          {[
            { label: "يوم", value: days },
            { label: "ساعة", value: hours },
            { label: "دقيقة", value: minutes },
            { label: "ثانية", value: seconds },
          ].map((b) => (
            <div key={b.label} className="bg-white/10 backdrop-blur rounded-xl px-3 py-2 min-w-[64px]">
              <p className="text-2xl font-extrabold font-mono">{String(b.value).padStart(2, "0")}</p>
              <p className="text-[11px] text-indigo-200">{b.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
