"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { saveLectureAction } from "@/app/lectures/actions";
import { Button } from "@/components/ui/button";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AcademicYear, FileCategory, Lecture, Subject } from "@/types/database";

export function LectureForm({
  lecture,
  redirectPath,
  basePath,
  subjects,
  academicYears,
}: {
  lecture?: Partial<Lecture> & { id?: string };
  redirectPath?: "/admin/lectures" | "/instructor/lectures" | string;
  basePath?: "/admin/lectures" | "/instructor/lectures" | string;
  subjects: Subject[];
  academicYears: AcademicYear[];
}) {
  const router = useRouter();
  const resolvedTargetPath = redirectPath ?? basePath ?? "/admin/lectures";

  const [subjectId, setSubjectId] = useState(lecture?.subject_id ?? subjects[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    lecture?.academic_year_id ??
      academicYears.find((y) => y.is_current)?.id ??
      academicYears[0]?.id ??
      ""
  );
  const [lectureNumber, setLectureNumber] = useState<number>(lecture?.lecture_number ?? 1);
  const [semester, setSemester] = useState<1 | 2>(lecture?.semester === 2 ? 2 : 1);
  const [category, setCategory] = useState<FileCategory>(
    lecture?.category === "practical" ? "practical" : "theory"
  );
  const [title, setTitle] = useState(lecture?.title ?? "");
  const [description, setDescription] = useState(lecture?.description ?? "");
  const [status, setStatus] = useState<"draft" | "published" | "archived">(
    lecture?.status === "draft" || lecture?.status === "archived" ? lecture.status : "published"
  );
  const [sendEmail, setSendEmail] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg(null);

    const fd = new FormData(e.currentTarget);
    const rawCat = String(fd.get("category") ?? category);
    const resolvedCategory: FileCategory = rawCat === "practical" ? "practical" : "theory";

    const res = await saveLectureAction(lecture?.id ?? null, {
      subjectId: String(fd.get("subjectId") ?? subjectId),
      academicYearId: String(fd.get("academicYearId") ?? academicYearId),
      lectureNumber: Math.max(1, Number(fd.get("lectureNumber") ?? lectureNumber) || 1),
      semester: Number(fd.get("semester") ?? semester) === 2 ? 2 : 1,
      category: resolvedCategory,
      title: String(fd.get("title") ?? title),
      description: String(fd.get("description") ?? description),
      status:
        (String(fd.get("status") ?? status) as "draft" | "published" | "archived") || "published",
      sendEmailNotification: sendEmail,
    });

    setSubmitting(false);

    if (!res.ok) {
      setErrorMsg(res.error);
      return;
    }

    router.push(lecture?.id ? resolvedTargetPath : `${resolvedTargetPath}/${res.id}/edit`);
    router.refresh();
  }

  return (
    <Card>
      <CardHeader>
        <h2 className="font-bold text-slate-800 dark:text-slate-100">
          {lecture?.id ? "تعديل بيانات المحاضرة" : "إضافة محاضرة جديدة"}
        </h2>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                المادة الدراسية
              </label>
              <select
                name="subjectId"
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {subjects.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} {s.stages?.name ? `(${s.stages.name})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                السنة الدراسية
              </label>
              <select
                name="academicYearId"
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.is_current ? "(الحالية)" : ""}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                رقم المحاضرة
              </label>
              <input
                type="number"
                name="lectureNumber"
                min={1}
                max={999}
                value={lectureNumber}
                onChange={(e) => setLectureNumber(Math.max(1, Number(e.target.value) || 1))}
                required
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                النوع (نظري / عملي)
              </label>
              <select
                name="category"
                value={category}
                onChange={(e) =>
                  setCategory(e.target.value === "practical" ? "practical" : "theory")
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="theory">نظري</option>
                <option value="practical">عملي</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                الفصل الدراسي
              </label>
              <select
                name="semester"
                value={semester}
                onChange={(e) => setSemester(Number(e.target.value) === 2 ? 2 : 1)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value={1}>الفصل الأول</option>
                <option value={2}>الفصل الثاني</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                حالة النشر
              </label>
              <select
                name="status"
                value={status}
                onChange={(e) =>
                  setStatus(e.target.value as "draft" | "published" | "archived")
                }
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="published">منشورة</option>
                <option value="draft">مسودة</option>
                <option value="archived">مؤرشفة</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              عنوان المحاضرة
            </label>
            <input
              type="text"
              name="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
              الوصف أو ملاحظات إضافية
            </label>
            <textarea
              name="description"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
            />
          </div>

          <div
            onClick={() => setSendEmail(!sendEmail)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3 cursor-pointer select-none"
          >
            <UiverseCheckbox
              checked={sendEmail}
              onChange={setSendEmail}
              size="sm"
              ariaLabel="إرسال إشعار بريدي للطلبة عند النشر"
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              إرسال إشعار عبر البريد الإلكتروني لطلبة المرحلة عند النشر
            </span>
          </div>

          {errorMsg && (
            <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 px-4 py-3 text-sm text-red-700 dark:text-red-300">
              {errorMsg}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => router.push(resolvedTargetPath)}>
              إلغاء
            </Button>
            <Button type="submit" disabled={submitting}>
              {submitting ? "جارٍ الحفظ..." : lecture?.id ? "حفظ التعديلات" : "إنشاء المحاضرة"}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
