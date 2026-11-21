import { CalendarDays } from "lucide-react";
import { createScheduleEntryAction, deleteScheduleEntryAction } from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
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

export default async function AdminSchedulePage() {
  const supabase = await createClient();
  const [{ data: stages }, { data: subjects }, { data: entries }] = await Promise.all([
    supabase.from("stages").select("*").order("level_number", { ascending: true }),
    supabase.from("subjects").select("id, name, stage_id").eq("is_archived", false).order("name"),
    supabase
      .from("stage_schedules")
      .select("*, stages(name), subjects(name)")
      .order("time_range", { ascending: true, nullsFirst: false })
      .order("created_at", { ascending: true }),
  ]);

  const allEntries = entries ?? [];
  const weeklyClasses = allEntries.filter((e: any) => e.entry_type === "class");
  const exams = allEntries.filter((e: any) => e.entry_type === "exam");

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <CalendarDays className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">جدول المحاضرات الأسبوعي والامتحانات</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            رتّب محاضرات كل يوم (السبت، الأحد، الإثنين، الثلاثاء، الأربعاء، الخميس) مع إمكانية إضافة عدة محاضرات لنفس اليوم
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">إضافة محاضرة أسبوعية أو موعد امتحان</h2>
        </CardHeader>
        <CardContent>
          <form action={createScheduleEntryAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">النوع</label>
              <select
                name="entryType"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="class">محاضرة في الجدول الأسبوعي</option>
                <option value="exam">موعد امتحان (مع عدّاد تنازلي)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">المرحلة الدراسية</label>
              <select
                name="stageId"
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {(stages ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">اليوم</label>
              <select
                name="dayOfWeek"
                defaultValue="السبت"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {WEEK_DAYS.map((d) => (
                  <option key={d} value={d}>
                    {d}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">المادة الدراسية</label>
              <select
                name="subjectId"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="">— اختر المادة (اختياري) —</option>
                {(subjects ?? []).map((sub: any) => (
                  <option key={sub.id} value={sub.id}>
                    {sub.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                اسم المحاضرة / نوع الدرس (نظري أو عملي)
              </label>
              <input
                name="title"
                required
                placeholder="مثال: المحاضرة الأولى - مبادئ الأدلة الجنائية (نظري)"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">وقت المحاضرة</label>
              <input
                name="timeRange"
                placeholder="مثال: 08:30 - 10:30"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">القاعة / المختبر</label>
              <input
                name="roomOrHall"
                placeholder="مثال: قاعة 2 أو مختبر الوراثة"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-600 dark:text-slate-400 mb-1">
                تاريخ الامتحان (يُملأ للامتحانات فقط)
              </label>
              <input
                type="datetime-local"
                name="examDate"
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div className="md:col-span-3 flex justify-end pt-1">
              <Button type="submit">+ إضافة إلى الجدول</Button>
            </div>
          </form>
        </CardContent>
      </Card>

      {/* Weekly Classes Grouped by Day */}
      <div className="space-y-4">
        <h2 className="text-lg font-bold text-slate-900 dark:text-white">
          الجدول الأسبوعي حسب الأيام ({weeklyClasses.length} محاضرة)
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {WEEK_DAYS.map((day) => {
            const dayItems = weeklyClasses.filter((c: any) => (c.day_of_week || "").trim() === day);
            return (
              <Card key={day}>
                <CardHeader className="flex items-center justify-between py-3">
                  <span className="font-bold text-base text-indigo-700 dark:text-indigo-300">{day}</span>
                  <Badge tone={dayItems.length > 0 ? "indigo" : "slate"}>
                    {dayItems.length === 0
                      ? "لا توجد محاضرات"
                      : dayItems.length === 1
                      ? "محاضرة واحدة"
                      : dayItems.length === 2
                      ? "محاضرتان"
                      : `${dayItems.length} محاضرات`}
                  </Badge>
                </CardHeader>
                <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
                  {dayItems.length === 0 ? (
                    <p className="p-4 text-xs text-slate-400 text-center">يوم عطلة أو بدون محاضرات</p>
                  ) : (
                    dayItems.map((item: any, idx: number) => (
                      <div key={item.id} className="flex items-center justify-between gap-3 px-4 py-3">
                        <div className="min-w-0">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <span className="inline-flex h-5 w-5 items-center justify-center rounded-full bg-indigo-600 text-white text-[11px] font-bold shrink-0">
                              {idx + 1}
                            </span>
                            <span className="font-semibold text-sm text-slate-900 dark:text-slate-100 truncate">
                              {item.title}
                            </span>
                          </div>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                            <span className="font-medium text-indigo-600 dark:text-indigo-400">
                              {item.stages?.name ?? "—"}
                            </span>
                            {item.subjects?.name ? ` • ${item.subjects.name}` : ""}
                            {item.time_range ? ` • ${item.time_range}` : ""}
                            {item.room_or_hall ? ` • ${item.room_or_hall}` : ""}
                          </p>
                        </div>
                        <form action={deleteScheduleEntryAction}>
                          <input type="hidden" name="id" value={item.id} />
                          <Button type="submit" size="sm" variant="danger">
                            حذف
                          </Button>
                        </form>
                      </div>
                    ))
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      {/* Exams List */}
      {exams.length > 0 && (
        <Card>
          <CardHeader>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">مواعيد الامتحانات المسجلة ({exams.length})</h2>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {exams.map((ex: any) => (
              <div key={ex.id} className="flex flex-wrap items-center justify-between gap-3 px-6 py-3.5">
                <div>
                  <div className="flex items-center gap-2">
                    <Badge tone="red">امتحان</Badge>
                    <Badge>{ex.stages?.name ?? "—"}</Badge>
                    <span className="font-bold text-sm text-slate-900 dark:text-slate-100">{ex.title}</span>
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                    {ex.subjects?.name ? `${ex.subjects.name} • ` : ""}
                    {ex.exam_date ? `الموعد: ${formatDateTime(ex.exam_date)}` : ""}
                    {ex.room_or_hall ? ` • القاعة: ${ex.room_or_hall}` : ""}
                  </p>
                </div>
                <form action={deleteScheduleEntryAction}>
                  <input type="hidden" name="id" value={ex.id} />
                  <Button type="submit" size="sm" variant="danger">
                    حذف
                  </Button>
                </form>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
