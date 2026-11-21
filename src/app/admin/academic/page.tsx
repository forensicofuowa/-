import {
  assignInstructorSubjectAction,
  createAcademicYearAction,
  createStageAction,
  createSubjectAction,
  deleteAcademicYearAction,
  deleteStageAction,
  deleteSubjectAction,
  updateStageAction,
  updateSubjectAction,
} from "@/app/admin/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function AdminAcademicPage() {
  const supabase = await createClient();

  const [{ data: stages }, { data: years }, { data: subjects }, { data: instructors }] =
    await Promise.all([
      supabase.from("stages").select("*").order("level_number", { ascending: true }),
      supabase.from("academic_years").select("*").order("created_at", { ascending: false }),
      supabase.from("subjects").select("*").order("created_at", { ascending: false }),
      supabase
        .from("profiles")
        .select("id, full_name")
        .in("role", ["instructor", "admin", "super_admin"])
        .eq("status", "active"),
    ]);

  const stageMap = new Map((stages ?? []).map((s: any) => [s.id, s.name]));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white">الهيكل الأكاديمي</h1>
        <p className="text-sm text-slate-500 dark:text-slate-400">إضافة وتعديل وحذف المراحل الدراسية والسنوات والمواد الدراسية</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">المراحل الدراسية ({stages?.length ?? 0})</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createStageAction} className="flex gap-2">
              <input
                name="name"
                required
                placeholder="اسم المرحلة (مثلاً: المرحلة الخامسة)"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <input
                name="levelNumber"
                type="number"
                defaultValue={(stages?.length ?? 0) + 1}
                className="w-20 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <Button type="submit">إضافة</Button>
            </form>

            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(stages ?? []).map((s: any) => (
                <li key={s.id} className="py-2.5 flex flex-wrap items-center justify-between gap-2 text-sm">
                  <form action={updateStageAction} className="flex flex-1 items-center gap-2 min-w-[220px]">
                    <input type="hidden" name="id" value={s.id} />
                    <input
                      name="name"
                      defaultValue={s.name}
                      required
                      className="flex-1 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-sm font-medium"
                    />
                    <input
                      name="levelNumber"
                      type="number"
                      defaultValue={s.level_number}
                      className="w-16 rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                    />
                    <Button type="submit" size="sm" variant="outline">
                      حفظ
                    </Button>
                  </form>
                  <form action={deleteStageAction}>
                    <input type="hidden" name="id" value={s.id} />
                    <Button type="submit" size="sm" variant="danger">
                      حذف
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <h2 className="font-bold text-slate-800 dark:text-slate-100">السنوات الدراسية ({years?.length ?? 0})</h2>
          </CardHeader>
          <CardContent className="space-y-4">
            <form action={createAcademicYearAction} className="flex gap-2">
              <input
                name="label"
                required
                placeholder="مثال: 2027-2028"
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
              <Button type="submit">إضافة</Button>
            </form>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {(years ?? []).map((y: any) => (
                <li key={y.id} className="py-2.5 flex items-center justify-between gap-2 text-sm">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{y.label}</span>
                    {y.is_current && <Badge tone="green">السنة الحالية</Badge>}
                  </div>
                  <form action={deleteAcademicYearAction}>
                    <input type="hidden" name="id" value={y.id} />
                    <Button type="submit" size="sm" variant="danger">
                      حذف
                    </Button>
                  </form>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">المواد الدراسية ({subjects?.length ?? 0})</h2>
        </CardHeader>
        <CardContent className="space-y-5">
          <form action={createSubjectAction} className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              name="name"
              required
              placeholder="اسم المادة الدراسية"
              className="md:col-span-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <input
              name="code"
              placeholder="الرمز (مثل FOR205)"
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
            <div className="flex gap-2">
              <select
                name="stageId"
                required
                className="flex-1 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-2 text-sm"
              >
                {(stages ?? []).map((s: any) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              <Button type="submit">إضافة</Button>
            </div>
          </form>

          <div className="divide-y divide-slate-200 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
            {(subjects ?? []).map((sub: any) => (
              <div key={sub.id} className="p-3.5 flex flex-col lg:flex-row lg:items-center justify-between gap-3">
                <form action={updateSubjectAction} className="flex flex-1 flex-wrap items-center gap-2">
                  <input type="hidden" name="id" value={sub.id} />
                  <input
                    name="name"
                    defaultValue={sub.name}
                    required
                    className="flex-1 min-w-[180px] rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-sm font-medium"
                  />
                  <input
                    name="code"
                    defaultValue={sub.code ?? ""}
                    placeholder="رمز المادة"
                    className="w-28 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm"
                  />
                  <select
                    name="stageId"
                    defaultValue={sub.stage_id}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1.5 text-sm"
                  >
                    {(stages ?? []).map((s: any) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                  <Button type="submit" size="sm" variant="outline">
                    حفظ التعديل
                  </Button>
                </form>

                <div className="flex items-center justify-end gap-2">
                  <Badge tone="indigo">{stageMap.get(sub.stage_id) ?? "—"}</Badge>
                  <form action={deleteSubjectAction}>
                    <input type="hidden" name="id" value={sub.id} />
                    <Button type="submit" size="sm" variant="danger">
                      حذف المادة
                    </Button>
                  </form>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">إسناد مادة إلى تدريسي</h2>
        </CardHeader>
        <CardContent>
          <form action={assignInstructorSubjectAction} className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <select
              name="instructorId"
              required
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">اختر التدريسي...</option>
              {(instructors ?? []).map((ins: any) => (
                <option key={ins.id} value={ins.id}>
                  {ins.full_name}
                </option>
              ))}
            </select>
            <select
              name="subjectId"
              required
              className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            >
              <option value="">اختر المادة...</option>
              {(subjects ?? []).map((sub: any) => (
                <option key={sub.id} value={sub.id}>
                  {sub.name} ({stageMap.get(sub.stage_id) ?? ""})
                </option>
              ))}
            </select>
            <Button type="submit">إسناد المادة للتدريسي</Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
