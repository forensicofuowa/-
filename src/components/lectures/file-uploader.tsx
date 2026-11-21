"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AlertCircle,
  CheckCircle2,
  Download,
  Eye,
  FileText,
  Loader2,
  Trash2,
  UploadCloud,
} from "lucide-react";
import { deleteLectureFileAction, updateLectureFileCategoryAction } from "@/app/lectures/actions";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { checkFileName, verifySignature } from "@/lib/files/signatures";
import { fileCategoryLabel, formatBytes } from "@/lib/utils";
import type { FileCategory, LectureFile } from "@/types/database";

interface UploadTask {
  id: string;
  name: string;
  category: FileCategory;
  progress: number;
  stage: "checking" | "uploading" | "verifying" | "done" | "error";
  error?: string;
}

export function FileUploader({
  lectureId,
  initialFiles,
}: {
  lectureId: string;
  initialFiles: LectureFile[];
}) {
  const router = useRouter();
  const [files, setFiles] = useState<LectureFile[]>(initialFiles);
  const [uploadCategory, setUploadCategory] = useState<FileCategory>("theory");
  const [tasks, setTasks] = useState<UploadTask[]>([]);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [updatingCatId, setUpdatingCatId] = useState<string | null>(null);

  const updateTask = (id: string, patch: Partial<UploadTask>) => {
    setTasks((prev) => prev.map((t) => (t.id === id ? { ...t, ...patch } : t)));
  };

  async function uploadSingleFile(file: File, category: FileCategory) {
    const taskId = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
    setTasks((prev) => [
      { id: taskId, name: file.name, category, progress: 5, stage: "checking" },
      ...prev,
    ]);

    try {
      const nameCheck = checkFileName(file.name);
      if (!nameCheck.ok) {
        updateTask(taskId, { stage: "error", error: nameCheck.error });
        return;
      }

      const headBuf = new Uint8Array(await file.slice(0, 8192).arrayBuffer());
      const clientSig = verifySignature(nameCheck.ext, headBuf);
      if (!clientSig.ok) {
        updateTask(taskId, { stage: "error", error: clientSig.error });
        return;
      }

      updateTask(taskId, { stage: "uploading", progress: 15 });
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
        updateTask(taskId, { stage: "error", error: ticketData.error || "فشل حجز رابط الرفع." });
        return;
      }

      await new Promise<void>((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        xhr.open("PUT", ticketData.signedUrl, true);
        xhr.setRequestHeader("Content-Type", ticketData.mimeType || "application/octet-stream");
        xhr.upload.onprogress = (evt) => {
          if (evt.lengthComputable) {
            const pct = Math.min(92, Math.round(15 + (evt.loaded / evt.total) * 77));
            updateTask(taskId, { progress: pct });
          }
        };
        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) resolve();
          else reject(new Error(`فشل رفع الملف للتخزين (كود ${xhr.status}).`));
        };
        xhr.onerror = () => reject(new Error("انقطع الاتصال أثناء رفع الملف."));
        xhr.send(file);
      });

      updateTask(taskId, { stage: "verifying", progress: 96 });
      const finRes = await fetch("/api/files/finalize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ fileId: ticketData.fileId }),
      });
      const finData = await finRes.json();
      if (!finRes.ok) {
        updateTask(taskId, { stage: "error", error: finData.error || "فشل فحص الملف على السيرفر." });
        return;
      }

      updateTask(taskId, { stage: "done", progress: 100 });
      setFiles((prev) => [...prev, finData.file]);
      router.refresh();
    } catch (err) {
      updateTask(taskId, {
        stage: "error",
        error: err instanceof Error ? err.message : "حدث خطأ غير متوقع.",
      });
    }
  }

  async function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selected = Array.from(e.target.files ?? []);
    e.target.value = "";
    const chosenCat = uploadCategory;
    for (const file of selected) {
      await uploadSingleFile(file, chosenCat);
    }
  }

  async function handleCategoryChange(fileId: string, nextCat: FileCategory) {
    setUpdatingCatId(fileId);
    const res = await updateLectureFileCategoryAction(fileId, nextCat);
    setUpdatingCatId(null);
    if (res.ok) {
      setFiles((prev) => prev.map((f) => (f.id === fileId ? { ...f, category: nextCat } : f)));
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  async function handleDelete(fileId: string) {
    if (!confirm("هل أنت متأكد من حذف هذا الملف نهائياً؟")) return;
    setDeletingId(fileId);
    const res = await deleteLectureFileAction(fileId);
    setDeletingId(null);
    if (res.ok) {
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      router.refresh();
    } else {
      alert(res.error);
    }
  }

  return (
    <div className="space-y-5">
      {/* Category Selector before uploading */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-3.5">
        <div>
          <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">
            تصنيف الملفات المرفوعة
          </p>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            حدد نوع الملف قبل اختياره ليميّزه الطالب بوضوح (نظري أو عملي)
          </p>
        </div>

        <div className="inline-flex rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900 p-1">
          <button
            type="button"
            onClick={() => setUploadCategory("theory")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              uploadCategory === "theory"
                ? "bg-indigo-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            محاضرة نظرية (نظري)
          </button>
          <button
            type="button"
            onClick={() => setUploadCategory("practical")}
            className={`px-3.5 py-1.5 rounded-md text-xs font-semibold transition-colors ${
              uploadCategory === "practical"
                ? "bg-teal-600 text-white"
                : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800"
            }`}
          >
            مختبر / تطبيق (عملي)
          </button>
        </div>
      </div>

      <label className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-300 dark:border-slate-700 bg-slate-50/70 dark:bg-slate-800/30 p-8 text-center cursor-pointer hover:border-indigo-500 hover:bg-indigo-50/30 dark:hover:bg-indigo-950/20 transition-colors">
        <UploadCloud className="h-10 w-10 text-indigo-500 mb-3" />
        <span className="text-sm font-semibold text-slate-800 dark:text-slate-100">
          اضغط هنا لاختيار ملفات ({fileCategoryLabel(uploadCategory)}) — PDF, DOCX, PPTX, صور, ZIP
        </span>
        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
          يتم فحص بصمة كل ملف تلقائياً وسريعاً قبل اعتماده — الحد الأقصى 50 م.ب
        </span>
        <input
          type="file"
          multiple
          onChange={handleFileSelect}
          className="hidden"
          accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.csv,.jpg,.jpeg,.png,.webp,.txt,.zip"
        />
      </label>

      {tasks.length > 0 && (
        <div className="space-y-2.5">
          {tasks.map((task) => (
            <div
              key={task.id}
              className="rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 p-3.5 text-sm shadow-sm"
            >
              <div className="flex items-center justify-between gap-2 mb-1.5">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="font-medium text-slate-800 dark:text-slate-100 truncate">{task.name}</span>
                  <Badge tone={task.category === "practical" ? "teal" : "indigo"}>
                    {fileCategoryLabel(task.category)}
                  </Badge>
                </div>
                <span className="text-xs shrink-0 flex items-center gap-1.5">
                  {task.stage === "checking" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      <span className="text-slate-600 dark:text-slate-300">فحص مبدئي...</span>
                    </>
                  )}
                  {task.stage === "uploading" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-indigo-600" />
                      <span className="text-indigo-700 dark:text-indigo-300">جارٍ الرفع ({task.progress}%)</span>
                    </>
                  )}
                  {task.stage === "verifying" && (
                    <>
                      <Loader2 className="h-3.5 w-3.5 animate-spin text-amber-600" />
                      <span className="text-amber-700 dark:text-amber-300">جارٍ التحقق السريع...</span>
                    </>
                  )}
                  {task.stage === "done" && (
                    <>
                      <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                      <span className="text-emerald-700 dark:text-emerald-300 font-semibold">تم الرفع والاعتماد</span>
                    </>
                  )}
                  {task.stage === "error" && (
                    <>
                      <AlertCircle className="h-4 w-4 text-red-600" />
                      <span className="text-red-700 dark:text-red-300 font-semibold">فشل الرفع</span>
                    </>
                  )}
                </span>
              </div>

              {task.stage !== "error" ? (
                <div className="h-2 w-full rounded-full bg-slate-100 dark:bg-slate-800 overflow-hidden">
                  <div
                    className={`h-full transition-all duration-300 ${
                      task.stage === "done" ? "bg-emerald-500" : "bg-indigo-600"
                    }`}
                    style={{ width: `${task.progress}%` }}
                  />
                </div>
              ) : (
                <p className="text-xs text-red-600 mt-1">{task.error}</p>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="space-y-2.5">
        <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-200">
          المرفقات المعتمدة ({files.length})
        </h4>
        {files.length === 0 ? (
          <p className="text-sm text-slate-500 dark:text-slate-400 bg-slate-50 dark:bg-slate-800/40 rounded-lg p-4 border border-slate-200 dark:border-slate-800 text-center">
            لا توجد مرفقات لهذه المحاضرة بعد.
          </p>
        ) : (
          <ul className="divide-y divide-slate-200 dark:divide-slate-800 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden">
            {files.map((f) => (
              <li key={f.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-lg shrink-0 ${
                      f.category === "practical"
                        ? "bg-teal-50 dark:bg-teal-950/60 text-teal-600 dark:text-teal-300"
                        : "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-300"
                    }`}
                  >
                    <FileText className="h-5 w-5" />
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-semibold text-slate-800 dark:text-slate-100 truncate">
                        {f.original_name}
                      </p>
                      <Badge tone={f.category === "practical" ? "teal" : "indigo"}>
                        {fileCategoryLabel(f.category)}
                      </Badge>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400">
                      {f.ext.toUpperCase()} • {formatBytes(f.size_bytes)}
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  <select
                    value={f.category ?? "theory"}
                    disabled={updatingCatId === f.id}
                    onChange={(e) => handleCategoryChange(f.id, e.target.value as FileCategory)}
                    className="rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs"
                    title="تغيير تصنيف الملف"
                  >
                    <option value="theory">نظري</option>
                    <option value="practical">عملي</option>
                  </select>

                  <a
                    href={`/api/files/${f.id}/download?mode=preview`}
                    target="_blank"
                    rel="noreferrer"
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-indigo-600"
                    title="معاينة"
                  >
                    <Eye className="h-4 w-4" />
                  </a>
                  <a
                    href={`/api/files/${f.id}/download`}
                    className="p-2 rounded-lg text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-emerald-600"
                    title="تحميل"
                  >
                    <Download className="h-4 w-4" />
                  </a>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    disabled={deletingId === f.id}
                    onClick={() => handleDelete(f.id)}
                    className="text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 hover:text-red-700 px-2"
                    title="حذف"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
