import { CalendarDays, Clock, MapPin } from "lucide-react";
import { ExamCountdown } from "@/components/student/exam-countdown";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

const WEEK_DAYS = [
  "السبت",
  "الأحد",
  "الإثنين",
  "الثلاثاء",
  "الأربعاء",
  "الخميس",
];

function lectureCountLabel(count: number): string {
  if (count === 0) return "بدون محاضرات";
  if (count === 1) return "محاضرة واحدة";
  if (count === 2) return "محاضرتان";
  return `${count} محاضرات`;
}

export default async function StudentSchedulePage() {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  let query = supabase
    .from("stage_schedules")
    .select("*, stages(name), subjects(name)")
    .order("time_range", { ascending: true, nullsFirst: false })
    .order("created_at", { ascending: true });

  if (profile.role === "student" && profile.stage_id) {
    query = query.eq("stage_id", profile.stage_id);
  }

  const { data: entries } = await query;
  const allEntries = entries ?? [];

  const classes = allEntries.filter((e: any) => e.entry_type === "class");
  const exams = allEntries
    .filter((e: any) => e.entry_type === "exam")
    .sort((a: any, b: any) => {
      const ta = a.exam_date ? new Date(a.exam_date).getTime() : Number.MAX_SAFE_INTEGER;
      const tb = b.exam_date ? new Date(b.exam_date).getTime() : Number.MAX_SAFE_INTEGER;
      return ta - tb;
    });

  const nowMs = Date.now();
  const upcomingExams = exams.filter(
    (e: any) => e.exam_date && new Date(e.exam_date).getTime() > nowMs
  );
  const nearestExam = upcomingExams[0] ?? null;

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <CalendarDays className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">جدول المحاضرات الأسبوعي والامتحانات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            محاضراتك موزعة حسب أيام الأسبوع (السبت إلى الخميس) مع مواعيد الامتحانات القادمة
          </p>
        </div>
      </div>

      {nearestExam && (
        <ExamCountdown targetIso={nearestExam.exam_date} title={nearestExam.title} />
      )}

      {/* Day-by-Day Weekly Schedule */}
      <div className="space-y-3">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">الجدول الأسبوعي حسب الأيام</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {WEEK_DAYS.map((day) => {
            const dayClasses = classes.filter((c: any) => (c.day_of_week || "").trim() === day);
            return (
              <Card
                key={day}
                className={
                  dayClasses.length > 0
                    ? "border-indigo-200/80 dark:border-indigo-900/70"
                    : "opacity-75"
                }
              >
                <CardHeader className="flex items-center justify-between py-3.5 bg-slate-50/80 dark:bg-slate-800/50">
                  <h3 className="font-extrabold text-base text-slate-900 dark:text-white">{day}</h3>
                  <Badge tone={dayClasses.length > 0 ? "indigo" : "slate"}>
                    {lectureCountLabel(dayClasses.length)}
                  </Badge>
                </CardHeader>

                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                  {dayClasses.length === 0 ? (
                    <p className="p-6 text-center text-xs text-slate-400">لا توجد محاضرات في هذا اليوم</p>
                  ) : (
                    dayClasses.map((c: any, idx: number) => (
                      <div key={c.id} className="p-4 space-y-1.5">
                        <div className="flex items-start gap-2.5">
                          <span className="mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-indigo-600 text-white text-xs font-bold">
                            {idx + 1}
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="font-bold text-sm text-slate-900 dark:text-slate-100 leading-snug">
                              {c.title}
                            </p>
                            {c.subjects?.name && (
                              <p className="text-xs font-medium text-indigo-600 dark:text-indigo-400 mt-0.5">
                                {c.subjects.name}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex flex-wrap items-center gap-3 pr-8 text-xs text-slate-500 dark:text-slate-400">
                          {c.time_range && (
                            <span className="inline-flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5 text-slate-400" />
                              {c.time_range}
                            </span>
                          )}
                          {c.room_or_hall && (
                            <span className="inline-flex items-center gap-1">
                              <MapPin className="h-3.5 w-3.5 text-slate-400" />
                              {c.room_or_hall}
                            </span>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Exams Section */}
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">مواعيد الامتحانات ({exams.length})</h2>
        </CardHeader>
        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
          {exams.map((ex: any) => (
            <div key={ex.id} className="px-6 py-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge tone="red">امتحان</Badge>
                  {ex.day_of_week && <Badge tone="indigo">{ex.day_of_week}</Badge>}
                  <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ex.title}</span>
                </div>
                <p className="text-xs text-slate-600 dark:text-slate-300 mt-1">
                  {ex.subjects?.name ? `${ex.subjects.name} • ` : ""}
                  {ex.exam_date ? `التاريخ والوقت: ${formatDateTime(ex.exam_date)}` : ""}
                  {ex.room_or_hall ? ` • القاعة: ${ex.room_or_hall}` : ""}
                </p>
              </div>
            </div>
          ))}
          {exams.length === 0 && (
            <p className="p-6 text-center text-sm text-slate-500">لا توجد مواعيد امتحانات مسجلة حالياً.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
