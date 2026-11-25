import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { statusLabel } from "@/lib/utils";

export const dynamic = "force-dynamic";

type StageRow = { id: string; name: string | null };
type ViewRow = { student_id: string; is_completed: boolean | null; last_viewed_at: string | null };
type FileRow = { id: string; uploaded_by: string | null };
type StudentRow = {
  id: string;
  full_name?: string | null;
  email?: string | null;
  status: string;
  stage_id?: string | null;
  created_at?: string | null;
  updated_at?: string | null;
  can_upload_summaries?: boolean | null;
  admin_password_note?: string | null;
};

function formatFullDateTime(iso?: string | null): { date: string; time: string } {
  if (!iso) return { date: "—", time: "—" };
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return { date: "—", time: "—" };

  return {
    date: new Intl.DateTimeFormat("ar-IQ", {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
    }).format(d),
    time: new Intl.DateTimeFormat("ar-IQ", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: true,
    }).format(d),
  };
}

export default async function AdminStudentAccountsPage() {
  await requireRole(["admin", "super_admin"]);
  const admin = createAdminClient();

  const [{ data: students }, { data: stages }, { data: views }, { data: uploadedFiles }] =
    await Promise.all([
      admin
        .from("profiles")
        .select("*")
        .eq("role", "student")
        .order("created_at", { ascending: false }),
      admin.from("stages").select("id, name"),
      admin
        .from("student_lecture_views")
        .select("student_id, is_completed, last_viewed_at"),
      admin
        .from("lecture_files")
        .select("id, uploaded_by")
        .eq("uploaded_by_role", "student"),
    ]);

  const stageRows = (stages ?? []) as StageRow[];
  const viewRows = (views ?? []) as ViewRow[];
  const fileRows = (uploadedFiles ?? []) as FileRow[];
  const list = (students ?? []) as StudentRow[];

  const stageMap = new Map<string, string>(
    stageRows.map((s) => [s.id, s.name ?? "—"])
  );

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">
          معلومات حسابات الطلبة ({list.length})
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
          بطاقة تفصيلية لكل طالب تحتوي على كافة بيانات الحساب، كلمة السر المسجلة، وتوقيت التسجيل والنشاط.
        </p>
      </div>

      {list.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-slate-500">
            لا توجد حسابات طلبة مسجلة حالياً.
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {list.map((st, idx) => {
            const reg = formatFullDateTime(st.created_at);
            const upd = formatFullDateTime(st.updated_at);
            const studentViews = viewRows.filter((v) => v.student_id === st.id);
            const completedCount = studentViews.filter((v) => Boolean(v.is_completed)).length;
            const lastViewIso = studentViews
              .map((v) => v.last_viewed_at)
              .filter((val): val is string => Boolean(val))
              .sort()
              .pop();
            const lastAct = formatFullDateTime(lastViewIso);
            const filesCount = fileRows.filter((f) => f.uploaded_by === st.id).length;

            return (
              <Card
                key={st.id}
                className="border border-slate-200 dark:border-slate-800 hover:border-indigo-400 transition-colors"
              >
                <CardHeader className="pb-3 border-b border-slate-100 dark:border-slate-800">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400">
                        بطاقة طالب #{idx + 1}
                      </span>
                      <h2 className="font-bold text-base text-slate-900 dark:text-white mt-0.5">
                        {st.full_name || "طالب بدون اسم"}
                      </h2>
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5" dir="ltr">
                        {st.email || "—"}
                      </p>
                    </div>
                    <Badge
                      tone={
                        st.status === "active"
                          ? "green"
                          : st.status === "pending"
                          ? "amber"
                          : "red"
                      }
                    >
                      {statusLabel(st.status)}
                    </Badge>
                  </div>
                </CardHeader>

                <CardContent className="pt-4 space-y-2.5 text-xs text-slate-700 dark:text-slate-300">
                  <div className="flex justify-between gap-2">
                    <span className="text-slate-500">المرحلة الدراسية:</span>
                    <span className="font-semibold">
                      {st.stage_id ? stageMap.get(st.stage_id) ?? "—" : "—"}
                    </span>
                  </div>

                  <div className="flex justify-between gap-2 bg-slate-50 dark:bg-slate-800/60 px-2.5 py-2 rounded-lg">
                    <span className="text-slate-500">كلمة السر:</span>
                    <span
                      className="font-mono font-bold text-indigo-600 dark:text-indigo-400 select-all"
                      dir="ltr"
                    >
                      {st.admin_password_note || "غير مسجلة (حساب قديم)"}
                    </span>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-slate-500">وقت إنشاء الحساب:</div>
                    <div className="font-medium">{reg.date}</div>
                    <div className="text-slate-500">الساعة: {reg.time}</div>
                  </div>

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 space-y-1">
                    <div className="text-slate-500">آخر نشاط (فتح محاضرة):</div>
                    <div className="font-medium">
                      {lastViewIso ? `${lastAct.date} — ${lastAct.time}` : "لم يفتح محاضرات بعد"}
                    </div>
                  </div>

                  {st.updated_at && (
                    <div className="flex justify-between gap-2 text-[11px] text-slate-500">
                      <span>آخر تحديث للحساب:</span>
                      <span>
                        {upd.date} ({upd.time})
                      </span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-wrap items-center justify-between gap-2">
                    <span>
                      محاضرات مكتملة: <strong>{completedCount}</strong>
                    </span>
                    <span>
                      مرفقات مرفوعة: <strong>{filesCount}</strong>
                    </span>
                    <span>
                      رفع المرفقات:{" "}
                      <strong>{st.can_upload_summaries ? "مفعّل" : "غير مفعّل"}</strong>
                    </span>
                  </div>

                  <div className="pt-1 text-[10px] text-slate-400 font-mono truncate" dir="ltr">
                    ID: {st.id}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
