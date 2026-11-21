import Link from "next/link";
import { deleteLectureAction } from "@/app/lectures/actions";
import { PurgeAllLecturesButton } from "@/components/lectures/purge-all-lectures-button";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, semesterLabel, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminLecturesPage() {
  const supabase = await createClient();

  const [{ data: lectures }, { data: subjects }, { data: stages }, { data: profiles }, { data: files }] =
    await Promise.all([
      supabase.from("lectures").select("*").order("created_at", { ascending: false }),
      supabase.from("subjects").select("id, name, stage_id"),
      supabase.from("stages").select("id, name"),
      supabase.from("profiles").select("id, full_name"),
      supabase.from("lecture_files").select("id, lecture_id, status"),
    ]);

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));
  const subjectMap = new Map(
    (subjects ?? []).map((sub: any) => [
      sub.id,
      { name: sub.name, stageName: stageMap.get(sub.stage_id) ?? "—" },
    ])
  );
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  const readyCountByLecture = new Map<string, number>();
  for (const f of files ?? []) {
    if (f.status === "ready") {
      readyCountByLecture.set(f.lecture_id, (readyCountByLecture.get(f.lecture_id) ?? 0) + 1);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إدارة المحاضرات ({lectures?.length ?? 0})</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">إنشاء وتعديل المحاضرات وتصنيفها حسب الفصل والمرفقات</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <PurgeAllLecturesButton totalCount={lectures?.length ?? 0} />
          <Link href="/admin/lectures/import">
            <Button variant="outline">رفع ملف مجموعة محاضرات</Button>
          </Link>
          <Link href="/admin/lectures/new">
            <Button>+ محاضرة جديدة</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">المحاضرة</th>
                <th className="px-4 py-3">المادة / الفصل</th>
                <th className="px-4 py-3">المرفقات</th>
                <th className="px-4 py-3">الحالة</th>
                <th className="px-4 py-3">التاريخ</th>
                <th className="px-4 py-3">إجراءات</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(lectures ?? []).map((lec: any) => {
                const sub = subjectMap.get(lec.subject_id);
                const readyFiles = readyCountByLecture.get(lec.id) ?? 0;
                const authorName = profileMap.get(lec.uploader_id) ?? "—";
                const catLabel = lec.category === "practical" ? "عملي" : "نظري";
                return (
                  <tr key={lec.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3">
                      <p className="font-semibold text-slate-900 dark:text-slate-100">
                        #{lec.lecture_number} — {lec.title}
                      </p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {catLabel} • بواسطة: {authorName}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-slate-800 dark:text-slate-200">{sub?.name ?? "—"}</p>
                      <p className="text-xs text-slate-500 dark:text-slate-400">
                        {sub?.stageName ?? "—"} • {semesterLabel(lec.semester)}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone="indigo">{readyFiles} ملف</Badge>
                    </td>
                    <td className="px-4 py-3">
                      <Badge tone={lec.status === "published" ? "green" : lec.status === "draft" ? "amber" : "slate"}>
                        {statusLabel(lec.status)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">{formatDate(lec.created_at)}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/admin/lectures/${lec.id}/edit`}>
                          <Button size="sm" variant="outline">
                            تعديل / ملفات
                          </Button>
                        </Link>
                        <form action={deleteLectureAction.bind(null, lec.id)}>
                          <Button size="sm" variant="danger" type="submit">
                            حذف
                          </Button>
                        </form>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {(!lectures || lectures.length === 0) && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    لم يتم إضافة أي محاضرة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
