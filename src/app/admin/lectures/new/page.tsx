import { LectureForm } from "@/components/lectures/lecture-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function NewAdminLecturePage() {
  const supabase = await createClient();
  const [{ data: subjects }, { data: stages }, { data: years }] = await Promise.all([
    supabase.from("subjects").select("*").eq("is_archived", false).order("name"),
    supabase.from("stages").select("id, name"),
    supabase.from("academic_years").select("*").eq("is_archived", false).order("is_current", { ascending: false }),
  ]);

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));
  const enrichedSubjects: Subject[] = (subjects ?? []).map((sub: any) => ({
    ...sub,
    stages: { name: stageMap.get(sub.stage_id) ?? "" },
  }));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إنشاء محاضرة جديدة</h1>
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">بيانات المحاضرة الأساسية</h2>
        </CardHeader>
        <CardContent>
          <LectureForm
            basePath="/admin/lectures"
            subjects={enrichedSubjects}
            academicYears={(years as AcademicYear[]) ?? []}
          />
        </CardContent>
      </Card>
    </div>
  );
}
