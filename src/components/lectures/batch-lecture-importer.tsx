"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckSquare, FileSpreadsheet, Square, Upload } from "lucide-react";
import { importSelectedLecturesAction } from "@/app/lectures/actions";
import { checkFileName } from "@/lib/files/signatures";
import { parseLecturesFromUploadedFiles } from "@/lib/lectures/batch-parser";
import { Button } from "@/components/ui/button";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AcademicYear, ParsedBatchLecture, Subject } from "@/types/database";

const ALL_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt,.zip,.json";
const TEXT_EXTS = new Set(["json", "csv", "txt"]);

const SAMPLE_JSON = `[
  { "lectureNumber": 1, "semester": 1, "title": "مقدمة في الأدلة الجنائية", "description": "تعريف العلم الجنائي ومجالاته" },
  { "lectureNumber": 2, "semester": 1, "title": "إدارة مسرح الجريمة", "description": "طوق الأمان وحماية الآثار المادية" },
  { "lectureNumber": 3, "semester": 2, "title": "رفع الآثار البيولوجية", "description": "البقع الدموية والشعر واللعاب" }
]`;

export function BatchLectureImporter({
  subjects,
  academicYears,
}: {
  redirectPath: "/admin/lectures" | "/instructor/lectures";
  subjects: Subject[];
  academicYears: AcademicYear[];
}) {
  const router = useRouter();
  const [subjectId, setSubjectId] = useState(subjects[0]?.id ?? "");
  const [academicYearId, setAcademicYearId] = useState(
    academicYears.find((y) => y.is_current)?.id ?? academicYears[0]?.id ?? ""
  );
  const [defaultSemester, setDefaultSemester] = useState<1 | 2>(1);
  const [status, setStatus] = useState<"draft" | "published" | "archived">("published");
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [items, setItems] = useState<ParsedBatchLecture[]>([]);
  const [fileLabel, setFileLabel] = useState<string>("");
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    setResultMsg(null);
    if (selectedFiles.length === 0) return;

    const validEntries: Array<{ name: string; textContent: string }> = [];
    for (const f of selectedFiles) {
      const lower = f.name.toLowerCase();
      if (!lower.endsWith(".json")) {
        const chk = checkFileName(f.name);
        if (!chk.ok) {
          setResultMsg({ type: "err", text: chk.error });
          return;
        }
      }
      const ext = lower.split(".").pop() ?? "";
      const textContent = TEXT_EXTS.has(ext) ? await f.text() : "";
      validEntries.push({ name: f.name, textContent });
    }

    const parsed = parseLecturesFromUploadedFiles(validEntries, defaultSemester);
    setFileLabel(
      selectedFiles.length === 1 ? selectedFiles[0].name : `${selectedFiles.length} ملفات`
    );
    setItems(parsed);
    if (parsed.length === 0) {
      setResultMsg({
        type: "err",
        text: "لم يتم العثور على محاضرات صالحة داخل الملف المختار.",
      });
    }
  }

  function loadSample() {
    setFileLabel("sample-lectures.json");
    setItems(
      parseLecturesFromUploadedFiles([{ name: "sample-lectures.json", textContent: SAMPLE_JSON }], defaultSemester)
    );
    setResultMsg(null);
  }

  const selectedCount = items.filter((i) => i.selected).length;
  const allSelected = items.length > 0 && selectedCount === items.length;

  function toggleAll() {
    const next = !allSelected;
    setItems((prev) => prev.map((i) => ({ ...i, selected: next })));
  }

  function toggleOne(tempId: string) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, selected: !i.selected } : i)));
  }

  function updateItemField(
    tempId: string,
    field: "lectureNumber" | "semester" | "title" | "description",
    value: string
  ) {
    setItems((prev) =>
      prev.map((i) => {
        if (i.tempId !== tempId) return i;
        if (field === "lectureNumber") {
          const n = Math.max(1, Number(value) || 1);
          return { ...i, lectureNumber: n };
        }
        if (field === "semester") {
          return { ...i, semester: Number(value) === 2 ? 2 : 1 };
        }
        return { ...i, [field]: value };
      })
    );
  }

  async function handleImportSelected() {
    const chosen = items.filter((i) => i.selected && i.title.trim().length >= 2);
    if (!subjectId || !academicYearId) {
      setResultMsg({ type: "err", text: "يرجى اختيار المادة والسنة الدراسية أولاً." });
      return;
    }
    if (chosen.length === 0) {
      setResultMsg({ type: "err", text: "اختر محاضرة واحدة على الأقل من الملف لإضافتها." });
      return;
    }

    setSubmitting(true);
    setResultMsg(null);
    const res = await importSelectedLecturesAction({
      subjectId,
      academicYearId,
      status,
      sendEmailNotification: sendEmail,
      lectures: chosen.map((c) => ({
        lectureNumber: c.lectureNumber,
        semester: c.semester,
        title: c.title.trim(),
        description: c.description.trim() || undefined,
      })),
    });
    setSubmitting(false);

    if (!res.ok) {
      setResultMsg({ type: "err", text: res.error });
      return;
    }

    const skippedText =
      res.skipped > 0
        ? ` (تم تخطي ${res.skipped} محاضرة بسبب تكرار رقم المحاضرة أو خطأ بالبيانات)`
        : "";
    setResultMsg({
      type: "ok",
      text: `تمت إضافة ${res.inserted} محاضرة بنجاح${skippedText}.${res.notificationNote ? " " + res.notificationNote : ""}`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">1. تحديد المادة والملفات المحتوية على المحاضرات</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            يدعم كل الملفات المسموحة مثل رفع المحاضرة (PDF, DOC, DOCX, PPT, PPTX, XLS, XLSX, CSV, صور, TXT, ZIP, JSON) — وبعد اختيارها يمكنك تحديد المحاضرات المطلوبة وتعيين الفصل الدراسي.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">المادة الدراسية</label>
              <select
                value={subjectId}
                onChange={(e) => setSubjectId(e.target.value)}
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">السنة الدراسية</label>
              <select
                value={academicYearId}
                onChange={(e) => setAcademicYearId(e.target.value)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                {academicYears.map((y) => (
                  <option key={y.id} value={y.id}>
                    {y.label} {y.is_current ? "(الحالية)" : ""}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">الفصل الافتراضي</label>
              <select
                value={defaultSemester}
                onChange={(e) => setDefaultSemester(Number(e.target.value) === 2 ? 2 : 1)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value={1}>الفصل الأول</option>
                <option value={2}>الفصل الثاني</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">حالة المحاضرات</label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value as "draft" | "published" | "archived")}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="published">منشورة (تظهر للطلبة)</option>
                <option value="draft">مسودة (مخفية)</option>
                <option value="archived">مؤرشفة</option>
              </select>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <label className="inline-flex items-center gap-2 rounded-lg border border-indigo-200 dark:border-indigo-800 bg-indigo-50/70 dark:bg-indigo-950/50 px-4 py-2.5 text-sm font-semibold text-indigo-700 dark:text-indigo-300 cursor-pointer hover:bg-indigo-100/70 transition-colors">
              <Upload className="h-4 w-4" />
              <span>اختيار ملفات المحاضرات (PDF, DOCX, PPTX, صور, ZIP...)</span>
              <input
                type="file"
                multiple
                accept={ALL_ACCEPT}
                onChange={handleFileChange}
                className="hidden"
              />
            </label>

            <Button type="button" variant="outline" size="sm" onClick={loadSample}>
              <FileSpreadsheet className="h-4 w-4" />
              <span>تجربة نموذج جاهز</span>
            </Button>

            {fileLabel && (
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                الملف: <strong>{fileLabel}</strong> ({items.length} محاضرة)
              </span>
            )}
          </div>

          <div
            onClick={() => setSendEmail(!sendEmail)}
            className="flex items-center gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-800/40 p-3.5 cursor-pointer select-none"
          >
            <UiverseCheckbox
              checked={sendEmail}
              onChange={setSendEmail}
              size="sm"
              ariaLabel="إرسال إشعار بريدي للطلبة عند النشر"
            />
            <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
              إرسال إشعار عبر البريد الإلكتروني لطلبة المرحلة بعد إضافة المحاضرات المنشورة
            </span>
          </div>

          {resultMsg && (
            <div
              className={`rounded-lg border px-4 py-3 text-sm ${
                resultMsg.type === "ok"
                  ? "border-emerald-200 dark:border-emerald-900 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-300"
                  : "border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300"
              }`}
            >
              {resultMsg.text}
            </div>
          )}
        </CardContent>
      </Card>

      {items.length > 0 && (
        <Card>
          <CardHeader className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="font-bold text-slate-800 dark:text-slate-100">
                2. تحديد المحاضرات المراد إضافتها ({selectedCount} من {items.length} محددة)
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                أشّر على المحاضرات التي تريدها فقط (ويمكنك تعديل رقم أو فصل أو عنوان المحاضرة قبل الإضافة).
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" size="sm" onClick={toggleAll}>
                {allSelected ? (
                  <>
                    <Square className="h-4 w-4" />
                    <span>إلغاء تحديد الكل</span>
                  </>
                ) : (
                  <>
                    <CheckSquare className="h-4 w-4" />
                    <span>تحديد الكل</span>
                  </>
                )}
              </Button>
              <Button type="button" disabled={submitting || selectedCount === 0} onClick={handleImportSelected}>
                {submitting ? "جارٍ الإضافة..." : `إضافة المحدد (${selectedCount})`}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-4 py-3 w-12">تحديد</th>
                  <th className="px-4 py-3 w-24">الرقم</th>
                  <th className="px-4 py-3 w-36">الفصل</th>
                  <th className="px-4 py-3">عنوان المحاضرة</th>
                  <th className="px-4 py-3">الوصف / ملاحظات</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => (
                  <tr
                    key={item.tempId}
                    className={item.selected ? "bg-indigo-50/30 dark:bg-indigo-950/20" : "opacity-60 hover:opacity-90"}
                  >
                    <td className="px-4 py-3">
                      <UiverseCheckbox
                        checked={item.selected}
                        onChange={() => toggleOne(item.tempId)}
                        ariaLabel={`تحديد محاضرة ${item.title}`}
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="number"
                        min={1}
                        max={999}
                        value={item.lectureNumber}
                        onChange={(e) => updateItemField(item.tempId, "lectureNumber", e.target.value)}
                        className="w-20 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={item.semester}
                        onChange={(e) => updateItemField(item.tempId, "semester", e.target.value)}
                        className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                      >
                        <option value={1}>الفصل الأول</option>
                        <option value={2}>الفصل الثاني</option>
                      </select>
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.title}
                        onChange={(e) => updateItemField(item.tempId, "title", e.target.value)}
                        className="w-full rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-sm font-medium text-slate-900 dark:text-slate-100"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={item.description}
                        placeholder="اختياري..."
                        onChange={(e) => updateItemField(item.tempId, "description", e.target.value)}
                        className="w-full rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
