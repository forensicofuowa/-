import { notFound } from "next/navigation";
import { FileUploader } from "@/components/lectures/file-uploader";
import { LectureForm } from "@/components/lectures/lecture-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Lecture, LectureFile, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditAdminLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const [{ data: lecture }, { data: subjects }, { data: stages }, { data: years }, { data: files }] =
    await Promise.all([
      supabase.from("lectures").select("*").eq("id", id).maybeSingle(),
      supabase.from("subjects").select("*").eq("is_archived", false).order("name"),
      supabase.from("stages").select("id, name"),
      supabase.from("academic_years").select("*").eq("is_archived", false),
      supabase
        .from("lecture_files")
        .select("*")
        .eq("lecture_id", id)
        .eq("status", "ready")
        .order("sort_order", { ascending: true }),
    ]);

  if (!lecture) notFound();

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));
  const enrichedSubjects: Subject[] = (subjects ?? []).map((sub: any) => ({
    ...sub,
    stages: { name: stageMap.get(sub.stage_id) ?? "" },
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تعديل المحاضرة والمرفقات</h1>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">تفاصيل المحاضرة</h2>
        </CardHeader>
        <CardContent>
          <LectureForm
            basePath="/admin/lectures"
            lecture={lecture as Lecture}
            subjects={enrichedSubjects}
            academicYears={(years as AcademicYear[]) ?? []}
          />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">المرفقات والملفات (نظري / عملي)</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            حدد تصنيف كل ملف (نظري أو عملي) ليميّزه الطالب بوضوح قبل الفتح أو التحميل.
          </p>
        </CardHeader>
        <CardContent>
          <FileUploader lectureId={id} initialFiles={(files as LectureFile[]) ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
