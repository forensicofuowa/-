import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { BatchLectureImporter } from "@/components/lectures/batch-lecture-importer";
import { createClient } from "@/lib/supabase/server";
import type { AcademicYear, Subject } from "@/types/database";

export const dynamic = "force-dynamic";

export default async function AdminImportLecturesPage() {
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
      <Link
        href="/admin/lectures"
        className="inline-flex items-center gap-1.5 text-sm text-slate-600 dark:text-slate-400 hover:text-indigo-600"
      >
        <ArrowRight className="h-4 w-4" />
        <span>العودة إلى إدارة المحاضرات</span>
      </Link>

      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">رفع ملف مجموعة محاضرات</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">ارفع ملفاً يحتوي على عدة محاضرات وحدد المحاضرات التي تريد إضافتها</p>
      </div>

      <BatchLectureImporter
        redirectPath="/admin/lectures"
        subjects={enrichedSubjects}
        academicYears={(years as AcademicYear[]) ?? []}
      />
    </div>
  );
}
