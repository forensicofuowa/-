import Link from "next/link";
import { BookOpen, Calendar, FlaskConical, FolderOpen, Layers } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";

export const dynamic = "force-dynamic";

export default async function StudentLecturesPage({
  searchParams,
}: {
  searchParams: Promise<{ subject?: string; mode?: string; sem?: string }>;
}) {
  const profile = await requireRole(["student"]);
  const sp = await searchParams;
  const supabase = await createClient();

  const [{ data: subjects }, { data: lectures }, { data: files }] = await Promise.all([
    supabase
      .from("subjects")
      .select("id, name, code, stage_id, stages(name)")
      .eq("stage_id", profile.stage_id ?? "")
      .order("name", { ascending: true }),
    supabase
      .from("lectures")
      .select("id, subject_id, lecture_number, semester, title, description, status, created_at, academic_years(label)")
      .eq("status", "published")
      .order("lecture_number", { ascending: true })
      .order("created_at", { ascending: false }),
    supabase
      .from("lecture_files")
      .select("id, lecture_id, category"),
  ]);

  const subjectList = subjects ?? [];
  const allLectures = lectures ?? [];
  const allFiles = files ?? [];

  // Map lectureId -> set of categories ("theory" | "practical")
  const lectureCategories = new Map<string, Set<string>>();
  for (const f of allFiles) {
    const set = lectureCategories.get(f.lecture_id) ?? new Set<string>();
    if (f.category === "theory" || f.category === "practical") {
      set.add(f.category);
    }
    lectureCategories.set(f.lecture_id, set);
  }

  // Helper to determine whether a lecture has theory, practical, or both
  const getLecTypes = (lec: any): { hasTheory: boolean; hasPractical: boolean } => {
    const cats = lectureCategories.get(lec.id);
    const hasTheory = Boolean(cats?.has("theory"));
    const hasPractical = Boolean(cats?.has("practical"));
    // If files exist without explicit category yet, treat as theory by default
    if (!hasTheory && !hasPractical) {
      const text = `${lec.title ?? ""} ${lec.description ?? ""}`.toLowerCase();
      if (text.includes("عملي") || text.includes("مختبر") || text.includes("lab") || text.includes("practical")) {
        return { hasTheory: false, hasPractical: true };
      }
      return { hasTheory: true, hasPractical: false };
    }
    return { hasTheory, hasPractical };
  };

  // Compute stats per subject
  const subjectStats = subjectList.map((subj: any) => {
    const subjLectures = allLectures.filter((l: any) => l.subject_id === subj.id);
    let theoryCount = 0;
    let practicalCount = 0;
    for (const l of subjLectures) {
      const t = getLecTypes(l);
      if (t.hasTheory) theoryCount++;
      if (t.hasPractical) practicalCount++;
    }
    const hasBoth = theoryCount > 0 && practicalCount > 0;
    const singleMode: "theory" | "practical" | null = hasBoth
      ? null
      : practicalCount > 0 && theoryCount === 0
      ? "practical"
      : "theory";

    return {
      ...subj,
      totalLectures: subjLectures.length,
      theoryCount,
      practicalCount,
      hasBoth,
      singleMode,
    };
  });

  const selectedSubject = sp.subject
    ? subjectStats.find((s: any) => s.id === sp.subject) ?? null
    : null;

  // Case 1: No subject selected -> Show Subjects Grid
  if (!selectedSubject) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">المواد الدراسية والمحاضرات</h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              اختر المادة الدراسية للدخول إلى محاضراتها مباشرة، أو لاختيار بين النظري والعملي إذا كانت المادة تجمع بينهما.
            </p>
          </div>
          <Link
            href="/student/summary"
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            <Layers className="h-4 w-4 text-indigo-600" />
            <span>ملخص جميع المواد</span>
          </Link>
        </div>

        {subjectStats.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
              لا توجد مواد دراسية مسجّلة لمرحلتك حالياً.
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {subjectStats.map((subj: any) => {
              // If subject has both theory & practical and no mode chosen yet, open /student/lectures?subject=ID
              // Otherwise go straight to the single available mode
              const href = subj.hasBoth
                ? `/student/lectures?subject=${subj.id}`
                : `/student/lectures?subject=${subj.id}&mode=${subj.singleMode ?? "theory"}`;

              return (
                <Link key={subj.id} href={href} className="group block">
                  <Card className="h-full transition-all duration-200 group-hover:-translate-y-0.5 group-hover:border-indigo-400 dark:group-hover:border-indigo-500 group-hover:shadow-md">
                    <CardContent className="p-5 flex flex-col justify-between h-full gap-4">
                      <div>
                        <div className="flex items-start justify-between gap-2">
                          <div className="inline-flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400">
                            <FolderOpen className="h-5 w-5" />
                          </div>
                          {subj.hasBoth ? (
                            <Badge tone="amber">نظري + عملي</Badge>
                          ) : subj.singleMode === "practical" ? (
                            <Badge tone="emerald">عملي فقط</Badge>
                          ) : (
                            <Badge tone="indigo">نظري فقط</Badge>
                          )}
                        </div>
                        <h2 className="mt-3.5 text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                          {subj.name}
                        </h2>
                        {subj.code && (
                          <p className="text-xs text-slate-400 mt-0.5">{subj.code}</p>
                        )}
                      </div>

                      <div className="pt-3 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
                        <span>عدد المحاضرات: <strong>{subj.totalLectures}</strong></span>
                        <span className="font-bold text-indigo-600 dark:text-indigo-400">
                          {subj.hasBoth ? "اختيار نظري / عملي ←" : "دخول للمحاضرات ←"}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              );
            })}
          </div>
        )}
      </div>
    );
  }

  // Case 2: Subject has BOTH theory and practical, and student hasn't picked a mode yet -> Show Dual Window Choice
  if (selectedSubject.hasBoth && sp.mode !== "theory" && sp.mode !== "practical") {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-xs font-semibold text-indigo-600 dark:text-indigo-400">
              {selectedSubject.stages?.name ?? "المادة الدراسية"}
            </p>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white mt-0.5">
              {selectedSubject.name}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
              هذه المادة تحتوي على محاضرات نظرية وعملية معاً — اختر النافذة التي تريد الدخول إليها:
            </p>
          </div>
          <Link
            href="/student/lectures"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ← العودة للمواد
          </Link>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl">
          {/* Theory Window */}
          <Link
            href={`/student/lectures?subject=${selectedSubject.id}&mode=theory`}
            className="group block"
          >
            <Card className="h-full border-2 border-indigo-200 dark:border-indigo-900/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-indigo-500 group-hover:shadow-lg">
              <CardContent className="p-7 flex flex-col justify-between h-full gap-5">
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-100 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400">
                    <BookOpen className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                    محاضرات النظري
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                    الدخول إلى محاضرات وملفات الجانب النظري لمادة {selectedSubject.name}.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Badge tone="indigo">{selectedSubject.theoryCount} محاضرة نظرية</Badge>
                  <span className="text-sm font-bold text-indigo-600 dark:text-indigo-400">
                    دخول للنظري ←
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>

          {/* Practical Window */}
          <Link
            href={`/student/lectures?subject=${selectedSubject.id}&mode=practical`}
            className="group block"
          >
            <Card className="h-full border-2 border-emerald-200 dark:border-emerald-900/70 transition-all duration-200 group-hover:-translate-y-1 group-hover:border-emerald-500 group-hover:shadow-lg">
              <CardContent className="p-7 flex flex-col justify-between h-full gap-5">
                <div>
                  <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-100 dark:bg-emerald-950 text-emerald-600 dark:text-emerald-400">
                    <FlaskConical className="h-6 w-6" />
                  </div>
                  <h2 className="mt-4 text-xl font-bold text-slate-900 dark:text-white group-hover:text-emerald-600 dark:group-hover:text-emerald-400">
                    محاضرات العملي
                  </h2>
                  <p className="text-sm text-slate-500 dark:text-slate-400 mt-1.5">
                    الدخول إلى محاضرات وتطبيقات الجانب العملي لمادة {selectedSubject.name}.
                  </p>
                </div>
                <div className="pt-4 border-t border-slate-100 dark:border-slate-800 flex items-center justify-between">
                  <Badge tone="emerald">{selectedSubject.practicalCount} محاضرة عملية</Badge>
                  <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400">
                    دخول للعملي ←
                  </span>
                </div>
              </CardContent>
            </Card>
          </Link>
        </div>
      </div>
    );
  }

  // Case 3: Display lectures list for the selected subject (and mode if applicable)
  const activeMode: "theory" | "practical" =
    sp.mode === "practical" ? "practical" : sp.mode === "theory" ? "theory" : selectedSubject.singleMode ?? "theory";

  const filteredLectures = allLectures.filter((lec: any) => {
    if (lec.subject_id !== selectedSubject.id) return false;
    if (sp.sem && Number(lec.semester) !== Number(sp.sem)) return false;
    const t = getLecTypes(lec);
    if (activeMode === "practical") return t.hasPractical;
    return t.hasTheory;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedSubject.name}</h1>
            <Badge tone={activeMode === "practical" ? "emerald" : "indigo"}>
              {activeMode === "practical" ? "العملي" : "النظري"}
            </Badge>
          </div>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">
            عرض المحاضرات المتاحة ({filteredLectures.length})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {selectedSubject.hasBoth && (
            <Link
              href={`/student/lectures?subject=${selectedSubject.id}`}
              className="rounded-lg border border-amber-300 dark:border-amber-700 bg-amber-50 dark:bg-amber-950/50 px-3 py-2 text-xs font-bold text-amber-800 dark:text-amber-300 hover:bg-amber-100"
            >
              تبديل (نظري / عملي)
            </Link>
          )}
          <Link
            href="/student/lectures"
            className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 px-3.5 py-2 text-xs font-bold text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-800"
          >
            ← جميع المواد
          </Link>
        </div>
      </div>

      {/* Semester filter pills */}
      <div className="flex items-center gap-2">
        {[
          { val: "", label: "الكل" },
          { val: "1", label: "الفصل الأول" },
          { val: "2", label: "الفصل الثاني" },
        ].map((tab) => {
          const active = (sp.sem ?? "") === tab.val;
          const semHref = tab.val
            ? `/student/lectures?subject=${selectedSubject.id}&mode=${activeMode}&sem=${tab.val}`
            : `/student/lectures?subject=${selectedSubject.id}&mode=${activeMode}`;
          return (
            <Link
              key={tab.label}
              href={semHref}
              className={`rounded-lg px-3.5 py-1.5 text-xs font-bold transition-colors ${
                active
                  ? "bg-indigo-600 text-white"
                  : "bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800"
              }`}
            >
              {tab.label}
            </Link>
          );
        })}
      </div>

      {filteredLectures.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-slate-500 dark:text-slate-400 text-sm">
            لا توجد محاضرات منشورة في هذا القسم حالياً.
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {filteredLectures.map((lec: any) => (
            <Link key={lec.id} href={`/student/lectures/${lec.id}`} className="block group">
              <Card className="transition-all duration-150 group-hover:border-indigo-400 dark:group-hover:border-indigo-500">
                <CardContent className="p-5 flex items-center justify-between gap-4">
                  <div>
                    <div className="flex flex-wrap items-center gap-2">
                      <Badge tone="indigo">محاضرة {lec.lecture_number}</Badge>
                      <Badge tone="slate">{lec.semester === 2 ? "الفصل الثاني" : "الفصل الأول"}</Badge>
                      {lec.academic_years?.label && (
                        <span className="text-xs text-slate-400">{lec.academic_years.label}</span>
                      )}
                    </div>
                    <h2 className="mt-2 text-base font-bold text-slate-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400">
                      {lec.title}
                    </h2>
                    {lec.description && (
                      <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-2">
                        {lec.description}
                      </p>
                    )}
                    <p className="text-[11px] text-slate-400 mt-2 inline-flex items-center gap-1">
                      <Calendar className="h-3 w-3" />
                      <span>{formatDate(lec.created_at)}</span>
                    </p>
                  </div>
                  <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                    فتح المحاضرة ←
                  </span>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
