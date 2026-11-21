"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { Mail } from "lucide-react";
import { saveLectureAction } from "@/app/lectures/actions";
import { Button } from "@/components/ui/button";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import type { AcademicYear, Lecture, Subject } from "@/types/database";

export function LectureForm({
  basePath,
  subjects,
  academicYears,
  lecture,
}: {
  basePath: "/admin/lectures" | "/instructor/lectures";
  subjects: Subject[];
  academicYears: AcademicYear[];
  lecture?: Lecture;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);
  const [sendEmail, setSendEmail] = useState<boolean>(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSavedMsg(null);

    const fd = new FormData(e.currentTarget);
    const res = await saveLectureAction(lecture?.id ?? null, {
      subjectId: String(fd.get("subjectId") ?? ""),
      academicYearId: String(fd.get("academicYearId") ?? ""),
      lectureNumber: Number(fd.get("lectureNumber") ?? 1),
      semester: Number(fd.get("semester") ?? 1),
      title: String(fd.get("title") ?? ""),
      description: String(fd.get("description") ?? ""),
      status: String(fd.get("status") ?? "published") as "draft" | "published" | "archived",
      sendEmailNotification: sendEmail,
    });

    setLoading(false);
    if (!res.ok) {
      setError(res.error);
      return;
    }

    if (!lecture && res.id) {
      if (res.notificationNote) {
        alert(res.notificationNote);
      }
      router.push(`${basePath}/${res.id}/edit`);
    } else {
      setSavedMsg(
        res.notificationNote
          ? `تم حفظ التغييرات بنجاح. ${res.notificationNote}`
          : "تم حفظ التغييرات بنجاح."
      );
      router.refresh();
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      {error && (
        <div className="rounded-lg border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/60 px-4 py-3 text-sm text-red-700 dark:text-red-300">
          {error}
        </div>
      )}
      {savedMsg && (
        <div className="rounded-lg border border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/60 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-300">
          {savedMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المادة الدراسية</label>
          <select
            name="subjectId"
            required
            defaultValue={lecture?.subject_id ?? subjects[0]?.id ?? ""}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {subjects.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} {s.stages?.name ? `(${s.stages.name})` : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السنة الدراسية</label>
          <select
            name="academicYearId"
            required
            defaultValue={
              lecture?.academic_year_id ??
              academicYears.find((y) => y.is_current)?.id ??
              academicYears[0]?.id ??
              ""
            }
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            {academicYears.map((y) => (
              <option key={y.id} value={y.id}>
                {y.label} {y.is_current ? "(الحالية)" : ""}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الفصل الدراسي (الكورس)</label>
          <select
            name="semester"
            defaultValue={lecture?.semester ?? 1}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value={1}>الفصل الأول</option>
            <option value={2}>الفصل الثاني</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">رقم المحاضرة</label>
          <input
            type="number"
            name="lectureNumber"
            min={1}
            max={999}
            required
            defaultValue={lecture?.lecture_number ?? 1}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div className="md:col-span-2">
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">عنوان المحاضرة</label>
          <input
            type="text"
            name="title"
            required
            placeholder="مثال: مفهوم الجرائم وأقسامها"
            defaultValue={lecture?.title ?? ""}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حالة النشر</label>
          <select
            name="status"
            defaultValue={lecture?.status ?? "published"}
            className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
          >
            <option value="published">منشورة (تظهر للطلبة)</option>
            <option value="draft">مسودة (مخفية)</option>
            <option value="archived">مؤرشفة</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">وصف أو ملاحظات (اختياري)</label>
        <textarea
          name="description"
          rows={3}
          defaultValue={lecture?.description ?? ""}
          placeholder="ملخص سريع لمحاور المحاضرة أو تعليمات للطلبة..."
          className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none"
        />
      </div>

      {/* Email Notification Checkbox using the custom Uiverse design */}
      <div className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/50 p-4">
        <div
          onClick={() => setSendEmail(!sendEmail)}
          className="flex items-center gap-3.5 cursor-pointer select-none"
        >
          <UiverseCheckbox
            checked={sendEmail}
            onChange={setSendEmail}
            ariaLabel="إرسال إشعار عبر البريد الإلكتروني للطلبة"
          />
          <div>
            <p className="text-sm font-bold text-slate-900 dark:text-slate-100 flex items-center gap-1.5">
              <Mail className="h-4 w-4 text-orange-600" />
              <span>إرسال إشعار عبر البريد الإلكتروني للطلبة</span>
            </p>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              عند تفعيل هذا الخيار وكانت المحاضرة (منشورة)، سيصل إيميل تلقائي لطلبة المرحلة يبلغهم بوجود محاضرة جديدة ورابطها.
            </p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-3 pt-2">
        <Button type="submit" disabled={loading}>
          {loading ? "جارٍ الحفظ..." : lecture ? "حفظ التغييرات" : "إنشاء المحاضرة والانتقال لرفع الملفات"}
        </Button>
      </div>
    </form>
  );
}
