import Link from "next/link";
import { BookOpen, Clock, FileText, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";
import { formatDate, semesterLabel, statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminDashboardPage() {
  const supabase = await createClient();

  const [
    { count: totalUsers },
    { count: pendingUsers },
    { count: totalSubjects },
    { count: totalLectures },
    { data: recentLectures },
    { data: subjects },
    { data: profiles },
  ] = await Promise.all([
    supabase.from("profiles").select("*", { count: "exact", head: true }),
    supabase.from("profiles").select("*", { count: "exact", head: true }).eq("status", "pending"),
    supabase.from("subjects").select("*", { count: "exact", head: true }),
    supabase.from("lectures").select("*", { count: "exact", head: true }),
    supabase.from("lectures").select("*").order("created_at", { ascending: false }).limit(6),
    supabase.from("subjects").select("id, name"),
    supabase.from("profiles").select("id, full_name"),
  ]);

  const subjectMap = new Map((subjects ?? []).map((s: any) => [s.id, s.name]));
  const profileMap = new Map((profiles ?? []).map((p: any) => [p.id, p.full_name]));

  const stats = [
    { label: "إجمالي المستخدمين", value: totalUsers ?? 0, icon: Users, color: "text-indigo-600 bg-indigo-50 dark:bg-indigo-950/60" },
    { label: "طلبات بانتظار الموافقة", value: pendingUsers ?? 0, icon: Clock, color: "text-amber-600 bg-amber-50 dark:bg-amber-950/60" },
    { label: "المواد الدراسية", value: totalSubjects ?? 0, icon: BookOpen, color: "text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60" },
    { label: "المحاضرات", value: totalLectures ?? 0, icon: FileText, color: "text-blue-600 bg-blue-50 dark:bg-blue-950/60" },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">لوحة تحكم الإدارة</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">نظرة شاملة على المنصة الأكاديمية وحالة المحاضرات والطلبة</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/lectures/new">
            <Button>+ إضافة محاضرة جديدة</Button>
          </Link>
          <Link href="/admin/lectures/import">
            <Button variant="outline">رفع ملف مجموعة محاضرات</Button>
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((s) => (
          <Card key={s.label}>
            <CardContent className="flex items-center gap-4 p-5">
              <div className={`p-3 rounded-xl ${s.color}`}>
                <s.icon className="h-6 w-6" />
              </div>
              <div>
                <p className="text-xs font-medium text-slate-500 dark:text-slate-400">{s.label}</p>
                <p className="text-2xl font-bold text-slate-900 dark:text-white">{s.value}</p>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader className="flex items-center justify-between">
          <h2 className="font-bold text-slate-800 dark:text-slate-100">أحدث المحاضرات المضافة</h2>
          <Link href="/admin/lectures" className="text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:underline">
            عرض الكل
          </Link>
        </CardHeader>
        <CardContent className="p-0">
          {!recentLectures || recentLectures.length === 0 ? (
            <p className="p-6 text-sm text-slate-500 text-center">لا توجد محاضرات بعد.</p>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {recentLectures.map((lec: any) => (
                <div key={lec.id} className="flex items-center justify-between gap-4 px-6 py-3.5">
                  <div>
                    <Link
                      href={`/admin/lectures/${lec.id}/edit`}
                      className="font-semibold text-sm text-slate-900 dark:text-slate-100 hover:text-indigo-600"
                    >
                      محاضرة {lec.lecture_number}: {lec.title}
                    </Link>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                      {subjectMap.get(lec.subject_id) ?? "—"} • {semesterLabel(lec.semester)} • {profileMap.get(lec.uploader_id) ?? "—"} • {formatDate(lec.created_at)}
                    </p>
                  </div>
                  <Badge tone={lec.status === "published" ? "green" : lec.status === "draft" ? "amber" : "slate"}>
                    {statusLabel(lec.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
