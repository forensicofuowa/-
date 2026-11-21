import Link from "next/link";
import { FileText, Megaphone } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, semesterLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentDashboardPage() {
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [{ data: announcements }, { data: latestLectures }, { data: subjects }, { data: stages }, { data: files }] =
    await Promise.all([
      supabase
        .from("announcements")
        .select("*, stages(name)")
        .order("is_pinned", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("lectures")
        .select("*")
        .eq("status", "published")
        .order("created_at", { ascending: false })
        .limit(6),
      supabase.from("subjects").select("id, name, stage_id"),
      supabase.from("stages").select("id, name"),
      supabase.from("lecture_files").select("id, lecture_id, status").eq("status", "ready"),
    ]);

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));
  const subjectMap = new Map(
    (subjects ?? []).map((sub: any) => [
      sub.id,
      { name: sub.name, stageName: stageMap.get(sub.stage_id) ?? "" },
    ])
  );
  const fileCountByLecture = new Map<string, number>();
  for (const f of files ?? []) {
    fileCountByLecture.set(f.lecture_id, (fileCountByLecture.get(f.lecture_id) ?? 0) + 1);
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">أهلاً بك، {profile.full_name}</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">تابع أحدث المحاضرات المنشورة وتبليغات القسم أولاً بأول</p>
      </div>

      {announcements && announcements.length > 0 && (
        <Card className="border-indigo-200 dark:border-indigo-900 bg-indigo-50/40 dark:bg-indigo-950/30">
          <CardHeader className="border-indigo-100 dark:border-indigo-900/60 flex items-center gap-2">
            <Megaphone className="h-5 w-5 text-indigo-600 dark:text-indigo-400" />
            <h2 className="font-bold text-indigo-950 dark:text-indigo-200">أحدث الإعلانات والتبليغات</h2>
          </CardHeader>
          <CardContent className="divide-y divide-indigo-100 dark:divide-indigo-900/50 py-2">
            {announcements.map((a: any) => (
              <div key={a.id} className="py-3">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-sm text-slate-900 dark:text-slate-100">{a.title}</h3>
                  {a.is_pinned && <Badge tone="amber">هام</Badge>}
                </div>
                <p className="text-sm text-slate-700 dark:text-slate-300 mt-1">{a.body}</p>
                <p className="text-xs text-slate-400 mt-1">{formatDate(a.created_at)}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-bold text-slate-900 dark:text-white">أحدث المحاضرات المنشورة</h2>
          <Link href="/student/lectures" className="text-sm font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            تصفح المكتبة الكاملة ←
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {(latestLectures ?? []).map((lec: any) => {
            const sub = subjectMap.get(lec.subject_id);
            const count = fileCountByLecture.get(lec.id) ?? 0;
            return (
              <Link key={lec.id} href={`/student/lectures/${lec.id}`}>
                <Card className="h-full hover:border-indigo-400 hover:shadow-md transition-all">
                  <CardContent className="p-5 flex flex-col justify-between h-full">
                    <div>
                      <div className="flex flex-wrap items-center justify-between gap-1.5 mb-2">
                        <Badge tone="indigo">{sub?.name ?? "—"}</Badge>
                        <Badge tone={lec.semester === 2 ? "teal" : "slate"}>{semesterLabel(lec.semester)}</Badge>
                      </div>
                      <h3 className="font-bold text-slate-900 dark:text-slate-100">
                        محاضرة {lec.lecture_number}: {lec.title}
                      </h3>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{sub?.stageName ?? ""}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <FileText className="h-4 w-4 text-indigo-500" />
                        <span>{count} مرفقات</span>
                      </span>
                      <span>{formatDate(lec.created_at)}</span>
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
