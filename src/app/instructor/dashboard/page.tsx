import Link from "next/link";
import { BookOpen, FileText } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function InstructorDashboardPage() {
  const profile = await requireRole(["instructor", "admin", "super_admin"]);
  const supabase = await createClient();

  const [{ data: assigned }, { count: lectureCount }] = await Promise.all([
    supabase
      .from("instructor_subjects")
      .select("subjects(id, name, code, stages(name))")
      .eq("instructor_id", profile.id),
    supabase.from("lectures").select("*", { count: "exact", head: true }).eq("uploader_id", profile.id),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">مرحباً أ. {profile.full_name}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">إدارة موادك الدراسية ورفع المحاضرات للطلبة</p>
        </div>
        <div className="flex gap-2">
          <Link href="/instructor/lectures/import">
            <Button variant="outline">رفع ملف مجموعة محاضرات</Button>
          </Link>
          <Link href="/instructor/lectures/new">
            <Button>+ رفع محاضرة جديدة</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600">
              <BookOpen className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">المواد المسندة لك</p>
              <p className="text-2xl font-bold">{assigned?.length ?? 0}</p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-5 flex items-center gap-4">
            <div className="p-3 rounded-xl bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600">
              <FileText className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs text-slate-500 dark:text-slate-400">إجمالي محاضراتك</p>
              <p className="text-2xl font-bold">{lectureCount ?? 0}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">المواد المسندة إليك</h2>
        </CardHeader>
        <CardContent>
          {!assigned || assigned.length === 0 ? (
            <p className="text-sm text-slate-500">
              لم يتم إسناد مواد دراسية لحسابك بعد. يرجى التواصل مع مدير القسم لإسناد موادك.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {assigned.map((row: any) => (
                <div key={row.subjects.id} className="rounded-lg border border-slate-200 dark:border-slate-800 p-4">
                  <p className="font-semibold text-slate-900 dark:text-slate-100">{row.subjects.name}</p>
                  <div className="mt-1.5 flex gap-2">
                    <Badge tone="indigo">{row.subjects.stages?.name ?? "—"}</Badge>
                    {row.subjects.code && <Badge>{row.subjects.code}</Badge>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
