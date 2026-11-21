import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowRight, CheckCircle2, FolderDown, Heart } from "lucide-react";
import { toggleFavoriteAction, toggleLectureCompletedAction } from "@/app/student/actions";
import { InlineFileViewer } from "@/components/lectures/inline-file-viewer";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate, semesterLabel } from "@/lib/utils";
import type { LectureFile } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function StudentLectureDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["student", "instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [{ data: lecture }, { data: files }, { data: fav }, { data: viewRow }, { data: subjects }, { data: stages }] =
    await Promise.all([
      supabase.from("lectures").select("*").eq("id", id).eq("status", "published").maybeSingle(),
      supabase
        .from("lecture_files")
        .select("*")
        .eq("lecture_id", id)
        .eq("status", "ready")
        .order("sort_order", { ascending: true }),
      supabase
        .from("favorites")
        .select("lecture_id")
        .eq("student_id", profile.id)
        .eq("lecture_id", id)
        .maybeSingle(),
      supabase
        .from("student_lecture_views")
        .select("is_completed")
        .eq("student_id", profile.id)
        .eq("lecture_id", id)
        .maybeSingle(),
      supabase.from("subjects").select("id, name, stage_id"),
      supabase.from("stages").select("id, name"),
    ]);

  if (!lecture) notFound();

  // Record that student opened this lecture for Study Summary
  await supabase.from("student_lecture_views").upsert(
    {
      student_id: profile.id,
      lecture_id: id,
      is_completed: Boolean(viewRow?.is_completed),
      last_viewed_at: new Date().toISOString(),
    },
    { onConflict: "student_id,lecture_id" }
  );

  const isFav = Boolean(fav);
  const isCompleted = Boolean(viewRow?.is_completed);

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));
  const sub = (subjects ?? []).find((s: any) => s.id === (lecture as any).subject_id);
  const typedFiles = (files as LectureFile[]) ?? [];

  return (
    <div className="space-y-6">
      <Link
        href="/student/lectures"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600"
      >
        <ArrowRight className="h-4 w-4" />
        <span>العودة إلى مكتبة المحاضرات</span>
      </Link>

      <Card>
        <CardContent className="p-6">
          <div className="flex flex-wrap items-start justify-between gap-4">
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-2">
                {sub && <Badge tone="indigo">{sub.name}</Badge>}
                {sub && stageMap.get(sub.stage_id) && <Badge>{stageMap.get(sub.stage_id)}</Badge>}
                <Badge tone={(lecture as any).semester === 2 ? "teal" : "slate"}>
                  {semesterLabel((lecture as any).semester)}
                </Badge>
              </div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
                محاضرة {(lecture as any).lecture_number}: {(lecture as any).title}
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                تاريخ النشر: {formatDate((lecture as any).created_at)}
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <form action={toggleLectureCompletedAction}>
                <input type="hidden" name="lectureId" value={(lecture as any).id} />
                <Button type="submit" variant={isCompleted ? "primary" : "outline"} size="sm">
                  <CheckCircle2 className="h-4 w-4" />
                  <span>{isCompleted ? "تمت مذاكرتها" : "تحديد كمكتملة"}</span>
                </Button>
              </form>

              <form action={toggleFavoriteAction}>
                <input type="hidden" name="lectureId" value={(lecture as any).id} />
                <Button type="submit" variant={isFav ? "danger" : "outline"} size="sm">
                  <Heart className={`h-4 w-4 ${isFav ? "fill-current" : ""}`} />
                  <span>{isFav ? "محفوظة بالمفضلة" : "حفظ بالمفضلة"}</span>
                </Button>
              </form>
            </div>
          </div>

          {(lecture as any).description && (
            <p className="mt-4 text-sm text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line bg-slate-50 dark:bg-slate-800/60 p-4 rounded-lg border border-slate-100 dark:border-slate-800">
              {(lecture as any).description}
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">
              ملفات المحاضرة ({typedFiles.length})
            </h2>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              اضغط "معاينة مدمجة" لفتح ملفات PDF والصور داخل الصفحة مع التكبير وملء الشاشة
            </p>
          </div>

          {typedFiles.length > 0 && (
            <a href={`/api/lectures/${(lecture as any).id}/download-all`}>
              <Button size="sm" variant="secondary">
                <FolderDown className="h-4 w-4" />
                <span>تنزيل الكل (ZIP)</span>
              </Button>
            </a>
          )}
        </CardHeader>

        <CardContent className="p-0">
          {typedFiles.length === 0 ? (
            <p className="p-6 text-center text-sm text-slate-500">لا توجد مرفقات لهذه المحاضرة حالياً.</p>
          ) : (
            <InlineFileViewer files={typedFiles} />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
