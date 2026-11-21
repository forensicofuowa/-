import { Activity } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createAdminClient } from "@/lib/supabase/admin";
import { activityActionLabel, formatDateTime } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function AdminActivityPage() {
  const admin = createAdminClient();
  const [{ data: logs }, { data: profiles }] = await Promise.all([
    admin.from("activity_logs").select("*").order("created_at", { ascending: false }).limit(100),
    admin.from("profiles").select("id, full_name, role"),
  ]);

  const actorMap = new Map((profiles ?? []).map((p: any) => [p.id, p]));

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <Activity className="h-6 w-6 text-indigo-600" />
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">سجل النشاطات (Activity Logs)</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">
            متابعة دقيقة لكل عمليات الإضافة والتعديل والحذف والموافقة على الحسابات مع التاريخ والوقت
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">أحدث 100 نشاط مسجل</h2>
        </CardHeader>
        <CardContent className="p-0 overflow-x-auto">
          <table className="w-full text-sm text-right">
            <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
              <tr>
                <th className="px-4 py-3">المنفّذ</th>
                <th className="px-4 py-3">العملية</th>
                <th className="px-4 py-3">التفاصيل</th>
                <th className="px-4 py-3">التاريخ والوقت</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {(logs ?? []).map((log: any) => {
                const actor = log.actor_id ? actorMap.get(log.actor_id) : null;
                const meta = (log.metadata ?? {}) as Record<string, any>;
                const detailParts: string[] = [];
                if (meta.title) detailParts.push(`العنوان: ${meta.title}`);
                if (meta.fileName) detailParts.push(`الملف: ${meta.fileName}`);
                if (meta.category) detailParts.push(`التصنيف: ${meta.category === "practical" ? "عملي" : "نظري"}`);
                if (meta.subjectName) detailParts.push(`المادة: ${meta.subjectName}`);
                if (meta.inserted !== undefined) detailParts.push(`أضيف: ${meta.inserted}`);
                if (meta.targetUser) detailParts.push(`الحساب: ${meta.targetUser}`);
                if (meta.count !== undefined) detailParts.push(`عدد الحسابات: ${meta.count}`);
                if (meta.status) detailParts.push(`الحالة: ${meta.status}`);

                return (
                  <tr key={log.id} className="hover:bg-slate-50/70 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-semibold text-slate-900 dark:text-slate-100">
                      {actor?.full_name ?? "النظام"}
                    </td>
                    <td className="px-4 py-3">
                      <Badge
                        tone={
                          log.action.includes("deleted")
                            ? "red"
                            : log.action.includes("created") || log.action.includes("added") || log.action.includes("imported")
                            ? "green"
                            : "indigo"
                        }
                      >
                        {activityActionLabel(log.action)}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-600 dark:text-slate-300">
                      {detailParts.length > 0 ? detailParts.join(" • ") : "—"}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500 dark:text-slate-400">
                      {formatDateTime(log.created_at)}
                    </td>
                  </tr>
                );
              })}
              {(!logs || logs.length === 0) && (
                <tr>
                  <td colSpan={4} className="px-4 py-8 text-center text-slate-500">
                    لا توجد نشاطات مسجلة بعد.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </CardContent>
      </Card>
    </div>
  );
}
