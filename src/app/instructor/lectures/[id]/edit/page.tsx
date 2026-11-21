import { notFound } from "next/navigation";
import { FileUploader } from "@/components/lectures/file-uploader";
import { LectureForm } from "@/components/lectures/lecture-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Lecture, LectureFile, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function EditInstructorLecturePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const profile = await requireRole(["instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [{ data: lecture }, { data: assigned }, { data: years }, { data: files }] =
    await Promise.all([
      supabase.from("lectures").select("*").eq("id", id).eq("uploader_id", profile.id).maybeSingle(),
      supabase.from("instructor_subjects").select("subjects(*, stages(name))").eq("instructor_id", profile.id),
      supabase.from("academic_years").select("*").eq("is_archived", false),
      supabase
        .from("lecture_files")
        .select("*")
        .eq("lecture_id", id)
        .eq("status", "ready")
        .order("sort_order", { ascending: true }),
    ]);

  if (!lecture) notFound();
  const subjects = (assigned ?? []).map((a: any) => a.subjects).filter(Boolean) as Subject[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">تعديل المحاضرة والمرفقات</h1>
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">تفاصيل المحاضرة</h2>
        </CardHeader>
        <CardContent>
          <LectureForm
            basePath="/instructor/lectures"
            lecture={lecture as Lecture}
            subjects={subjects}
            academicYears={(years as AcademicYear[]) ?? []}
          />
        </CardContent>
      </Card>
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">رفع المرفقات (نظري / عملي)</h2>
        </CardHeader>
        <CardContent>
          <FileUploader lectureId={id} initialFiles={(files as LectureFile[]) ?? []} />
        </CardContent>
      </Card>
    </div>
  );
}
