import Link from "next/link";
import { Award, BookOpen, CheckCircle2, Clock, Eye, Heart } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentStudySummaryPage() {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [
    { data: views },
    { count: favCount },
    { data: lectures },
    { data: subjects },
    { data: sessions },
  ] = await Promise.all([
    supabase
      .from("student_lecture_views")
      .select("lecture_id, is_completed, last_viewed_at")
      .eq("student_id", profile.id)
      .order("last_viewed_at", { ascending: false }),
    supabase
      .from("favorites")
      .select("*", { count: "exact", head: true })
      .eq("student_id", profile.id),
    supabase.from("lectures").select("id, lecture_number, title, subject_id").eq("status", "published"),
    supabase.from("subjects").select("id, name").eq("is_archived", false),
    supabase.from("study_sessions").select("duration_minutes").eq("student_id", profile.id),
  ]);

  const lecMap = new Map((lectures ?? []).map((l: any) => [l.id, l]));
  const subMap = new Map((subjects ?? []).map((s: any) => [s.id, s.name]));

  const openedList = (views ?? []).filter((v: any) => lecMap.has(v.lecture_id));
  const completedCount = openedList.filter((v: any) => v.is_completed).length;

  const startedSubjectsSet = new Set<string>();
  for (const v of openedList) {
    const lec = lecMap.get(v.lecture_id);
    if (lec?.subject_id) startedSubjectsSet.add(lec.subject_id);
  }

  const totalStudyMinutes = (sessions ?? []).reduce(
    (acc: number, s: any) => acc + (s.duration_minutes || 0),
    0
  );

  // Per-subject progress
  const subjectProgress = (subjects ?? []).map((sub: any) => {
    const totalInSub = (lectures ?? []).filter((l: any) => l.subject_id === sub.id);
    const openedInSub = openedList.filter((v: any) => lecMap.get(v.lecture_id)?.subject_id === sub.id);
    return {
      id: sub.id,
      name: sub.name,
      total: totalInSub.length,
      opened: openedInSub.length,
    };
  });

  const stats = [
    {
      label: "المحاضرات التي فتحتها",
      value: openedList.length,
      icon: Eye,
      color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60",
    },
    {
      label: "محاضرات أتممت مذاكرتها",
      value: completedCount,
      icon: CheckCircle2,
      color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60",
    },
    {
      label: "المواد التي بدأت دراستها",
      value: `${startedSubjectsSet.size} / ${subjects?.length ?? 0}`,
      icon: BookOpen,
      color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60",
    },
    {
      label: "المحفوظة بالمفضلة",
      value: favCount ?? 0,
      icon: Heart,
      color: "text-red-600 bg-red-50 dark:bg-red-950/60",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <Award className="h-7 w-7 text-indigo-600" />
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">ملف إنجاز الطالب (Study Summary)</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400">
              ملخص نشاطك الدراسي، المحاضرات التي فتحتها، وتقدمك في كل مادة
            </p>
          </div>
        </div>
        <Badge tone="indigo">
          <Clock className="h-3.5 w-3.5 ml-1" />
          إجمالي وقت التركيز: {totalStudyMinutes} دقيقة
        </Badge>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="p-5 flex items-center gap-4">
              <div className={`p-3 rounded-xl ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">تقدمك في المواد الدراسية</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            {subjectProgress.map((sp) => {
              const pct = sp.total > 0 ? Math.round((sp.opened / sp.total) * 100) : 0;
              return (
                <div key={sp.id} className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-slate-800 dark:text-slate-200">{sp.name}</span>
                    <span className="text-slate-500 dark:text-slate-400">
                      {sp.opened} من {sp.total} محاضرة ({pct}%)
                    </span>
                  </div>
                  <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                    <div className="h-full bg-indigo-600 rounded-full" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">آخر المحاضرات التي تصفحتها</h2>
          </CardHeader>
          <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
            {openedList.slice(0, 8).map((v: any) => {
              const lec = lecMap.get(v.lecture_id);
              if (!lec) return null;
              return (
                <Link
                  key={v.lecture_id}
                  href={`/student/lectures/${lec.id}`}
                  className="flex items-center justify-between gap-3 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <div>
                    <p className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                      محاضرة {lec.lecture_number}: {lec.title}
                    </p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {subMap.get(lec.subject_id) ?? "—"} • آخر فتح: {formatDateTime(v.last_viewed_at)}
                    </p>
                  </div>
                  <Badge tone={v.is_completed ? "green" : "slate"}>
                    {v.is_completed ? "مكتملة" : "تم الاطلاع"}
                  </Badge>
                </Link>
              );
            })}
            {openedList.length === 0 && (
              <p className="p-6 text-center text-sm text-slate-500">لم تفتح أي محاضرة بعد.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
