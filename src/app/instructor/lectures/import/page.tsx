import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BatchLectureImporter } from "@/components/lectures/batch-lecture-importer";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function InstructorImportLecturesPage() {
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
      <Link
        href="/instructor/lectures"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600"
      >
        <ArrowRight className="h-4 w-4" />
        <span>العودة إلى محاضراتي</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">رفع ملف مجموعة محاضرات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">ارفع ملفاً يحتوي على عدة محاضرات وحدد المحاضرات المراد إضافتها لموادك</p>
      </div>

      {subjects.length === 0 ? (
        <div className="rounded-lg border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
          لا توجد مواد مسندة لحسابك حالياً. يرجى الطلب من الإدارة إسناد المواد التي تدرّسها.
        </div>
      ) : (
        <BatchLectureImporter
          redirectPath="/instructor/lectures"
          subjects={subjects}
          academicYears={(years as AcademicYear[]) ?? []}
        />
      )}
    </div>
  );
}
