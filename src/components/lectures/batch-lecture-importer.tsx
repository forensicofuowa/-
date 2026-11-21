"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  CheckCircle2,
  CheckSquare,
  FileSpreadsheet,
  FileText,
  FlaskConical,
  BookOpen,
  Loader2,
  Square,
  Trash2,
  Upload,
  AlertCircle,
} from "lucide-react";
import { importSelectedLecturesAction } from "@/app/lectures/actions";
import { checkFileName, verifySignature } from "@/lib/files/signatures";
import { parseLecturesFromUploadedFiles } from "@/lib/lectures/batch-parser";
import { formatBytes } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { UiverseCheckbox } from "@/components/ui/uiverse-checkbox";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import type { AcademicYear, FileCategory, ParsedBatchLecture, Subject } from "@/types/database";

const ALL_ACCEPT = ".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt,.zip,.json";
const TEXT_EXTS = new Set(["json", "csv", "txt"]);

const SAMPLE_JSON = `[
  { "lectureNumber": 1, "semester": 1, "category": "theory", "title": "مقدمة في الأدلة الجنائية", "description": "تعريف العلم الجنائي ومجالاته" },
  { "lectureNumber": 2, "semester": 1, "category": "theory", "title": "إدارة مسرح الجريمة", "description": "طوق الأمان وحماية الآثار المادية" },
  { "lectureNumber": 3, "semester": 2, "category": "practical", "title": "رفع الآثار البيولوجية عملي", "description": "البقع الدموية والشعر واللعاب" }
]`;

type FileUploadState = "idle" | "uploading" | "done" | "error";

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
  const [defaultCategory, setDefaultCategory] = useState<FileCategory>("theory");
  const [status, setStatus] = useState<"draft" | "published" | "archived">("published");
  const [sendEmail, setSendEmail] = useState<boolean>(false);
  const [items, setItems] = useState<ParsedBatchLecture[]>([]);
  const [uploadStates, setUploadStates] = useState<Record<string, { state: FileUploadState; error?: string }>>({});
  const [submitting, setSubmitting] = useState(false);
  const [resultMsg, setResultMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFiles = Array.from(e.target.files ?? []);
    e.target.value = "";
    setResultMsg(null);
    if (selectedFiles.length === 0) return;

    const validEntries: Array<{ name: string; textContent: string; file?: File }> = [];
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
      validEntries.push({
        name: f.name,
        textContent,
        file: TEXT_EXTS.has(ext) ? undefined : f,
      });
    }

    const parsed = parseLecturesFromUploadedFiles(validEntries, defaultSemester, defaultCategory);
    if (parsed.length === 0) {
      setResultMsg({
        type: "err",
        text: "لم يتم العثور على محاضرات صالحة داخل الملفات المختارة.",
      });
      return;
    }

    setItems((prev) => {
      const startNum = prev.length > 0 ? Math.max(...prev.map((x) => x.lectureNumber)) : 0;
      const renumbered = parsed.map((p, idx) =>
        prev.length > 0 ? { ...p, lectureNumber: startNum + idx + 1 } : p
      );
      return [...prev, ...renumbered];
    });
  }

  function loadSample() {
    setItems(
      parseLecturesFromUploadedFiles(
        [{ name: "sample-lectures.json", textContent: SAMPLE_JSON }],
        defaultSemester,
        defaultCategory
      )
    );
    setUploadStates({});
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

  function removeItem(tempId: string) {
    setItems((prev) => prev.filter((i) => i.tempId !== tempId));
    setUploadStates((prev) => {
      const copy = { ...prev };
      delete copy[tempId];
      return copy;
    });
  }

  function setAllCategory(cat: FileCategory) {
    setDefaultCategory(cat);
    setItems((prev) => prev.map((i) => ({ ...i, category: cat })));
  }

  function updateItemCategory(tempId: string, category: FileCategory) {
    setItems((prev) => prev.map((i) => (i.tempId === tempId ? { ...i, category } : i)));
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

  async function attachFileToLecture(
    lectureId: string,
    file: File,
    category: FileCategory
  ): Promise<{ ok: true } | { ok: false; error: string }> {
    const nameCheck = checkFileName(file.name);
    if (!nameCheck.ok) {
      return { ok: false, error: nameCheck.error };
    }

    const headBuf = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
    const clientSig = verifySignature(nameCheck.ext, headBuf);
    if (!clientSig.ok) {
      return { ok: false, error: clientSig.error };
    }

    const ticketRes = await fetch("/api/files/ticket", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        lectureId,
        fileName: file.name,
        size: file.size,
        category,
      }),
    });
    const ticketData = await ticketRes.json();
    if (!ticketRes.ok) {
      return { ok: false, error: ticketData.error || "فشل حجز رابط رفع الملف." };
    }

    await new Promise<void>((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open("PUT", ticketData.signedUrl, true);
      xhr.setRequestHeader("Content-Type", ticketData.mimeType || "application/octet-stream");
      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) resolve();
        else reject(new Error(`فشل رفع الملف للتخزين (كود ${xhr.status}).`));
      };
      xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء رفع الملف."));
      xhr.send(file);
    });

    const finRes = await fetch("/api/files/finalize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ fileId: ticketData.fileId }),
    });
    const finData = await finRes.json();
    if (!finRes.ok) {
      return { ok: false, error: finData.error || "فشل فحص الملف على السيرفر." };
    }

    return { ok: true };
  }

  async function handleImportSelected() {
    const chosen = items.filter((i) => i.selected && i.title.trim().length >= 2);
    if (!subjectId || !academicYearId) {
      setResultMsg({ type: "err", text: "يرجى اختيار المادة والسنة الدراسية أولاً." });
      return;
    }
    if (chosen.length === 0) {
      setResultMsg({ type: "err", text: "اختر محاضرة واحدة على الأقل لإضافتها." });
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
        clientKey: c.tempId,
        lectureNumber: c.lectureNumber,
        semester: c.semester,
        category: c.category,
        title: c.title.trim(),
        description: c.description.trim() || undefined,
      })),
    });

    if (!res.ok) {
      setSubmitting(false);
      setResultMsg({ type: "err", text: res.error });
      return;
    }

    const lectureMap = new Map(res.createdLectures.map((c) => [c.clientKey, c]));
    let uploadedFilesCount = 0;
    let failedFilesCount = 0;

    for (const item of chosen) {
      const created = lectureMap.get(item.tempId);
      if (!created) continue;

      if (!item.sourceFile) {
        setUploadStates((prev) => ({ ...prev, [item.tempId]: { state: "done" } }));
        continue;
      }

      setUploadStates((prev) => ({ ...prev, [item.tempId]: { state: "uploading" } }));
      try {
        const upRes = await attachFileToLecture(created.lectureId, item.sourceFile, item.category);
        if (upRes.ok) {
          uploadedFilesCount++;
          setUploadStates((prev) => ({ ...prev, [item.tempId]: { state: "done" } }));
        } else {
          failedFilesCount++;
          setUploadStates((prev) => ({
            ...prev,
            [item.tempId]: { state: "error", error: upRes.error },
          }));
        }
      } catch (err) {
        failedFilesCount++;
        setUploadStates((prev) => ({
          ...prev,
          [item.tempId]: {
            state: "error",
            error: err instanceof Error ? err.message : "خطأ أثناء رفع الملف.",
          },
        }));
      }
    }

    setSubmitting(false);

    const filesNote =
      uploadedFilesCount > 0 ? ` وتم رفع واعتماد ${uploadedFilesCount} ملف بنجاح` : "";
    const failedNote =
      failedFilesCount > 0 ? ` (تعذّر رفع ${failedFilesCount} ملف — راجع الحالة بالجدول)` : "";
    const skippedText =
      res.skipped > 0
        ? ` (تم تخطي ${res.skipped} محاضرة بسبب تكرار رقم المحاضرة)`
        : "";

    setResultMsg({
      type: failedFilesCount > 0 ? "err" : "ok",
      text: `تمت إضافة ${res.inserted} محاضرة${filesNote}${failedNote}${skippedText}.${
        res.notificationNote ? " " + res.notificationNote : ""
      }`,
    });
    router.refresh();
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <h2 className="font-bold text-slate-800 dark:text-slate-100">
            1. تحديد المادة واختيار مجموعة ملفات المحاضرات
          </h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            اختر عدة ملفات دفعة واحدة (PDF, DOCX, PPTX, صور, ZIP...) وستظهر جميعها في القائمة أدناه مع زر تحديد (نظري / عملي) مستقل لكل محاضرة.
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                المادة الدراسية
              </label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                السنة الدراسية
              </label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                الفصل الافتراضي
              </label>
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
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                التصنيف الافتراضي
              </label>
              <select
                value={defaultCategory}
                onChange={(e) => setDefaultCategory(e.target.value as FileCategory)}
                className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm"
              >
                <option value="theory">محاضرة نظرية (نظري)</option>
                <option value="practical">مختبر / تطبيق (عملي)</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">
                حالة المحاضرات
              </label>
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

            {items.length > 0 && (
              <span className="text-xs text-slate-600 dark:text-slate-300 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full">
                تم تحميل: <strong>{items.length} محاضرة</strong> في القائمة
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
                2. تحديد نوع كل محاضرة (نظري / عملي) والمحاضرات المراد رفعها ({selectedCount} من {items.length})
              </h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                اختر مقابل كل محاضرة زر <strong>نظري</strong> أو <strong>عملي</strong>، وعدّل الرقم أو العنوان إذا لزم الأمر قبل الرفع.
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllCategory("theory")}
                className="text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800"
              >
                <BookOpen className="h-3.5 w-3.5" />
                <span>تعيين الكل نظري</span>
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setAllCategory("practical")}
                className="text-teal-700 dark:text-teal-300 border-teal-200 dark:border-teal-800"
              >
                <FlaskConical className="h-3.5 w-3.5" />
                <span>تعيين الكل عملي</span>
              </Button>
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
                {submitting ? "جارٍ الإضافة والرفع..." : `رفع وإضافة المحدد (${selectedCount})`}
              </Button>
            </div>
          </CardHeader>

          <CardContent className="p-0 overflow-x-auto">
            <table className="w-full text-sm text-right">
              <thead className="bg-slate-50 dark:bg-slate-800/70 text-xs text-slate-600 dark:text-slate-300 border-b border-slate-200 dark:border-slate-800">
                <tr>
                  <th className="px-3 py-3 w-12">تحديد</th>
                  <th className="px-3 py-3 w-20">الرقم</th>
                  <th className="px-3 py-3 w-44">النوع (نظري / عملي)</th>
                  <th className="px-3 py-3 w-32">الفصل</th>
                  <th className="px-3 py-3">عنوان المحاضرة والملف المرفق</th>
                  <th className="px-3 py-3">الوصف / ملاحظات</th>
                  <th className="px-3 py-3 w-24 text-center">الحالة / حذف</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                {items.map((item) => {
                  const upState = uploadStates[item.tempId];
                  return (
                    <tr
                      key={item.tempId}
                      className={item.selected ? "bg-indigo-50/20 dark:bg-indigo-950/15" : "opacity-60 hover:opacity-90"}
                    >
                      <td className="px-3 py-3">
                        <UiverseCheckbox
                          checked={item.selected}
                          onChange={() => toggleOne(item.tempId)}
                          ariaLabel={`تحديد محاضرة ${item.title}`}
                        />
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="number"
                          min={1}
                          max={999}
                          value={item.lectureNumber}
                          onChange={(e) => updateItemField(item.tempId, "lectureNumber", e.target.value)}
                          className="w-16 rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-sm"
                        />
                      </td>

                      <td className="px-3 py-3">
                        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-slate-100 dark:bg-slate-900 p-0.5">
                          <button
                            type="button"
                            onClick={() => updateItemCategory(item.tempId, "theory")}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                              item.category === "theory"
                                ? "bg-indigo-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800"
                            }`}
                          >
                            نظري
                          </button>
                          <button
                            type="button"
                            onClick={() => updateItemCategory(item.tempId, "practical")}
                            className={`px-2.5 py-1 rounded-md text-xs font-bold transition-colors ${
                              item.category === "practical"
                                ? "bg-teal-600 text-white shadow-xs"
                                : "text-slate-600 dark:text-slate-300 hover:bg-white/70 dark:hover:bg-slate-800"
                            }`}
                          >
                            عملي
                          </button>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <select
                          value={item.semester}
                          onChange={(e) => updateItemField(item.tempId, "semester", e.target.value)}
                          className="rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                        >
                          <option value={1}>الفصل الأول</option>
                          <option value={2}>الفصل الثاني</option>
                        </select>
                      </td>

                      <td className="px-3 py-3 space-y-1">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateItemField(item.tempId, "title", e.target.value)}
                          className="w-full min-w-[200px] rounded border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-sm font-medium text-slate-900 dark:text-slate-100"
                        />
                        {item.sourceFile && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                            <FileText className="h-3.5 w-3.5 text-indigo-500 shrink-0" />
                            <span className="truncate max-w-[240px]" title={item.sourceFile.name}>
                              {item.sourceFile.name}
                            </span>
                            <span>({formatBytes(item.sourceFile.size)})</span>
                          </div>
                        )}
                      </td>

                      <td className="px-3 py-3">
                        <input
                          type="text"
                          value={item.description}
                          placeholder="اختياري..."
                          onChange={(e) => updateItemField(item.tempId, "description", e.target.value)}
                          className="w-full min-w-[140px] rounded border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs text-slate-700 dark:text-slate-300"
                        />
                      </td>

                      <td className="px-3 py-3 text-center">
                        <div className="flex items-center justify-center gap-1.5">
                          {upState?.state === "uploading" && (
                            <span title="جارٍ رفع الملف...">
                              <Loader2 className="h-4 w-4 animate-spin text-indigo-600" />
                            </span>
                          )}
                          {upState?.state === "done" && (
                            <span title="تمت الإضافة والرفع بنجاح">
                              <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                            </span>
                          )}
                          {upState?.state === "error" && (
                            <span title={upState.error ?? "فشل رفع الملف"}>
                              <AlertCircle className="h-4 w-4 text-red-600" />
                            </span>
                          )}
                          <button
                            type="button"
                            disabled={submitting}
                            onClick={() => removeItem(item.tempId)}
                            className="p-1.5 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 transition-colors"
                            title="إزالة من القائمة"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
