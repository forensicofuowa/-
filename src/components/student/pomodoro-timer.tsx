"use client";

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, Pause, Play, RotateCcw, Timer } from "lucide-react";
import { recordStudySessionAction } from "@/app/student/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

interface SubjectOption {
  id: string;
  name: string;
}

interface SessionItem {
  id: string;
  subject_id: string | null;
  duration_minutes: number;
  session_date: string;
}

export function PomodoroTimer({
  subjects,
  recentSessions,
}: {
  subjects: SubjectOption[];
  recentSessions: SessionItem[];
}) {
  const router = useRouter();
  const [presetMinutes, setPresetMinutes] = useState(25);
  const [secondsLeft, setSecondsLeft] = useState(25 * 60);
  const [running, setRunning] = useState(false);
  const [selectedSubjectId, setSelectedSubjectId] = useState(subjects[0]?.id ?? "");
  const [saving, setSaving] = useState(false);
  const [savedBanner, setSavedBanner] = useState<string | null>(null);

  useEffect(() => {
    if (!running) return;
    const interval = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          setRunning(false);
          handleCompleteSession(presetMinutes);
          return presetMinutes * 60;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [running, presetMinutes]);

  function changePreset(mins: number) {
    setRunning(false);
    setPresetMinutes(mins);
    setSecondsLeft(mins * 60);
  }

  async function handleCompleteSession(mins: number) {
    setSaving(true);
    setSavedBanner(null);
    await recordStudySessionAction({
      subjectId: selectedSubjectId || null,
      durationMinutes: mins,
    });
    setSaving(false);
    setSavedBanner(`تم تسجيل جلسة دراسة لمدة ${mins} دقيقة في سجلك الأسبوعي.`);
    router.refresh();
  }

  const mm = String(Math.floor(secondsLeft / 60)).padStart(2, "0");
  const ss = String(secondsLeft % 60).padStart(2, "0");

  // Weekly breakdown per subject
  const subjectMap = new Map(subjects.map((s) => [s.id, s.name]));
  const minutesBySubject = new Map<string, number>();
  let totalWeeklyMinutes = 0;

  for (const s of recentSessions) {
    const key = s.subject_id || "general";
    minutesBySubject.set(key, (minutesBySubject.get(key) ?? 0) + (s.duration_minutes || 0));
    totalWeeklyMinutes += s.duration_minutes || 0;
  }

  const summaryRows = subjects.map((sub) => ({
    id: sub.id,
    name: sub.name,
    minutes: minutesBySubject.get(sub.id) ?? 0,
  }));
  summaryRows.sort((a, b) => a.minutes - b.minutes); // Least studied first (needs more focus)

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <Card>
        <CardHeader className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Timer className="h-5 w-5 text-indigo-600" />
            <h2 className="font-bold text-slate-800 dark:text-slate-100">مؤقت التركيز (Pomodoro)</h2>
          </div>
          <div className="flex gap-1">
            {[15, 25, 45, 60].map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => changePreset(m)}
                className={`px-2.5 py-1 rounded-md text-xs font-semibold transition-colors ${
                  presetMinutes === m
                    ? "bg-indigo-600 text-white"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300"
                }`}
              >
                {m} د
              </button>
            ))}
          </div>
        </CardHeader>

        <CardContent className="space-y-5 text-center">
          <div>
            <label className="block text-xs font-medium text-slate-500 dark:text-slate-400 mb-1.5 text-right">
              المادة التي تدرسها حالياً
            </label>
            <select
              value={selectedSubjectId}
              onChange={(e) => setSelectedSubjectId(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              {subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
              <option value="">مذاكرة عامة</option>
            </select>
          </div>

          <div className="py-6 rounded-2xl bg-slate-900 text-white shadow-inner">
            <p className="text-5xl md:text-6xl font-extrabold tracking-wider font-mono" dir="ltr">
              {mm}:{ss}
            </p>
            <p className="text-xs text-indigo-300 mt-2">
              {running ? "جلسة تركيز نشطة الآن..." : "جاهز لبدء جلسة المذاكرة"}
            </p>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2.5">
            <Button type="button" onClick={() => setRunning(!running)}>
              {running ? (
                <>
                  <Pause className="h-4 w-4" />
                  <span>إيقاف مؤقت</span>
                </>
              ) : (
                <>
                  <Play className="h-4 w-4" />
                  <span>بدء الجلسة</span>
                </>
              )}
            </Button>

            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setRunning(false);
                setSecondsLeft(presetMinutes * 60);
              }}
            >
              <RotateCcw className="h-4 w-4" />
              <span>إعادة ضبط</span>
            </Button>

            <Button
              type="button"
              variant="secondary"
              disabled={saving}
              onClick={() => handleCompleteSession(presetMinutes)}
            >
              <CheckCircle2 className="h-4 w-4" />
              <span>{saving ? "جارٍ الحفظ..." : `تسجيل الجلسة (${presetMinutes} د)`}</span>
            </Button>
          </div>

          {savedBanner && (
            <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-2.5 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              {savedBanner}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">الملخص الأسبوعي للمذاكرة</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              المواد الأقل دراسة تظهر أولاً لتعرف أي مادة تحتاج تركيز أكثر
            </p>
          </div>
          <Badge tone="indigo">{totalWeeklyMinutes} دقيقة هذا الأسبوع</Badge>
        </CardHeader>

        <CardContent className="space-y-4">
          {summaryRows.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-6">لا توجد مواد مسجلة بعد.</p>
          ) : (
            <div className="space-y-3">
              {summaryRows.map((row) => {
                const pct =
                  totalWeeklyMinutes > 0
                    ? Math.min(100, Math.round((row.minutes / totalWeeklyMinutes) * 100))
                    : 0;
                const needsFocus = row.minutes < 30;
                return (
                  <div key={row.id} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-800 dark:text-slate-200">{row.name}</span>
                      <div className="flex items-center gap-2">
                        {needsFocus && <Badge tone="amber">تحتاج تركيز أكثر</Badge>}
                        <span className="text-slate-600 dark:text-slate-400 font-medium">
                          {row.minutes} دقيقة
                        </span>
                      </div>
                    </div>
                    <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                      <div
                        className={`h-full rounded-full ${needsFocus ? "bg-amber-500" : "bg-indigo-600"}`}
                        style={{ width: `${Math.max(4, pct)}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {recentSessions.length > 0 && (
            <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
              <p className="text-xs font-semibold text-slate-500 dark:text-slate-400 mb-2">آخر الجلسات المسجلة</p>
              <ul className="space-y-1.5 text-xs">
                {recentSessions.slice(0, 5).map((s) => (
                  <li
                    key={s.id}
                    className="flex items-center justify-between text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50 px-3 py-1.5 rounded-lg"
                  >
                    <span>{(s.subject_id && subjectMap.get(s.subject_id)) || "مذاكرة عامة"}</span>
                    <span className="font-semibold text-indigo-600 dark:text-indigo-400">
                      {s.duration_minutes} دقيقة • {s.session_date}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
