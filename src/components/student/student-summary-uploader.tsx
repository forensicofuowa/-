"use client";

import React, { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FileUp, Loader2, Trash2 } from "lucide-react";
import {
  deleteStudentSummaryAction,
  uploadStudentSummaryAction,
} from "@/app/student/lectures/summary-upload-action";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";

type SummaryItem = {
  id: string;
  title?: string | null;
  file_name?: string | null;
  uploaded_by?: string | null;
  created_at?: string | null;
};

export function StudentSummaryUploader({
  lectureId,
  canUpload,
  currentUserId,
  existingSummaries = [],
}: {
  lectureId: string;
  canUpload: boolean;
  currentUserId: string;
  existingSummaries?: SummaryItem[];
}) {
  const router = useRouter();
  const formRef = useRef<HTMLFormElement>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [feedback, setFeedback] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  if (!canUpload && existingSummaries.length === 0) {
    return null;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setFeedback(null);
    setIsSubmitting(true);

    const formData = new FormData(e.currentTarget);
    const res = await uploadStudentSummaryAction(lectureId, formData);

    setIsSubmitting(false);
    if (!res.ok) {
      setFeedback({ type: "err", text: res.error ?? "تعذّر رفع الملخص." });
      return;
    }

    formRef.current?.reset();
    setFeedback({ type: "ok", text: "تم رفع الملخص وإضافته إلى المحاضرة بنجاح." });
    router.refresh();
  }

  async function handleDelete(fileId: string) {
    const ok = window.confirm("هل أنت متأكد من حذف هذا الملخص؟");
    if (!ok) return;

    setDeletingId(fileId);
    setFeedback(null);
    const res = await deleteStudentSummaryAction(fileId, lectureId);
    setDeletingId(null);

    if (!res.ok) {
      setFeedback({ type: "err", text: res.error ?? "تعذّر حذف الملخص." });
      return;
    }

    setFeedback({ type: "ok", text: "تم حذف الملخص بنجاح." });
    router.refresh();
  }

  return (
    <Card className="border-indigo-200 dark:border-indigo-900/60">
      <CardHeader className="pb-3">
        <div className="flex items-center gap-2">
          <FileUp className="h-5 w-5 text-indigo-600" />
          <h3 className="font-bold text-base text-slate-900 dark:text-white">
            ملخصات الطلبة المرفوعة
          </h3>
        </div>
        {canUpload && (
          <p className="text-xs text-slate-500 dark:text-slate-400">
            لديك صلاحية رفع ملخصات أو ملفات مساعدة لهذه المحاضرة.
          </p>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        {feedback && (
          <div
            className={`rounded-lg border px-3 py-2 text-xs ${
              feedback.type === "ok"
                ? "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/60 dark:text-emerald-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
            }`}
          >
            {feedback.text}
          </div>
        )}

        {canUpload && (
          <form ref={formRef} onSubmit={handleSubmit} className="space-y-3 rounded-xl bg-slate-50 dark:bg-slate-800/50 p-3.5">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  عنوان الملخص
                </label>
                <input
                  type="text"
                  name="title"
                  required
                  placeholder="مثال: ملخص المحاضرة الثالثة - إعداد الطالب..."
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-1.5 text-xs"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold mb-1 text-slate-700 dark:text-slate-300">
                  اختر الملف (PDF, Word, صور, ZIP)
                </label>
                <input
                  type="file"
                  name="file"
                  required
                  accept=".pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt,.zip,.jpg,.jpeg,.png"
                  className="w-full rounded-lg border border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-800 px-2.5 py-1 text-xs"
                />
              </div>
            </div>

            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>جاري رفع الملخص...</span>
                </>
              ) : (
                <>
                  <FileUp className="h-4 w-4" />
                  <span>رفع الملخص الآن</span>
                </>
              )}
            </Button>
          </form>
        )}

        {existingSummaries.length > 0 && (
          <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl">
            {existingSummaries.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3.5 py-2.5 text-xs"
              >
                <div>
                  <p className="font-semibold text-slate-800 dark:text-slate-100">
                    {item.title || item.file_name || "ملخص مرفوع"}
                  </p>
                  {item.file_name && (
                    <p className="text-[11px] text-slate-400" dir="ltr">
                      {item.file_name}
                    </p>
                  )}
                </div>

                {item.uploaded_by === currentUserId && (
                  <Button
                    type="button"
                    size="sm"
                    variant="danger"
                    disabled={deletingId === item.id}
                    onClick={() => handleDelete(item.id)}
                    title="حذف ملخصي"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    <span>حذف</span>
                  </Button>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
