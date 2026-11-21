"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { logActivity } from "@/lib/activity";
import { getSessionProfile } from "@/lib/auth";
import { notifyStudentsNewLecture } from "@/lib/email/lecture-notifier";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const lectureInputSchema = z.object({
  subjectId: z.string().uuid("يرجى اختيار المادة الدراسية."),
  academicYearId: z.string().uuid("يرجى اختيار السنة الدراسية."),
  lectureNumber: z.number().int().min(1).max(999),
  semester: z.number().int().min(1).max(2).default(1),
  title: z.string().min(2, "يرجى إدخال عنوان المحاضرة.").max(200),
  description: z.string().max(2000).optional(),
  status: z.enum(["draft", "published", "archived"]),
  sendEmailNotification: z.boolean().optional().default(false),
});

const batchImportSchema = z.object({
  subjectId: z.string().uuid("يرجى اختيار المادة الدراسية."),
  academicYearId: z.string().uuid("يرجى اختيار السنة الدراسية."),
  status: z.enum(["draft", "published", "archived"]),
  sendEmailNotification: z.boolean().optional().default(false),
  lectures: z
    .array(
      z.object({
        clientKey: z.string().min(1),
        lectureNumber: z.number().int().min(1).max(999),
        semester: z.number().int().min(1).max(2).default(1),
        category: z.enum(["theory", "practical"]).optional().default("theory"),
        title: z.string().min(2).max(200),
        description: z.string().max(2000).optional(),
      })
    )
    .min(1),
});

export interface CreatedBatchLectureResult {
  clientKey: string;
  lectureId: string;
  category: "theory" | "practical";
}

function revalidateAllLectures() {
  for (const p of [
    "/admin/lectures",
    "/admin/lectures/import",
    "/admin/dashboard",
    "/admin/activity",
    "/instructor/lectures",
    "/instructor/lectures/import",
    "/instructor/dashboard",
    "/student/lectures",
    "/student/dashboard",
    "/student/summary",
  ]) {
    revalidatePath(p);
  }
}

export async function saveLectureAction(
  id: string | null,
  input: z.infer<typeof lectureInputSchema>
): Promise<{ ok: true; id: string; notificationNote?: string } | { ok: false; error: string }> {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
    return { ok: false, error: "غير مصرح لك بهذه العملية." };
  }

  const parsed = lectureInputSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات غير صالحة." };
  }

  const v = parsed.data;
  const supabase = await createClient();

  if (id) {
    const { data, error } = await supabase
      .from("lectures")
      .update({
        subject_id: v.subjectId,
        academic_year_id: v.academicYearId,
        lecture_number: v.lectureNumber,
        semester: v.semester,
        title: v.title.trim(),
        description: v.description?.trim() || null,
        status: v.status,
      })
      .eq("id", id)
      .select("id")
      .maybeSingle();

    if (error) {
      if (error.code === "23505") {
        return { ok: false, error: "يوجد محاضرة أخرى بنفس الرقم لهذه المادة والسنة الدراسية." };
      }
      return { ok: false, error: "تعذّر تحديث المحاضرة. تحقق من صلاحياتك." };
    }
    if (!data) return { ok: false, error: "المحاضرة غير موجودة أو لا تملك صلاحية تعديلها." };

    await logActivity({
      actorId: profile.id,
      action: "lecture.updated",
      entityType: "lecture",
      entityId: data.id,
      metadata: { title: v.title.trim(), lectureNumber: v.lectureNumber, semester: v.semester },
    });

    let notificationNote: string | undefined;
    if (v.sendEmailNotification && v.status === "published") {
      const notifyRes = await notifyStudentsNewLecture({
        lectureId: data.id,
        subjectId: v.subjectId,
        lectureNumber: v.lectureNumber,
        semester: v.semester,
        title: v.title.trim(),
      });
      notificationNote = notifyRes.note;
      await logActivity({
        actorId: profile.id,
        action: "lecture.email_notified",
        entityType: "lecture",
        entityId: data.id,
        metadata: {
          title: v.title.trim(),
          emailedCount: notifyRes.emailedCount,
          notifiedInApp: notifyRes.notifiedInApp,
        },
      });
    } else if (v.sendEmailNotification && v.status !== "published") {
      notificationNote = "لم يُرسل الإشعار لأن حالة المحاضرة ليست (منشورة).";
    }

    revalidateAllLectures();
    return { ok: true, id: data.id, notificationNote };
  }

  const { data: subject } = await supabase
    .from("subjects")
    .select("department_id")
    .eq("id", v.subjectId)
    .maybeSingle();

  if (!subject) return { ok: false, error: "المادة المختارة غير موجودة." };

  const { data, error } = await supabase
    .from("lectures")
    .insert({
      department_id: subject.department_id,
      subject_id: v.subjectId,
      academic_year_id: v.academicYearId,
      uploader_id: profile.id,
      lecture_number: v.lectureNumber,
      semester: v.semester,
      title: v.title.trim(),
      description: v.description?.trim() || null,
      status: v.status,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    if (error.code === "23505") {
      return { ok: false, error: "رقم المحاضرة محجوز مسبقاً في هذه المادة." };
    }
    return { ok: false, error: "تعذّر إنشاء المحاضرة. تأكد أن المادة مسندة لك أو لديك صلاحية إدارية." };
  }
  if (!data) return { ok: false, error: "فشل إنشاء المحاضرة." };

  await logActivity({
    actorId: profile.id,
    action: "lecture.created",
    entityType: "lecture",
    entityId: data.id,
    metadata: { title: v.title.trim(), lectureNumber: v.lectureNumber, semester: v.semester },
  });

  let notificationNote: string | undefined;
  if (v.sendEmailNotification && v.status === "published") {
    const notifyRes = await notifyStudentsNewLecture({
      lectureId: data.id,
      subjectId: v.subjectId,
      lectureNumber: v.lectureNumber,
      semester: v.semester,
      title: v.title.trim(),
    });
    notificationNote = notifyRes.note;
    await logActivity({
      actorId: profile.id,
      action: "lecture.email_notified",
      entityType: "lecture",
      entityId: data.id,
      metadata: {
        title: v.title.trim(),
        emailedCount: notifyRes.emailedCount,
        notifiedInApp: notifyRes.notifiedInApp,
      },
    });
  } else if (v.sendEmailNotification && v.status !== "published") {
    notificationNote = "لم يُرسل الإشعار لأن حالة المحاضرة ليست (منشورة).";
  }

  revalidateAllLectures();
  return { ok: true, id: data.id, notificationNote };
}

export async function importSelectedLecturesAction(
  input: z.infer<typeof batchImportSchema>
): Promise<
  | {
      ok: true;
      inserted: number;
      skipped: number;
      createdLectures: CreatedBatchLectureResult[];
      notificationNote?: string;
    }
  | { ok: false; error: string }
> {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
    return { ok: false, error: "غير مصرح لك باستيراد المحاضرات." };
  }

  const parsed = batchImportSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "بيانات الاستيراد غير صالحة." };
  }

  const { subjectId, academicYearId, status, sendEmailNotification, lectures } = parsed.data;
  const supabase = await createClient();

  const { data: subject } = await supabase
    .from("subjects")
    .select("id, name, department_id")
    .eq("id", subjectId)
    .maybeSingle();

  if (!subject) {
    return { ok: false, error: "المادة المختارة غير موجودة أو لا تملك صلاحية الوصول إليها." };
  }

  let inserted = 0;
  let skipped = 0;
  const createdLectures: CreatedBatchLectureResult[] = [];
  let lastInserted: { id: string; lectureNumber: number; semester: number; title: string } | null = null;

  for (const item of lectures) {
    const { data: insRow, error } = await supabase
      .from("lectures")
      .insert({
        department_id: subject.department_id,
        subject_id: subject.id,
        academic_year_id: academicYearId,
        uploader_id: profile.id,
        lecture_number: item.lectureNumber,
        semester: item.semester,
        title: item.title.trim(),
        description: item.description?.trim() || null,
        status,
      })
      .select("id")
      .maybeSingle();

    if (error || !insRow) {
      skipped++;
    } else {
      inserted++;
      createdLectures.push({
        clientKey: item.clientKey,
        lectureId: insRow.id,
        category: item.category ?? "theory",
      });
      lastInserted = {
        id: insRow.id,
        lectureNumber: item.lectureNumber,
        semester: item.semester,
        title: inserted > 1 ? `${item.title.trim()} (+${inserted - 1} محاضرات أخرى)` : item.title.trim(),
      };
    }
  }

  if (inserted === 0 && skipped > 0) {
    return {
      ok: false,
      error: "لم تتم إضافة أي محاضرة؛ قد تكون أرقام المحاضرات مكررة مسبقاً في هذه المادة أو المادة غير مسندة لك.",
    };
  }

  await logActivity({
    actorId: profile.id,
    action: "lecture.batch_imported",
    entityType: "subject",
    entityId: subject.id,
    metadata: { subjectName: subject.name, inserted, skipped },
  });

  let notificationNote: string | undefined;
  if (sendEmailNotification && status === "published" && lastInserted) {
    const notifyRes = await notifyStudentsNewLecture({
      lectureId: lastInserted.id,
      subjectId: subject.id,
      lectureNumber: lastInserted.lectureNumber,
      semester: lastInserted.semester,
      title: lastInserted.title,
    });
    notificationNote = notifyRes.note;
  }

  revalidateAllLectures();
  return { ok: true, inserted, skipped, createdLectures, notificationNote };
}

export async function deleteLectureAction(lectureId: string) {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
    return;
  }

  const supabase = await createClient();
  const [{ data: lec }, { data: files }] = await Promise.all([
    supabase.from("lectures").select("id, title, lecture_number").eq("id", lectureId).maybeSingle(),
    supabase.from("lecture_files").select("storage_path").eq("lecture_id", lectureId),
  ]);

  const { error } = await supabase.from("lectures").delete().eq("id", lectureId);
  if (!error) {
    if (files && files.length > 0) {
      const admin = createAdminClient();
      await admin.storage
        .from("lectures")
        .remove(files.map((f) => f.storage_path))
        .catch(() => {});
    }
    await logActivity({
      actorId: profile.id,
      action: "lecture.deleted",
      entityType: "lecture",
      entityId: lectureId,
      metadata: { title: lec?.title ?? "", lectureNumber: lec?.lecture_number ?? 0 },
    });
  }
  revalidateAllLectures();
}

export async function updateLectureFileCategoryAction(
  fileId: string,
  category: "theory" | "practical"
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
    return { ok: false, error: "غير مصرح." };
  }

  const supabase = await createClient();
  const { data: file, error } = await supabase
    .from("lecture_files")
    .update({ category })
    .eq("id", fileId)
    .select("id, original_name, lecture_id")
    .maybeSingle();

  if (error || !file) {
    return { ok: false, error: "تعذّر تحديث تصنيف الملف." };
  }

  await logActivity({
    actorId: profile.id,
    action: "lecture.file_category_updated",
    entityType: "lecture",
    entityId: file.lecture_id,
    metadata: { fileName: file.original_name, category },
  });

  revalidateAllLectures();
  return { ok: true };
}

export async function deleteLectureFileAction(
  fileId: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const profile = await getSessionProfile();
  if (!profile || profile.status !== "active" || !["instructor", "admin", "super_admin"].includes(profile.role)) {
    return { ok: false, error: "غير مصرح." };
  }

  const supabase = await createClient();
  const { data: file } = await supabase
    .from("lecture_files")
    .select("id, storage_path, original_name, lecture_id")
    .eq("id", fileId)
    .maybeSingle();

  if (!file) return { ok: false, error: "الملف غير موجود." };

  const { error } = await supabase.from("lecture_files").delete().eq("id", fileId);
  if (error) return { ok: false, error: "لا تملك صلاحية حذف هذا الملف." };

  const admin = createAdminClient();
  await admin.storage.from("lectures").remove([file.storage_path]).catch(() => {});

  await logActivity({
    actorId: profile.id,
    action: "lecture.file_deleted",
    entityType: "lecture",
    entityId: file.lecture_id,
    metadata: { fileName: file.original_name },
  });

  revalidateAllLectures();
  return { ok: true };
}
