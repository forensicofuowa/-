import Link from "next/link";
import { deleteLectureAction } from "@/app/lectures/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { semesterLabel, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function InstructorLecturesPage() {
  const profile = await requireRole(["instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const { data: lectures } = await supabase
    .from("lectures")
    .select("*, subjects(name), lecture_files(id, status)")
    .eq("uploader_id", profile.id)
    .order("created_at", { ascending: false });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">محاضراتي</h1>
        <div className="flex gap-2">
          <Link href="/instructor/lectures/import">
            <Button variant="outline">رفع ملف مجموعة محاضرات</Button>
          </Link>
          <Link href="/instructor/lectures/new">
            <Button>+ محاضرة جديدة</Button>
          </Link>
        </div>
      </div>

      <Card>
        <CardContent className="p-0 divide-y divide-slate-100 dark:divide-slate-800">
          {(lectures ?? []).map((lec: any) => {
            const count = (lec.lecture_files ?? []).filter((f: any) => f.status === "ready").length;
            return (
              <div key={lec.id} className="flex flex-wrap items-center justify-between gap-4 px-6 py-4">
                <div>
                  <p className="font-semibold text-slate-900 dark:text-slate-100">
                    محاضرة {lec.lecture_number}: {lec.title}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                    {lec.subjects?.name ?? "—"} • {semesterLabel(lec.semester)} • {count} ملفات
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge tone={lec.status === "published" ? "green" : "amber"}>
                    {statusLabel(lec.status)}
                  </Badge>
                  <Link href={`/instructor/lectures/${lec.id}/edit`}>
                    <Button size="sm" variant="outline">
                      تعديل / المرفقات
                    </Button>
                  </Link>
                  <form action={deleteLectureAction.bind(null, lec.id)}>
                    <Button size="sm" variant="danger" type="submit">
                      حذف
                    </Button>
                  </form>
                </div>
              </div>
            );
          })}
          {(!lectures || lectures.length === 0) && (
            <p className="p-8 text-center text-sm text-slate-500">لا توجد محاضرات مرفوعة بعد.</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
