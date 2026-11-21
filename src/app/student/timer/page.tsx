import { PomodoroTimer } from "@/components/student/pomodoro-timer";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function StudentTimerPage() {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().slice(0, 10);

  const [{ data: subjects }, { data: sessions }] = await Promise.all([
    supabase.from("subjects").select("id, name").eq("is_archived", false).order("name"),
    supabase
      .from("study_sessions")
      .select("id, subject_id, duration_minutes, session_date")
      .eq("student_id", profile.id)
      .gte("session_date", weekAgo)
      .order("created_at", { ascending: false }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مؤقت جلسات الدراسة والتركيز</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">
          نظّم وقت مذاكرتك بنظام Pomodoro وسجّل ساعات دراستك لكل مادة مع ملخص أسبوعي
        </p>
      </div>

      <PomodoroTimer
        subjects={(subjects as Array<{ id: string; name: string }>) ?? []}
        recentSessions={(sessions as any[]) ?? []}
      />
    </div>
  );
}
