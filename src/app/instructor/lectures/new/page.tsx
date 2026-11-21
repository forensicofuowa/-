import { LectureForm } from "@/components/lectures/lecture-form";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function NewInstructorLecturePage() {
  const profile = await requireRole(["instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [{ data: assigned }, { data: years }] = await Promise.all([
    supabase
      .from("instructor_subjects")
      .select("subjects(*, stages(name))")
      .eq("instructor_id", profile.id),
    supabase.from("academic_years").select("*").eq("is_archived", false),
  ]);

  const subjects = (assigned ?? []).map((a: any) => a.subjects).filter(Boolean) as Subject[];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">إضافة محاضرة جديدة</h1>
      <Card>
        <CardHeader>
          <h2 className="font-semibold text-slate-800 dark:text-slate-100">تفاصيل المحاضرة</h2>
        </CardHeader>
        <CardContent>
          {subjects.length === 0 ? (
            <p className="text-sm text-amber-700 bg-amber-50 p-4 rounded-lg">
              لا توجد مواد مسندة لحسابك حالياً. يرجى الطلب من الإدارة إسناد المواد التي تدرّسها.
            </p>
          ) : (
            <LectureForm
              basePath="/instructor/lectures"
              subjects={subjects}
              academicYears={(years as AcademicYear[]) ?? []}
            />
          )}
        </CardContent>
      </Card>
    </div>
  );
}
